"""
Customer Routes
===============
Authenticated customer read operations.

Endpoints:
    GET /api/customers          — list customers (search + pagination) (auth)
    GET /api/customers/{id}     — get one customer + order history (auth)

Write operations (create/update) are future work and are intentionally NOT
implemented in Phase 4A.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.schemas.common import Page, PageParams
from app.schemas.customer import CustomerDetailRead, CustomerRead
from app.services import customer_service

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get(
    "",
    response_model=Page[CustomerRead],
    summary="List customers",
)
async def list_customers(
    params: PageParams = Depends(),
    search: str | None = Query(default=None, description="Search by name, phone, or email"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """
    List customers with optional search and pagination.

    Query params:
      - page, page_size   — pagination
      - search            — case-insensitive match against name/phone/email
    """
    customers, total = await customer_service.list_customers(
        db,
        page=params.page,
        page_size=params.page_size,
        search=search,
    )
    pages = (total + params.page_size - 1) // params.page_size
    return {
        "items": customers,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": pages,
    }


@router.get(
    "/{customer_id}",
    response_model=CustomerDetailRead,
    summary="Get a customer with their order history",
)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> CustomerDetailRead:
    """
    Return a single customer including their order history (newest first).

    Raises HTTP 404 if the customer does not exist.
    """
    return await customer_service.get_customer_with_orders(db, customer_id)
