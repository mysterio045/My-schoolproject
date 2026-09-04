"""
Dispatch Service
================
The Smart Rider Dispatch Engine: assign the nearest eligible, available rider
to an order that is ready for delivery.

Architecture
------------
    API Route
        ↓
    Dispatch Service  (this module)
        ↓
    Database

All dispatch business logic lives here; route handlers stay thin.

DISPATCH WORKFLOW
-----------------
1. Validate the order exists, is in the 'ready' state, and has a delivery record.
2. Reject if the delivery already has a rider assigned.
3. Identify eligible riders: `status = available` AND `lat`/`lng` are NOT NULL.
   (busy / offline riders and riders missing coordinates are ignored.)
4. Compute each eligible rider's straight-line distance from the restaurant
   using the Haversine formula (dynamic from rider.lat/lng + RESTAURANT_LAT/LNG).
   The cached `riders.distance_from_restaurant` field is NEVER used for selection.
5. Rank candidates ascending by distance; ties broken deterministically by rider id.
6. Atomically assign the selected rider, mark the rider busy, and record the event.

CONCURRENCY / TRANSACTION SAFETY
--------------------------------
Selection + assignment happen in ONE transaction. Eligible rider rows are locked
with PostgreSQL `SELECT ... FOR UPDATE` before selection. Under READ COMMITTED,
a concurrent dispatch request that reaches the same statement will block on the
locked rows; when the first transaction commits, the waiting transaction
re-evaluates the predicate against the newly committed data (the selected rider
is now 'busy'), so it excludes that rider and picks a different one — or returns
a "no available riders" error. This prevents two dispatch requests from ever
assigning the same rider.
"""

import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.delivery import Delivery
from app.models.enums import DeliveryStatus, OrderStatus, RiderStatus
from app.models.order import Order, OrderTimeline
from app.models.rider import Rider

# Mean Earth radius in kilometres (used by the Haversine formula).
EARTH_RADIUS_KM = 6371.0


# ---------------------------------------------------------------------------
# Distance calculation
# ---------------------------------------------------------------------------
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Return the great-circle distance between two points in kilometres.

    Uses the Haversine formula, which gives the shortest distance along the
    surface of a sphere (a good approximation of the Earth's surface for
    local delivery distances).

        a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
        c = 2 · asin(√a)
        d = R · c            (R = mean Earth radius ≈ 6371 km)

    Args:
        lat1, lng1: restaurant coordinates (decimal degrees).
        lat2, lng2: rider coordinates (decimal degrees).

    Returns:
        Distance in kilometres (float).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.asin(math.sqrt(min(1.0, a)))
    return EARTH_RADIUS_KM * c


def _rider_distance_km(rider: Rider) -> float:
    """Compute a rider's distance from the configured restaurant location."""
    return haversine_km(
        settings.RESTAURANT_LAT,
        settings.RESTAURANT_LNG,
        float(rider.lat),
        float(rider.lng),
    )


# ---------------------------------------------------------------------------
# Repos / helpers
# ---------------------------------------------------------------------------
def _delivery_load_options():
    """Eager-load a delivery's nested order (and items/timeline)."""
    return (
        selectinload(Delivery.order).selectinload(Order.items),
        selectinload(Delivery.order).selectinload(Order.timeline),
    )


async def _get_delivery(db: AsyncSession, order_id: uuid.UUID) -> Delivery:
    """Fetch the delivery (with nested order) for an order, or raise 404."""
    result = await db.execute(
        select(Delivery)
        .options(*_delivery_load_options())
        .where(Delivery.order_id == order_id)
    )
    return result.scalar_one_or_none()


def _order_load_options():
    """Eager-load an order's delivery, items, and timeline."""
    return (
        selectinload(Order.delivery),
        selectinload(Order.items),
        selectinload(Order.timeline),
    )


async def _get_order(db: AsyncSession, order_id: uuid.UUID) -> Order:
    """Fetch an order with items/timeline/delivery, or raise 404."""
    result = await db.execute(
        select(Order).options(*_order_load_options()).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )
    return order


