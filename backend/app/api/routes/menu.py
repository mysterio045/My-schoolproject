"""
Menu Routes
===========
Menu category + item endpoints.

Endpoints (items):
    GET   /api/menu                      — list items (filter + paginate)
    GET   /api/menu/{id}                 — get one item
    POST  /api/menu                      — create item (auth)
    PATCH /api/menu/{id}                 — update item (auth)
    PATCH /api/menu/{id}/toggle          — toggle availability (auth)

Endpoints (categories):
    GET   /api/menu/categories           — list categories
    POST  /api/menu/categories           — create category (auth)
    PATCH /api/menu/categories/{id}      — update category (auth)

Category routes are declared before item routes so `/categories` is matched as
a literal path rather than as an `{id}` (all ids are UUIDs).

READ endpoints are public; WRITE endpoints require admin authentication.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.schemas.common import Page, PageParams
from app.schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryRead,
    MenuCategoryUpdate,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
)
from app.services import menu_service

router = APIRouter(prefix="/api/menu", tags=["Menu"])


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
@router.get(
    "/categories",
    response_model=list[MenuCategoryRead],
    summary="List menu categories",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> list:
    """Return all menu categories, ordered by sort order then name."""
    return await menu_service.list_categories(db)


@router.post(
    "/categories",
    response_model=MenuCategoryRead,
    status_code=201,
    summary="Create a menu category",
)
async def create_category(
    payload: MenuCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> MenuCategoryRead:
    """Create a new menu category (admin only)."""
    return await menu_service.create_category(db, payload)


@router.patch(
    "/categories/{category_id}",
    response_model=MenuCategoryRead,
    summary="Update a menu category",
)
async def update_category(
    category_id: uuid.UUID,
    payload: MenuCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> MenuCategoryRead:
    """Update a menu category's name, description, or sort order (admin only)."""
    return await menu_service.update_category(db, category_id, payload)


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=Page[MenuItemRead],
    summary="List menu items",
)
async def list_items(
    params: PageParams = Depends(),
    category_id: uuid.UUID | None = Query(default=None),
    available: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List menu items.

    Query params:
      - page, page_size        — pagination
      - category_id            — filter by category (UUID)
      - available              — filter by availability (true/false)

    Orders: available first, then category sort order, then name.
    """
    items, total = await menu_service.list_items(
        db,
        page=params.page,
        page_size=params.page_size,
        category_id=category_id,
        available=available,
    )
    pages = (total + params.page_size - 1) // params.page_size
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": pages,
    }


@router.get(
    "/{item_id}",
    response_model=MenuItemRead,
    summary="Get a single menu item",
)
async def get_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> MenuItemRead:
    """Return one menu item, or HTTP 404 if it does not exist."""
    return await menu_service.get_item_or_404(db, item_id)


@router.post(
    "",
    response_model=MenuItemRead,
    status_code=201,
    summary="Create a menu item",
)
async def create_item(
    payload: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> MenuItemRead:
    """Create a new menu item (admin only). Validates category, name, price."""
    return await menu_service.create_item(db, payload)


@router.patch(
    "/{item_id}",
    response_model=MenuItemRead,
    summary="Update a menu item",
)
async def update_item(
    item_id: uuid.UUID,
    payload: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> MenuItemRead:
    """Update permitted fields of a menu item (admin only)."""
    return await menu_service.update_item(db, item_id, payload)


@router.patch(
    "/{item_id}/toggle",
    response_model=MenuItemRead,
    summary="Toggle menu item availability",
)
async def toggle_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> MenuItemRead:
    """Flip an item between available and unavailable (admin only)."""
    return await menu_service.toggle_availability(db, item_id)
