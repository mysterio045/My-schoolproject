"""
Delivery Schemas
================
Request/response models for deliveries (the logistics half of an order).

A delivery is created when an order is ready for dispatch. It links to exactly
one order (1:1) and optionally one rider.

Delivery vs Order status
------------------------
- Order status: kitchen lifecycle (pending → confirmed → ... → completed/cancelled)
- Delivery status: logistics lifecycle
      pending → assigned → accepted → picked_up → on_the_way → delivered / failed

These are independent. Failing a delivery does not cancel the order; the order
can be re-dispatched to a new delivery.

Timestamps
----------
Each `*_at` field records when the corresponding logistics event occurred and
is used for delivery-time analytics and SLA monitoring. Status changes update
these timestamps in the service layer.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common import BaseSchema
from app.schemas.order import OrderRead
from app.models.enums import DeliveryStatus


class DeliveryCreate(BaseSchema):
    """
    Payload to create a delivery record for an order (start dispatch).
    A delivery can only be created when the order does not already have one.
    """

    order_id: uuid.UUID
    pickup_location: str | None = None
    delivery_location: str | None = None


class AssignRiderRequest(BaseSchema):
    """Associate a rider with a delivery."""

    rider_id: uuid.UUID


class DeliveryStatusUpdate(BaseSchema):
    """
    Advance a delivery's status.

    The service layer enforces the valid transition graph
    (e.g. you cannot jump straight from 'pending' to 'delivered').
    """

    status: DeliveryStatus
    failure_reason: str | None = Field(
        default=None,
        description="Required when status = failed",
    )


class DeliveryRead(BaseSchema):
    """Delivery as returned to the client."""

    id: uuid.UUID
    order_id: uuid.UUID
    rider_id: uuid.UUID | None
    status: DeliveryStatus
    pickup_location: str | None
    delivery_location: str | None
    assigned_at: datetime | None
    accepted_at: datetime | None
    picked_up_at: datetime | None
    delivered_at: datetime | None
    failed_at: datetime | None
    failure_reason: str | None
    rider_lat: Decimal | None
    rider_lng: Decimal | None
    created_at: datetime
    updated_at: datetime


class DeliveryWithOrderRead(DeliveryRead):
    """
    Delivery plus the nested order it belongs to.

    Used by the dispatch dashboard so the UI can render order context
    (customer, totals, status) alongside delivery progress in one payload.
    """

    order: OrderRead
