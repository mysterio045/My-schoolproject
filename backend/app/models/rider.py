"""
Rider Model
===========
Represents delivery riders.

Riders have a current location (lat/lng), status, and delivery statistics.
distance_from_restaurant is a cached field — the dispatch service calculates
the real distance dynamically using haversine formula.

today_deliveries resets daily (via a background job or on-access check).
completed_deliveries is a lifetime counter.
average_delivery_time is in minutes.
rating is out of 5.00.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PrimaryKeyMixin, TimestampMixin
from app.models.enums import RiderStatus


class Rider(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "riders"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Status: available / busy / offline
    status: Mapped[RiderStatus] = mapped_column(
        String(20), default=RiderStatus.AVAILABLE,
        server_default="available", index=True,
    )

    # Current location
    lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    location_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Cached distance from restaurant (km). Dispatch recalculates dynamically.
    distance_from_restaurant: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True,
    )

    # Delivery statistics
    today_deliveries: Mapped[int] = mapped_column(default=0, server_default="0")
    completed_deliveries: Mapped[int] = mapped_column(default=0, server_default="0")
    average_delivery_time: Mapped[int] = mapped_column(default=0, server_default="0")
    rating: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), default=Decimal("5.00"), server_default="5.00",
    )

    # Profile
    avatar: Mapped[str | None] = mapped_column(String(10), nullable=True)
    joined_at: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationships
    deliveries: Mapped[list["Delivery"]] = relationship(  # noqa: F821
        "Delivery", back_populates="rider", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Rider {self.name}>"
