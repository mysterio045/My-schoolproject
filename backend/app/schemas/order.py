"""
Order Schemas
=============
Request/response models for orders, order items, and order timeline events.

Snapshots
---------
When an order is created, the service captures:
  - customer_name / customer_phone / delivery_address on the order
  - name_snapshot / unit_price on each item

These snapshots keep historical orders accurate even if the customer profile
or menu prices change later. Clients supply only `menu_item_id` + `quantity`
for each item; the service resolves names and prices from the menu.

Money
-----
`subtotal`, `delivery_fee`, `total`, `unit_price`, `line_total` are computed/
stored as `Decimal` in the service layer and serialized as JSON numbers.

Status
------
`status` follows the kitchen lifecycle:
    pending → confirmed → preparing → ready → completed / cancelled
This is SEPARATE from `delivery.status` (logistics).
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import Field, model_validator

from app.schemas.common import BaseSchema
from app.models.enums import OrderStatus


# ---------------------------------------------------------------------------
# Order Items
# ---------------------------------------------------------------------------
class OrderItemCreate(BaseSchema):
    """One line item requested by the client when creating an order."""

    menu_item_id: uuid.UUID
    quantity: int = Field(ge=1, le=100)


class OrderItemRead(BaseSchema):
    """A stored order item (includes service-captured snapshots)."""

    id: uuid.UUID
    order_id: uuid.UUID
    menu_item_id: uuid.UUID
    name_snapshot: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


# ---------------------------------------------------------------------------
# Order Timeline
# ---------------------------------------------------------------------------
class OrderTimelineRead(BaseSchema):
    """One status-change event in the order's history."""

    id: uuid.UUID
    order_id: uuid.UUID
    status: str
    label: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Order Create / Update
# ---------------------------------------------------------------------------
class OrderCreate(BaseSchema):
    """Payload to place a new order (service computes money + snapshots)."""

    customer_id: uuid.UUID
    items: list[OrderItemCreate] = Field(min_length=1)
    delivery_address: str
    notes: str | None = None
    estimated_delivery: datetime | None = None

    @model_validator(mode="after")
    def require_non_empty_items(self):
        if not self.items:
            raise ValueError("An order must contain at least one item")
        return self


class OrderUpdate(BaseSchema):
    """Optional fields an admin may update on an order."""

    status: OrderStatus | None = None
    notes: str | None = None
    estimated_delivery: datetime | None = None


class OrderStatusUpdate(BaseSchema):
    """
    Payload to advance an order's status.

    The service layer enforces the valid transition graph
    (e.g. you cannot jump straight from 'pending' to 'completed').
    """

    status: OrderStatus


# ---------------------------------------------------------------------------
# Order Read
# ---------------------------------------------------------------------------
class OrderRead(BaseSchema):
    """Order as returned to the client, with nested items and timeline."""

    id: uuid.UUID
    order_number: str
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: str
    delivery_address: str
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal
    status: OrderStatus
    estimated_delivery: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    # Nested relationships
    items: list[OrderItemRead] = Field(default_factory=list)
    timeline: list[OrderTimelineRead] = Field(default_factory=list)
