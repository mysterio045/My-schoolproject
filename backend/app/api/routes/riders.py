"""
Rider Routes
============
Rider CRUD + availability/status endpoints. All require admin authentication
(consistent with the Phase 4A/4B authorization design — there is no rider token
scope yet).

Endpoints:
    GET   /api/riders                    — list riders (filter/search/paginate) (auth)
    GET   /api/riders/{rider_id}         — get one rider + delivery history (auth)
    POST  /api/riders                    — create rider (auth)
    PATCH /api/riders/{rider_id}         — update rider (incl. status) (auth)
    PATCH /api/riders/{rider_id}/status  — set rider availability/online status (auth)

Routes are thin — all business logic lives in `app.services.rider_service`.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.models.enums import RiderStatus
from app.schemas.common import Page, PageParams, BaseSchema
from app.schemas.rider import RiderCreate, RiderDetailRead, RiderRead, RiderUpdate
from app.services import rider_service

router = APIRouter(prefix="/api/riders", tags=["Riders"])


class RiderStatusUpdate(BaseSchema):
    """Payload to set a rider's availability/online status."""

    status: RiderStatus


@router.get(
    "",
    response_model=Page[RiderRead],
    summary="List riders",
)
async def list_riders(
    params: PageParams = Depends(),
    status_filter: RiderStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, description="Search by name, phone, or email"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """List riders with optional status filter, search, and pagination."""
    riders, total = await rider_service.list_riders(
        db,
        page=params.page,
        page_size=params.page_size,
        status_filter=status_filter.value if status_filter else None,
        search=search,
    )
    pages = (total + params.page_size - 1) // params.page_size
    return {
        "items": riders,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": pages,
    }


@router.get(
    "/{rider_id}",
    response_model=RiderDetailRead,
    summary="Get a rider with their delivery history",
)
async def get_rider(
    rider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> RiderDetailRead:
    """Return a single rider including delivery history, or HTTP 404."""
    return await rider_service.get_rider_detail(db, rider_id)


@router.post(
    "",
    response_model=RiderRead,
    status_code=201,
    summary="Create a rider",
)
async def create_rider(
    payload: RiderCreate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> RiderRead:
    """Create a new rider (admin only). Validates email uniqueness."""
    return await rider_service.create_rider(db, payload)


@router.patch(
    "/{rider_id}",
    response_model=RiderRead,
    summary="Update a rider",
)
async def update_rider(
    rider_id: uuid.UUID,
    payload: RiderUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> RiderRead:
    """Update permitted fields (including status) of a rider (admin only)."""
    return await rider_service.update_rider(db, rider_id, payload)


@router.patch(
    "/{rider_id}/status",
    response_model=RiderRead,
    summary="Set a rider's availability/online status",
)
async def update_rider_status(
    rider_id: uuid.UUID,
    payload: RiderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> RiderRead:
    """Set a rider's status to available/busy/offline (admin only)."""
    return await rider_service.update_rider_status(db, rider_id, payload.status)