async def _eligible_riders_locked(db: AsyncSession) -> list[Rider]:
    """
    Return all riders eligible for dispatch, with their rows locked.

    Eligible means: `status = available` AND latitude/longitude are present.
    The `FOR UPDATE` lock prevents two concurrent dispatches from selecting the
    same rider (see module concurrency notes).
    """
    result = await db.execute(
        select(Rider)
        .where(
            Rider.status == RiderStatus.AVAILABLE.value,
            Rider.lat.is_not(None),
            Rider.lng.is_not(None),
        )
        .with_for_update()
    )
    return list(result.scalars().all())


def _pick_nearest(candidates: list[tuple[Rider, float]]) -> Rider:
    """
    Select the nearest candidate (smallest distance).

    Ties are broken deterministically by ascending rider id so the result never
    depends on database row-return order.
    """
    return min(candidates, key=lambda pair: (round(pair[1], 6), str(pair[0].id)))[0]


# ---------------------------------------------------------------------------
# Core dispatch
# ---------------------------------------------------------------------------
async def assign_nearest_rider(db: AsyncSession, order_id: uuid.UUID) -> dict:
    """
    Assign the nearest eligible available rider to a ready order.

    This is the SINGLE centralized assignment entry point used by all dispatch
    endpoints. It runs entirely inside the caller's transaction.

    Raises:
        HTTPException 404: order or delivery not found.
        HTTPException 400: order not in 'ready' state, or delivery not
            dispatchable.
        HTTPException 409: delivery already has a rider assigned.
        HTTPException 404 (message "No available riders"): no eligible rider.

    Returns a dict with the selected rider, the updated delivery, the computed
    distance in km, and a human-readable message.
    """
    order = await _get_order(db, order_id)

    # Order state validation: dispatch only 'ready' orders.
    # Note: Order.status is a String column, so it arrives here as a plain
    # string (e.g. 'ready'), not an enum instance — compare against .value.
    if order.status != OrderStatus.READY.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Order is not ready for dispatch (current status: "
                f"'{order.status}'). Only 'ready' orders can be dispatched."
            ),
        )

    delivery = await _get_delivery(db, order_id)
    if delivery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No delivery record exists for this order.",
        )

    # Delivery state validation: must be dispatchable and not already assigned.
    # Delivery.status is also a String column → plain string when loaded.
    if delivery.rider_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This delivery already has a rider assigned.",
        )
    if delivery.status != DeliveryStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Delivery is not dispatchable (current status: "
                f"'{delivery.status}'). Only 'pending' deliveries "
                f"can be assigned a rider."
            ),
        )

    # Atomic selection under a row lock.
    riders = await _eligible_riders_locked(db)
    if not riders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No available riders.",
        )

    candidates = [(rider, _rider_distance_km(rider)) for rider in riders]
    selected_rider = _pick_nearest(candidates)
    distance_km = round(
        next(dist for r, dist in candidates if r.id == selected_rider.id), 2
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Assign rider to the delivery.
    delivery.rider_id = selected_rider.id
    delivery.status = DeliveryStatus.ASSIGNED
    delivery.assigned_at = now

    # Mark the rider busy.
    selected_rider.status = RiderStatus.BUSY

    # Record the assignment in the order timeline.
    # The order's kitchen lifecycle is NOT changed — it remains 'ready'.
    db.add(
        OrderTimeline(
            order_id=order.id,
            status=DeliveryStatus.ASSIGNED.value,
            label="Rider Assigned",
        )
    )

    await db.commit()

    # Re-fetch the delivery (with its nested order, items, timeline) for a clean
    # response after the commit expired ORM instances.
    # - populate_existing=True forces the eager loads to re-read the timeline so
    #   the newly inserted "Rider Assigned" entry is included even though the same
    #   rows were already present in the session's identity map.
    # - Re-fetching the Delivery (rather than the Order) binds the delivery.order
    #   back-reference eagerly, so response serialization never triggers a lazy
    #   async load (which would raise MissingGreenlet inside pydantic).
    delivery_result = await db.execute(
        select(Delivery)
        .options(*_delivery_load_options())
        .where(Delivery.order_id == order_id)
        .execution_options(populate_existing=True)
    )
    delivery = delivery_result.scalar_one()

    rider_result = await db.execute(
        select(Rider).where(Rider.id == selected_rider.id)
    )
    rider = rider_result.scalar_one()

    return {
        "delivery": delivery,
        "rider": rider,
        "distance_km": distance_km,
        "message": "Nearest available rider assigned successfully",
    }
