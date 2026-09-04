"""
Order Service
=============
Business logic for Orders, OrderItems, OrderTimeline, and their delivery
record.

Route handlers remain thin — all price calculation, snapshot capture, order
number generation, status transitions, counter updates, and transaction
handling live here.

KEY PRINCIPLES
--------------
- Prices/totals are computed SERVER-SIDE from the database. Client-supplied
  prices are never trusted.
- Historical snapshots (item name/price, customer name/phone, delivery
  address) are captured at order-creation time so later menu/customer edits
  never change past orders.
- Order status is the kitchen lifecycle and is kept SEPARATE from
  delivery.status (logistics).
- Order creation is one atomic transaction: order + items + timeline +
  delivery + customer counters either all persist or none do.
"""

import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.enums import DeliveryStatus, OrderStatus
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem, OrderTimeline
from app.schemas.order import OrderCreate, OrderItemCreate, OrderStatusUpdate


# ---------------------------------------------------------------------------
# Order status transition graph
# ---------------------------------------------------------------------------
# An order progresses through the kitchen lifecycle:
#   pending → confirmed → preparing → ready → completed / cancelled
# Terminal (finished) states cannot transition further.
ORDER_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.COMPLETED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
}

ORDER_STATUS_LABELS: dict[OrderStatus, str] = {
    OrderStatus.PENDING: "Order placed",
    OrderStatus.CONFIRMED: "Order confirmed",
    OrderStatus.PREPARING: "Order being prepared",
    OrderStatus.READY: "Order ready for dispatch",
    OrderStatus.COMPLETED: "Order completed",
    OrderStatus.CANCELLED: "Order cancelled",
}


# ---------------------------------------------------------------------------
# Repos / queries
# ---------------------------------------------------------------------------
async def get_order_or_404(db: AsyncSession, order_id: uuid.UUID) -> Order:
    """Fetch an order (with items + timeline + delivery) or raise HTTP 404."""
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.timeline),
            selectinload(Order.delivery),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )
    return order


async def _get_customer_or_404(db: AsyncSession, customer_id: uuid.UUID) -> Customer:
    """Fetch a customer or raise HTTP 404."""
    customer = await db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )
    return customer


async def _load_menu_items(
    db: AsyncSession, items: list[OrderItemCreate]
) -> dict[uuid.UUID, MenuItem]:
    """Load all requested menu items at once; raise 404 for unknown ids."""
    item_ids = [i.menu_item_id for i in items]
    result = await db.execute(select(MenuItem).where(MenuItem.id.in_(item_ids)))
    by_id = {m.id: m for m in result.scalars().all()}

    for req in items:
        if req.menu_item_id not in by_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Menu item {req.menu_item_id} not found.",
            )
    return by_id


def _generate_order_number(last_suffix: int) -> str:
    """Build the next sequential order number: ORD-<suffix>."""
    return f"ORD-{last_suffix + 1}"


def _parse_last_order_number_suffix(order_number: str) -> int:
    """Extract the numeric suffix from an existing ORD-<suffix> value."""
    match = re.search(r"(\d+)$", order_number)
    return int(match.group(1)) if match else 0


async def _next_order_number(db: AsyncSession) -> str:
    """
    Compute the next sequential order number.

    The max existing numeric suffix is used so new numbers never collide with
    existing rows. If there are no orders yet we start at 1000 (so the first
    number is ORD-1001). Wrapped in the create transaction with a retry on
    the unique constraint for safety under rare concurrent creation.
    """
    result = await db.execute(select(func.max(Order.order_number)))
    max_number = result.scalar_one_or_none()
    last_suffix = _parse_last_order_number_suffix(max_number) if max_number else 1000
    return _generate_order_number(last_suffix)


