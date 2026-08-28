"""
Customer Model
==============
Represents restaurant customers.

total_orders and total_spent are denormalized counters updated by the service layer.
These counters avoid expensive COUNT/SUM queries on every dashboard load.
last_order_at is also denormalized for the same reason.

A customer's name, phone, and address may be snapshotted into orders at order time.
Changes to a customer's profile do NOT affect historical orders.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PrimaryKeyMixin, TimestampMixin
from app.models.enums import CustomerStatus


class Customer(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status: active / inactive
    status: Mapped[CustomerStatus] = mapped_column(
        String(20), default=CustomerStatus.ACTIVE,
        server_default="active",
    )

    # Denormalized counters — updated by order_service when orders are created/completed
    total_orders: Mapped[int] = mapped_column(default=0, server_default="0")
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), server_default="0.00",
    )
    last_order_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    orders: Mapped[list["Order"]] = relationship(  # noqa: F821
        "Order", back_populates="customer", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Customer {self.name}>"
