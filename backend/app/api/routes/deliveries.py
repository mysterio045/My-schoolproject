"""
Delivery Routes
===============
Delivery endpoints. All require admin authentication (consistent with the
Phase 4A authorization design).

Endpoints:
    GET   /api/deliveries                — list deliveries (auth)
    GET   /api/deliveries/{id}           — get one delivery (auth)
    GET   /api/deliveries/order/{order_id} — get delivery for an order (auth)
    PATCH /api/deliveries/{id}/status    — advance delivery status (auth)

Rider assignment / dispatch is intentionally OUT of scope for Phase 4B.
Routes are thin — all business logic lives in `app.services.delivery_service`.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.models.enums import DeliveryStatus
from app.schemas.common import Page, PageParams
from app.schemas.delivery import DeliveryStatusUpdate, DeliveryWithOrderRead
from app.services import delivery_service

router = APIRouter(prefix="/api/deliveries", tags=["Deliveries"])


@router.get(
    "",
    response_model=Page[DeliveryWithOrderRead],
    summary="List deliveries",
)
async def list_deliveries(
    params: PageParams = Depends(),
    status_filter: DeliveryStatus | None = Query(default=None, alias="status", description="Filter by delivery status"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """List deliveries with optional status filter and pagination."""
    deliveries, total = await delivery_service.list_deliveries(
        db,
        page=params.page,
        page_size=params.page_size,
        status_filter=status_filter,
    )
    pages = (total + params.page_size - 1) // params.page_size
    return {
        "items": deliveries,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": pages,
    }


@router.get(
    "/order/{order_id}",
    response_model=DeliveryWithOrderRead,
    summary="Get the delivery for an order",
)
async def get_delivery_by_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> DeliveryWithOrderRead:
    """Return the delivery linked to the given order, or HTTP 404."""
    return await delivery_service.get_delivery_by_order(db, order_id)


@router.get(
    "/{delivery_id}",
    response_model=DeliveryWithOrderRead,
    summary="Get one delivery",
)
async def get_delivery(
    delivery_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> DeliveryWithOrderRead:
    """Return a single delivery, or HTTP 404 if it does not exist."""
    return await delivery_service.get_delivery_or_404(db, delivery_id)


@router.patch(
    "/{delivery_id}/status",
    response_model=DeliveryWithOrderRead,
    summary="Advance a delivery's status",
)
async def update_delivery_status(
    delivery_id: uuid.UUID,
    payload: DeliveryStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> DeliveryWithOrderRead:
    """Advance a delivery's logistics status.

    Rejects invalid transitions and stamps the matching logistics timestamp.
    """
    delivery = await delivery_service.get_delivery_or_404(db, delivery_id)
    return await delivery_service.update_delivery_status(db, delivery, payload)