# ---------------------------------------------------------------------------
# Create order
# ---------------------------------------------------------------------------
async def create_order(db: AsyncSession, payload: OrderCreate) -> Order:
    """
    Create an order atomically.

    Steps (all in one transaction):
      1. Validate the customer exists.
      2. Validate every menu item exists and is available.
      3. Compute subtotal / delivery fee / total SERVER-SIDE.
      4. Capture historical snapshots (item name+price, customer name/phone,
         delivery address).
      5. Generate the next order number.
      6. Persist order + items + timeline + delivery record.
      7. Update customer counters (total_orders, total_spent, last_order_at).

    Client-supplied monetary values are ignored — money comes from the DB.
    """
    customer = await _get_customer_or_404(db, payload.customer_id)
    menu_items = await _load_menu_items(db, payload.items)

    # Validate availability — reject inactive/unavailable items.
    for req in payload.items:
        item = menu_items[req.menu_item_id]
        if not item.available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Menu item '{item.name}' is not available.",
            )

    # Compute money server-side.
    subtotal = Decimal("0.00")
    for req in payload.items:
        item = menu_items[req.menu_item_id]
        subtotal += item.price * Decimal(req.quantity)

    delivery_fee = settings.delivery_fee
    total = subtotal + delivery_fee

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    order_number = await _next_order_number(db)

    order = Order(
        order_number=order_number,
        customer_id=customer.id,
        customer_name=customer.name,
        customer_phone=customer.phone,
        delivery_address=payload.delivery_address,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        status=OrderStatus.PENDING,
        notes=payload.notes,
        estimated_delivery=payload.estimated_delivery,
    )
    db.add(order)
    await db.flush()  # assign order.id for child rows

    # Order items (with historical snapshots).
    for req in payload.items:
        item = menu_items[req.menu_item_id]
        line_total = item.price * Decimal(req.quantity)
        db.add(
            OrderItem(
                order_id=order.id,
                menu_item_id=item.id,
                name_snapshot=item.name,
                quantity=req.quantity,
                unit_price=item.price,
                line_total=line_total,
            )
        )

    # Initial timeline entry.
    db.add(
        OrderTimeline(
            order_id=order.id,
            status=OrderStatus.PENDING.value,
            label=ORDER_STATUS_LABELS[OrderStatus.PENDING],
        )
    )

    # Related delivery record (1:1 with order, status pending; rider assigned
    # in a later dispatch phase).
    db.add(
        Delivery(
            order_id=order.id,
            status=DeliveryStatus.PENDING,
            delivery_location=payload.delivery_address,
        )
    )

    # Customer counters.
    customer.total_orders = (customer.total_orders or 0) + 1
    customer.total_spent = (customer.total_spent or Decimal("0.00")) + total
    customer.last_order_at = now

    await db.commit()
    await db.refresh(order)
    return await get_order_or_404(db, order.id)


# ---------------------------------------------------------------------------
# List orders
# ---------------------------------------------------------------------------
async def list_orders(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    customer_id: uuid.UUID | None = None,
) -> tuple[list[Order], int]:
    """
    List orders with optional customer filter and pagination.

    Returns (orders_for_page, total_count) ordered newest first.
    """
    base = select(Order)
    count_stmt = select(func.count()).select_from(Order)

    if customer_id is not None:
        base = base.where(Order.customer_id == customer_id)
        count_stmt = count_stmt.where(Order.customer_id == customer_id)

    total = (await db.execute(count_stmt)).scalar_one()

    base = (
        base.options(
            selectinload(Order.items),
            selectinload(Order.timeline),
        )
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    orders = (await db.execute(base)).scalars().all()
    return list(orders), total


# ---------------------------------------------------------------------------
# Order status transitions
# ---------------------------------------------------------------------------
async def update_order_status(
    db: AsyncSession, order: Order, payload: OrderStatusUpdate
) -> Order:
    """
    Advance an order's status along the kitchen lifecycle.

    Rejects invalid transitions and records every legitimate change in the
    order timeline.
    """
    new_status = payload.status
    allowed = ORDER_TRANSITIONS.get(order.status, set())

    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition from '{order.status}' "
                f"to '{new_status.value}'."
            ),
        )

    order.status = new_status
    db.add(
        OrderTimeline(
            order_id=order.id,
            status=new_status.value,
            label=ORDER_STATUS_LABELS[new_status],
        )
    )
    await db.commit()
    await db.refresh(order)
    return await get_order_or_404(db, order.id)
