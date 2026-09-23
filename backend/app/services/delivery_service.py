"""
Delivery Service
================
Business logic for Deliveries (the logistics half of an order).

Route handlers stay thin — all status-transition validation, timestamp
updates, listing, and lookup logic live here.

DELIVERY vs ORDER STATUS
------------------------
- Order status is the kitchen lifecycle (pending → confirmed → ... → completed)
- Delivery status is the logistics lifecycle, kept COMPLETELY separate:
      pending → assigned → accepted → picked_up → on_the_way → delivered / failed

Each legitimate delivery-status change updates the matching logistics
timestamp on the delivery row (used for SLA/analytics later).

Rider assignment is intentionally NOT implemented here — it belongs to the
later dispatch/rider phase.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.delivery import Delivery
from app.models.enums import DeliveryStatus, NotificationRecipientType, NotificationType
from app.models.order import Order
from app.schemas.delivery import DeliveryStatusUpdate

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Delivery status transition graph + timestamp mapping
# ---------------------------------------------------------------------------
DELIVERY_TRANSITIONS: dict[DeliveryStatus, set[DeliveryStatus]] = {
    DeliveryStatus.PENDING: {DeliveryStatus.ASSIGNED, DeliveryStatus.FAILED},
    DeliveryStatus.ASSIGNED: {DeliveryStatus.ACCEPTED, DeliveryStatus.FAILED},
    DeliveryStatus.ACCEPTED: {DeliveryStatus.PICKED_UP, DeliveryStatus.FAILED},
    DeliveryStatus.PICKED_UP: {DeliveryStatus.ON_THE_WAY, DeliveryStatus.FAILED},
    DeliveryStatus.ON_THE_WAY: {DeliveryStatus.DELIVERED, DeliveryStatus.FAILED},
    DeliveryStatus.DELIVERED: set(),
    DeliveryStatus.FAILED: set(),
}

# Which timestamp field to stamp for each logistics event.
DELIVERY_TIMESTAMPS: dict[DeliveryStatus, str] = {
    DeliveryStatus.ASSIGNED: "assigned_at",
    DeliveryStatus.ACCEPTED: "accepted_at",
    DeliveryStatus.PICKED_UP: "picked_up_at",
    DeliveryStatus.ON_THE_WAY: "picked_up_at",
    DeliveryStatus.DELIVERED: "delivered_at",
    DeliveryStatus.FAILED: "failed_at",
}


# ---------------------------------------------------------------------------
# Repos / queries
# ---------------------------------------------------------------------------
def _order_load_options():
    """Eager-load a delivery's order (and its nested items/timeline)."""
    return (
        selectinload(Delivery.order).selectinload(Order.items),
        selectinload(Delivery.order).selectinload(Order.timeline),
    )


async def get_delivery_or_404(db: AsyncSession, delivery_id: uuid.UUID) -> Delivery:
    """Fetch a delivery (with its nested order) or raise HTTP 404."""
    result = await db.execute(
        select(Delivery)
        .options(*_order_load_options())
        .where(Delivery.id == delivery_id)
    )
    delivery = result.scalar_one_or_none()
    if delivery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found.",
        )
    return delivery


async def get_delivery_by_order(db: AsyncSession, order_id: uuid.UUID) -> Delivery:
    """Fetch the delivery (with its nested order) for an order, or raise 404."""
    result = await db.execute(
        select(Delivery)
        .options(*_order_load_options())
        .where(Delivery.order_id == order_id)
    )
    delivery = result.scalar_one_or_none()
    if delivery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No delivery found for this order.",
        )
    return delivery


async def list_deliveries(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status_filter: DeliveryStatus | None = None,
) -> tuple[list[Delivery], int]:
    """
    List deliveries with optional status filter and pagination.

    Returns (deliveries_for_page, total_count) ordered newest first.
    """
    base = select(Delivery)
    count_stmt = select(func.count()).select_from(Delivery)

    if status_filter is not None:
        base = base.where(Delivery.status == status_filter)
        count_stmt = count_stmt.where(Delivery.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()

    base = (
        base.options(*_order_load_options())
        .order_by(Delivery.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    deliveries = (await db.execute(base)).scalars().all()
    return list(deliveries), total


# ---------------------------------------------------------------------------
# Realtime invalidation helpers
# ---------------------------------------------------------------------------
async def _publish_delivery_updated(delivery: Delivery) -> None:
    from app.realtime import publish
    from app.realtime.events import DELIVERY_UPDATED

    await publish(
        DELIVERY_UPDATED,
        entity_id=delivery.id,
        order_id=str(delivery.order_id),
        rider_id=str(delivery.rider_id) if delivery.rider_id else None,
    )


async def _notify_delivery_status_change(
    db: AsyncSession, delivery: Delivery, new_status: DeliveryStatus
) -> None:
    """
    Send the deterministic customer notification for logistics milestones.

    One notification per successful transition; retries cannot duplicate it
    because the transition itself is guarded and only succeeds once.
    """
    from app.services import notification_service

    # "On the way" → notification to the customer (order shipped milestone).
    if new_status == DeliveryStatus.ON_THE_WAY:
        order_number = delivery.order.order_number if delivery.order else str(delivery.order_id)
        await notification_service.notify(
            db,
            recipient_type=NotificationRecipientType.CUSTOMER,
            recipient_id=delivery.order.customer_id,
            type=NotificationType.ORDER,
            title="Order On The Way",
            message=f"Your order {order_number} is on the way.",
        )

    # "Delivered" → milestone notification to the customer.
    if new_status == DeliveryStatus.DELIVERED:
        order_number = delivery.order.order_number if delivery.order else str(delivery.order_id)
        await notification_service.notify(
            db,
            recipient_type=NotificationRecipientType.CUSTOMER,
            recipient_id=delivery.order.customer_id,
            type=NotificationType.ORDER,
            title="Order Delivered",
            message=f"Your order {order_number} has been delivered.",
        )


# ---------------------------------------------------------------------------
# Delivery status transitions
# ---------------------------------------------------------------------------
async def update_delivery_status(
    db: AsyncSession, delivery: Delivery, payload: DeliveryStatusUpdate
) -> Delivery:
    """
    Advance a delivery's logistics status.

    - Rejects invalid transitions.
    - Rejects an attempted 'failed' without a failure_reason.
    - Stamps the matching logistics timestamp for legitimate changes.
    """
    new_status = payload.status
    allowed = DELIVERY_TRANSITIONS.get(delivery.status, set())

    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid delivery status transition from "
                f"'{delivery.status}' to '{new_status.value}'."
            ),
        )

    if new_status == DeliveryStatus.FAILED and not (payload.failure_reason or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="failure_reason is required when status is 'failed'.",
        )

    delivery.status = new_status

    # Stamp the relevant logistics timestamp.
    ts_field = DELIVERY_TIMESTAMPS.get(new_status)
    if ts_field is not None:
        setattr(delivery, ts_field, datetime.now(timezone.utc).replace(tzinfo=None))

    if new_status == DeliveryStatus.FAILED:
        delivery.failure_reason = payload.failure_reason

    await db.commit()
    # Re-fetch with the nested order eagerly loaded (commit expires instances,
    # and lazy access would otherwise fail during response serialization).
    delivery = await get_delivery_or_404(db, delivery.id)

    # ------------------------------------------------------------------
    # Realtime invalidation + automated customer notification (AFTER the
    # successful commit; both are best-effort).
    # ------------------------------------------------------------------
    await _publish_delivery_updated(delivery)
    try:
        await _notify_delivery_status_change(db, delivery, new_status)
    except Exception:
        logger.exception("Failed to create delivery-status notification")

    return delivery
