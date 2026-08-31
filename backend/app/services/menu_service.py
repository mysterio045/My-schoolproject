"""
Menu Service
============
Business logic for the menu: categories and items.

Thin route handlers delegate here for:
- listing items (with category & availability filters + pagination)
- fetching/creating/updating/toggling items
- category CRUD
- category/price/name validation

All money stays as Decimal in the service layer; the Pydantic schema layer
converts it to a JSON number on serialization.
"""

import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.menu import MenuCategory, MenuItem
from app.schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryUpdate,
    MenuItemCreate,
    MenuItemUpdate,
)


# ---------------------------------------------------------------------------
# Repos / queries
# ---------------------------------------------------------------------------
async def get_category_or_404(db: AsyncSession, category_id: uuid.UUID) -> MenuCategory:
    """Fetch a category or raise HTTP 404."""
    category = await db.get(MenuCategory, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu category not found.",
        )
    return category


async def get_item_or_404(db: AsyncSession, item_id: uuid.UUID) -> MenuItem:
    """Fetch a menu item or raise HTTP 404."""
    item = await db.get(MenuItem, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )
    return item


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------
async def list_items(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    category_id: uuid.UUID | None = None,
    available: bool | None = None,
) -> tuple[list[MenuItem], int]:
    """
    List menu items with optional filters and pagination.

    Returns (items_for_page, total_count).

    Ordering: available first, then category sort_order, then name.
    """
    base = select(MenuItem)
    count_stmt = select(func.count()).select_from(MenuItem)

    if category_id is not None:
        base = base.where(MenuItem.category_id == category_id)
        count_stmt = count_stmt.where(MenuItem.category_id == category_id)
    if available is not None:
        base = base.where(MenuItem.available == available)
        count_stmt = count_stmt.where(MenuItem.available == available)

    total = (await db.execute(count_stmt)).scalar_one()

    base = (
        base.join(MenuCategory, MenuItem.category_id == MenuCategory.id)
        .order_by(
            MenuItem.available.desc(),
            MenuCategory.sort_order.asc(),
            MenuItem.name.asc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    items = (await db.execute(base)).scalars().all()
    return list(items), total


async def create_item(db: AsyncSession, payload: MenuItemCreate) -> MenuItem:
    """Create a menu item after validating its category."""
    await get_category_or_404(db, payload.category_id)  # 404 if category missing
    item = MenuItem(
        category_id=payload.category_id,
        name=payload.name.strip(),
        description=payload.description,
        price=payload.price,
        available=payload.available,
        image=payload.image,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_item(db: AsyncSession, item_id: uuid.UUID, payload: MenuItemUpdate) -> MenuItem:
    """Update permitted fields of a menu item."""
    item = await get_item_or_404(db, item_id)

    data = payload.model_dump(exclude_unset=True)

    # If a category change is requested, ensure it exists.
    new_category_id = data.get("category_id")
    if new_category_id is not None and new_category_id != item.category_id:
        await get_category_or_404(db, new_category_id)

    for field, value in data.items():
        if field == "name" and value is not None:
            value = value.strip()
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


async def toggle_availability(db: AsyncSession, item_id: uuid.UUID) -> MenuItem:
    """Flip an item's availability (available ↔ unavailable)."""
    item = await get_item_or_404(db, item_id)
    item.available = not item.available
    await db.commit()
    await db.refresh(item)
    return item


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
async def list_categories(db: AsyncSession) -> list[MenuCategory]:
    """List all categories ordered by sort_order then name."""
    result = await db.execute(
        select(MenuCategory).order_by(MenuCategory.sort_order.asc(), MenuCategory.name.asc())
    )
    return list(result.scalars().all())


async def create_category(db: AsyncSession, payload: MenuCategoryCreate) -> MenuCategory:
    """Create a menu category (rejects duplicate names with HTTP 409)."""
    existing = (await db.execute(
        select(MenuCategory).where(MenuCategory.name == payload.name.strip())
    )).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A menu category with this name already exists.",
        )

    category = MenuCategory(
        name=payload.name.strip(),
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update_category(db: AsyncSession, category_id: uuid.UUID, payload: MenuCategoryUpdate) -> MenuCategory:
    """Update a menu category."""
    category = await get_category_or_404(db, category_id)

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        new_name = data["name"].strip()
        clash = (await db.execute(
            select(MenuCategory).where(MenuCategory.name == new_name, MenuCategory.id != category_id)
        )).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A menu category with this name already exists.",
            )
        data["name"] = new_name

    for field, value in data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category
