"""
Dispatch Schemas
================
Request/response models for the Smart Rider Dispatch Engine.

The `DispatchRequest` accepts an order id; the service computes the nearest
eligible available rider and returns `DispatchResultRead` containing the updated
delivery, the selected rider, the computed distance, and a message.
"""

import uuid

from app.schemas.common import BaseSchema
from app.schemas.delivery import DeliveryWithOrderRead
from app.schemas.rider import RiderRead


class DispatchRequest(BaseSchema):
    """Payload to trigger dispatch for a ready order."""

    order_id: uuid.UUID


class DispatchResultRead(BaseSchema):
    """
    Result of a successful dispatch.

    Includes the updated delivery (nested order context), the selected rider,
    the straight-line distance from the restaurant in km, and a message.
    """

    delivery: DeliveryWithOrderRead
    rider: RiderRead
    distance_km: float
    message: str
