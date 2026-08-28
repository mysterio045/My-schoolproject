"""
MenuCategory & MenuItem Models
==============================
Menu categories organize food items (e.g., Rice, Drinks, Snacks).
Menu items are the individual food/drink products customers can order.

price uses NUMERIC(10,2) — never floating point for money.
rating is NUMERIC(3,2) — out of 5.00.
order_count is a denormalized lifetime counter updated by the service layer.
"""

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PrimaryKeyMixin, TimestampMixin


class MenuCategory(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "menu_categories"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Relationships
    items: Mapped[list["MenuItem"]] = relationship(  # noqa: F821
        "MenuItem", back_populates="category", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<MenuCategory {self.name}>"


class MenuItem(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "menu_items"

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_categories.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
    )
    available: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", index=True,
    )
    image: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Statistics — denormalized, updated by service layer
    rating: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), default=Decimal("0.00"), server_default="0.00",
    )
    order_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Relationships
    category: Mapped["MenuCategory"] = relationship(  # noqa: F821
        "MenuCategory", back_populates="items", lazy="select",
    )
    order_items: Mapped[list["OrderItem"]] = relationship(  # noqa: F821
        "OrderItem", back_populates="menu_item", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<MenuItem {self.name}>"
