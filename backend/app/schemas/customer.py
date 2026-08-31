"""
Customer Schemas
================
Request/response models for customers.

Customer data is denormalized for performance:
  - `total_orders`: lifetime order count (maintained by order_service)
  - `total_spent`: lifetime revenue from this customer (maintained by order_service)
  - `last_order_at`: timestamp of the most recent order

These fields are read-only in the API — clients cannot set them directly.
`status` is `active` or `inactive`, managed by the service layer.

`CustomerDetailRead` extends `CustomerRead` with the customer's order history
(newest first). It reuses the existing `OrderRead` schema for each order so no
new order schema is needed.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema
from app.schemas.order import OrderRead
from app.models.enums import CustomerStatus


class CustomerCreate(BaseSchema):
    """Payload to register a new customer."""

    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=7, max_length=50)
    email: EmailStr | None = None
    address: str | None = None


class CustomerUpdate(BaseSchema):
    """Optional fields that can be updated on an existing customer."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=7, max_length=50)
    email: EmailStr | None = None
    address: str | None = None
    status: CustomerStatus | None = None


class CustomerRead(BaseSchema):
    """Customer as returned to the client (list view, no order history)."""

    id: uuid.UUID
    name: str
    phone: str
    email: EmailStr | None
    address: str | None
    status: CustomerStatus
    total_orders: int
    total_spent: Decimal
    last_order_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CustomerDetailRead(CustomerRead):
    """
    Customer detail view, including order history.

    `orders` is populated by the customer service when requested. Each order is
    a full `OrderRead` (with its nested items and timeline). Defaults to an
    empty list so a customer with no order history still serializes cleanly.
    """

    orders: list[OrderRead] = Field(default_factory=list)
