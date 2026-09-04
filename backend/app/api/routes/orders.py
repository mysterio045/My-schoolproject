"""
Order Routes
============
Order + order-status endpoints. All endpoints require admin authentication
(consistent with the Phase 4A authorization design — there is no customer
token scope yet, so unauthorized users cannot reach order data).

Endpoints:
    POST  /api/orders            — create an order (auth)
    GET   /api/orders            — list orders w/ customer filter + pagination (auth)
    GET   /api/orders/{id}       — get one order with items, timeline, delivery (auth)
    PATCH /api/orders/{id}/status — advance order status (auth)

Routes are thin — all business logic lives in `app.services.order_service`.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.schemas.common import Page, PageParams
from app.schemas.order import OrderCreate, OrderRead, OrderStatusUpdate
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post(
    "",
    response_model=OrderRead,
    status_code=201,
    summary="Create a new order",
)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> OrderRead:
    """Create an order. Prices/totals are computed server-side from the DB."""
    return await order_service.create_order(db, payload)


@router.get(
    "",
    response_model=Page[OrderRead],
    summary="List orders",
)
async def list_orders(
    params: PageParams = Depends(),
    customer_id: uuid.UUID | None = Query(default=None, description="Filter by customer UUID"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """List orders with optional customer filter and pagination."""
    orders, total = await order_service.list_orders(
        db,
        page=params.page,
        page_size=params.page_size,
        customer_id=customer_id,
    )
    pages = (total + params.page_size - 1) // params.page_size
    return {
        "items": orders,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": pages,
    }


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    summary="Get an order with its items, timeline, and delivery",
)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> OrderRead:
    """Return a single order (with items, timeline, and delivery).

    Raises HTTP 404 if the order does not exist.
    """
    return await order_service.get_order_or_404(db, order_id)


@router.patch(
    "/{order_id}/status",
    response_model=OrderRead,
    summary="Advance an order's status",
)
async def update_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> OrderRead:
    """Advance an order's status along the kitchen lifecycle.

    Rejects invalid transitions and records each change in the order timeline.
    """
    order = await order_service.get_order_or_404(db, order_id)
    return await order_service.update_order_status(db, order, payload)
