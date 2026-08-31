"""
Menu Schemas
============
Request/response models for menu categories and menu items.

- A `MenuCategory` groups items (Rice, Drinks, Snacks, ...).
- A `MenuItem` belongs to exactly one category.

`price` is money → kept as `Decimal` internally, serialized as a number.
`rating` is out of 5.00; `order_count` is a denormalized lifetime counter
managed by the service layer (read-only for clients).
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common import BaseSchema


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
class MenuCategoryCreate(BaseSchema):
    """Payload to create a menu category."""

    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    sort_order: int = Field(default=0, ge=0)


class MenuCategoryUpdate(BaseSchema):
    """Optional fields that can be updated on a category."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    sort_order: int | None = Field(default=None, ge=0)


class MenuCategoryRead(BaseSchema):
    """Category as returned to the client."""

    id: uuid.UUID
    name: str
    description: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------
class MenuItemCreate(BaseSchema):
    """Payload to create a menu item."""

    category_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=Decimal("0"), max_digits=10, decimal_places=2)
    available: bool = True
    image: str | None = Field(default=None, max_length=255)


class MenuItemUpdate(BaseSchema):
    """Optional fields that can be updated on a menu item."""

    category_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=Decimal("0"), max_digits=10, decimal_places=2)
    available: bool | None = None
    image: str | None = Field(default=None, max_length=255)


class MenuItemRead(BaseSchema):
    """Menu item as returned to the client."""

    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    available: bool
    image: str | None
    rating: Decimal
    order_count: int
    created_at: datetime
    updated_at: datetime
