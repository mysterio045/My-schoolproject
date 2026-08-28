"""
Order, OrderItem & OrderTimeline Models
========================================
Orders represent what the customer purchased.
OrderItems are the individual line items in an order.
OrderTimeline records the history of status changes.

SNAPSHOT FIELDS:
  Orders store customer_name, customer_phone, and delivery_address at order time.
  OrderItems store name_snapshot and unit_price at order time.

  These snapshots ensure historical orders remain accurate even if
  the customer's profile or menu prices change later.

DELIVERY SEPARATION:
  Orders do NOT contain rider_id. Rider assignment is in the deliveries table.
  The order status tracks the kitchen/preparation lifecycle.
  The delivery status tracks the logistics lifecycle.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PrimaryKeyMixin, TimestampMixin
from app.models.enums import OrderStatus


class Order(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "orders"

    # Human-readable order number (e.g., "ORD-1024"). Unique, sequential.
    order_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
    )

    # Customer reference + snapshot fields
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    # Snapshot: customer name at order time (may differ from current customer.name)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Snapshot: customer phone at order time
    customer_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    # Snapshot: delivery address at order time
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)

    # Financials
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Status: pending / confirmed / preparing / ready / completed / cancelled
    status: Mapped[OrderStatus] = mapped_column(
        String(20), default=OrderStatus.PENDING,
        server_default="pending", index=True,
    )

    estimated_delivery: Mapped[datetime | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship(  # noqa: F821
        "Customer", back_populates="orders", lazy="select",
    )
    items: Mapped[list["OrderItem"]] = relationship(  # noqa: F821
        "OrderItem", back_populates="order", lazy="select", cascade="all, delete-orphan",
    )
    timeline: Mapped[list["OrderTimeline"]] = relationship(  # noqa: F821
        "OrderTimeline", back_populates="order", lazy="select",
        order_by="OrderTimeline.created_at",
    )
    delivery: Mapped["Delivery | None"] = relationship(  # noqa: F821
        "Delivery", back_populates="order", uselist=False, lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Order {self.order_number}>"


class OrderItem(Base, PrimaryKeyMixin):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Snapshot: menu item name at order time
    name_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Snapshot: price per unit at order time
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Computed: quantity * unit_price
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship(  # noqa: F821
        "Order", back_populates="items", lazy="select",
    )
    menu_item: Mapped["MenuItem"] = relationship(  # noqa: F821
        "MenuItem", back_populates="order_items", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<OrderItem {self.name_snapshot} x{self.quantity}>"


class OrderTimeline(Base, PrimaryKeyMixin):
    __tablename__ = "order_timeline"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False,
    )

    # Relationships
    order: Mapped["Order"] = relationship(  # noqa: F821
        "Order", back_populates="timeline", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<OrderTimeline {self.status}: {self.label}>"
