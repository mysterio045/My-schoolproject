"""
Delivery Model
==============
Represents the logistics operation for delivering an order.

An order exists before a rider is assigned. The delivery record is created
when the order is ready for dispatch. A delivery is always linked to exactly
one order (1:1 relationship via unique order_id).

DELIVERY vs ORDER STATUS:
- Order status: pending → confirmed → preparing → ready → completed/cancelled
  (tracks kitchen/preparation lifecycle)
- Delivery status: pending → assigned → accepted → picked_up → on_the_way → delivered/failed
  (tracks logistics/rider lifecycle)

These are independent. An order can be 'completed' while we don't track delivery,
or a delivery can 'fail' while the order is re-assigned to a new delivery.

TIMESTAMPS:
Each delivery timestamp records when a logistics event occurred.
These are used for delivery time analytics and SLA monitoring.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PrimaryKeyMixin, TimestampMixin
from app.models.enums import DeliveryStatus


class Delivery(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deliveries"

    # Each order has at most one delivery record (1:1)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="RESTRICT"),
        unique=True, nullable=False, index=True,
    )

    # Rider assignment — nullable until a rider is assigned
    rider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("riders.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # Status: pending / assigned / accepted / picked_up / on_the_way / delivered / failed
    status: Mapped[DeliveryStatus] = mapped_column(
        String(20), default=DeliveryStatus.PENDING,
        server_default="pending", index=True,
    )

    # Locations
    pickup_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_location: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Logistics timestamps — each records when the event occurred
    assigned_at: Mapped[datetime | None] = mapped_column(nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    picked_up_at: Mapped[datetime | None] = mapped_column(nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Rider location at last update (for tracking)
    rider_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    rider_lng: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)

    # Relationships
    order: Mapped["Order"] = relationship(  # noqa: F821
        "Order", back_populates="delivery", lazy="select",
    )
    rider: Mapped["Rider | None"] = relationship(  # noqa: F821
        "Rider", back_populates="deliveries", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Delivery {self.id} order={self.order_id}>"
