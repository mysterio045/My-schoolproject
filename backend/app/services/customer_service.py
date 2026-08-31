"""
Customer Service
================
Business logic for customer read operations.

Thin route handlers delegate here for:
- listing customers (with search + pagination)
- fetching a single customer (with optional order history)

For the detail view we load the customer's orders (newest first) along with
their nested items and timeline using eager loading, so the response is a
single, complete `CustomerDetailRead` with no N+1 queries.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderTimeline


async def get_customer_or_404(db: AsyncSession, customer_id: uuid.UUID) -> Customer:
    """Fetch a customer or raise HTTP 404."""
    customer = await db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )
    return customer


async def list_customers(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[list[Customer], int]:
    """
    List customers with optional search and pagination.

    Search matches against name, phone, or email (case-insensitive substring).

    Returns (customers_for_page, total_count).

    Ordering: most recently updated first, then name.
    """
    base = select(Customer)
    count_stmt = select(func.count()).select_from(Customer)

    if search:
        like = f"%{search.strip()}%"
        condition = or_(
            Customer.name.ilike(like),
            Customer.phone.ilike(like),
            Customer.email.ilike(like),
        )
        base = base.where(condition)
        count_stmt = count_stmt.where(condition)

    total = (await db.execute(count_stmt)).scalar_one()

    base = (
        base.order_by(Customer.updated_at.desc(), Customer.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    customers = (await db.execute(base)).scalars().all()
    return list(customers), total


async def get_customer_with_orders(
    db: AsyncSession,
    customer_id: uuid.UUID,
) -> Customer:
    """
    Fetch a customer including their order history.

    Orders are loaded newest-first along with their items and timeline via
    `selectinload`, avoiding N+1 queries and lazy-load issues on async sessions.
    """
    result = await db.execute(
        select(Customer)
        .options(
            selectinload(Customer.orders).selectinload(Order.items),
            selectinload(Customer.orders).selectinload(Order.timeline),
        )
        .where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )
    # Newest first
    customer.orders = sorted(
        customer.orders, key=lambda o: o.created_at, reverse=True
    )
    return customer
