"""
Dispatch Routes
================
Endpoints for the Smart Rider Dispatch Engine. All require admin authentication
(consistent with the existing authorization design).

Endpoints:
    POST /api/dispatch/nearest-rider  — assign nearest eligible rider (auth)
    POST /api/dispatch/assign         — alias for the same dispatch operation (auth)

Both endpoints call the SAME centralized service function
(`dispatch_service.assign_nearest_rider`) so assignment logic is never
duplicated. `assign` is provided as an explicit-name convenience alias.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.schemas.common import BaseSchema
from app.schemas.dispatch import DispatchResultRead
from app.services import dispatch_service

router = APIRouter(prefix="/api/dispatch", tags=["Dispatch"])


class DispatchBody(BaseSchema):
    """JSON body carrying the order id to dispatch."""

    order_id: uuid.UUID


async def _run_dispatch(
    body: DispatchBody,
    db: AsyncSession,
) -> dict:
    """Shared handler backing both dispatch endpoints."""
    result = await dispatch_service.assign_nearest_rider(db, body.order_id)
    return {
        "delivery": result["delivery"],
        "rider": result["rider"],
        "distance_km": result["distance_km"],
        "message": result["message"],
    }


@router.post(
    "/nearest-rider",
    response_model=DispatchResultRead,
    summary="Assign the nearest available rider to a ready order",
)
async def dispatch_nearest_rider(
    body: DispatchBody,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """Dispatch the nearest eligible available rider to the given order."""
    return await _run_dispatch(body, db)


@router.post(
    "/assign",
    response_model=DispatchResultRead,
    summary="Assign the nearest available rider (explicit alias)",
)
async def dispatch_assign(
    body: DispatchBody,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """Explicit alias for `nearest-rider` — same centralized assignment."""
    return await _run_dispatch(body, db)
