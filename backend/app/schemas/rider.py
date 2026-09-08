"""
Rider Schemas
=============
Request/response models for delivery riders.

Rider location and distance
---------------------------
- `lat` / `lng`: the rider's current coordinates (decimal degrees).
- `distance_from_restaurant`: a CACHED value in km. The dispatch service
  recalculates the real distance dynamically using the haversine formula, so
  this field is treated as informational here and managed by the service.

Delivery statistics are denormalized and managed by the service layer:
  - `today_deliveries`
  - `completed_deliveries`
  - `average_delivery_time` (minutes)
  - `rating` (0-5)

`joined_at` is a calendar date (no time component).
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema
from app.schemas.delivery import DeliveryRead
from app.models.enums import RiderStatus


# ---------------------------------------------------------------------------
# Auth Schemas
# ---------------------------------------------------------------------------
class RiderRegister(BaseSchema):
    """Payload to register a new rider account."""

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=7, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    vehicle_type: str | None = Field(default=None, max_length=50)
    vehicle_plate_number: str | None = Field(default=None, max_length=50)


class RiderLogin(BaseSchema):
    """Payload to log in as a rider."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RiderTokenResponse(BaseSchema):
    """Response from rider login endpoint."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RiderAvailabilityUpdate(BaseSchema):
    """Payload to update rider availability status."""

    status: RiderStatus


# ---------------------------------------------------------------------------
# CRUD Schemas (admin)
# ---------------------------------------------------------------------------
class RiderCreate(BaseSchema):
    """Payload to add a new rider (admin)."""

    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=7, max_length=50)
    email: EmailStr | None = None
    lat: Decimal | None = Field(
        default=None, ge=Decimal("-90"), le=Decimal("90"),
        description="Current latitude (d.ddddddd)",
    )
    lng: Decimal | None = Field(
        default=None, ge=Decimal("-180"), le=Decimal("180"),
        description="Current longitude (d.ddddddd)",
    )
    location_address: str | None = None
    joined_at: date
    avatar: str | None = Field(default=None, max_length=10)


class RiderUpdate(BaseSchema):
    """Optional fields that can be updated on an existing rider (admin)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=7, max_length=50)
    email: EmailStr | None = None
    status: RiderStatus | None = None
    lat: Decimal | None = Field(
        default=None, ge=Decimal("-90"), le=Decimal("90"),
    )
    lng: Decimal | None = Field(
        default=None, ge=Decimal("-180"), le=Decimal("180"),
    )
    location_address: str | None = None
    avatar: str | None = Field(default=None, max_length=10)


class RiderLocationUpdate(BaseSchema):
    """
    Payload to update only a rider's live location.

    Used by the rider mobile app to stream position updates for tracking.
    """

    lat: Decimal = Field(ge=Decimal("-90"), le=Decimal("90"))
    lng: Decimal = Field(ge=Decimal("-180"), le=Decimal("180"))
    location_address: str | None = None


# ---------------------------------------------------------------------------
# Read Schemas
# ---------------------------------------------------------------------------
class RiderRead(BaseSchema):
    """Rider as returned to the client."""

    id: uuid.UUID
    first_name: str
    last_name: str
    name: str
    phone: str
    email: EmailStr
    vehicle_type: str | None
    vehicle_plate_number: str | None
    status: RiderStatus
    lat: Decimal | None
    lng: Decimal | None
    location_address: str | None
    distance_from_restaurant: Decimal | None
    today_deliveries: int
    completed_deliveries: int
    average_delivery_time: int
    rating: Decimal
    avatar: str | None
    joined_at: date
    created_at: datetime
    updated_at: datetime


class RiderDetailRead(RiderRead):
    """
    Rider plus their delivery history.

    Used by the rider detail endpoint so the UI can render which deliveries
    each rider has been involved in alongside the rider's profile.
    """

    deliveries: list[DeliveryRead] = Field(default_factory=list)
