"""
Rider Auth Routes
=================
Public + authenticated endpoints for rider authentication.

Endpoints:
    POST /api/riders/auth/register  (public)  — create a new rider account
    POST /api/riders/auth/login     (public)  — authenticate and get a JWT
    GET  /api/riders/auth/me        (auth)    — return the current rider profile
    PATCH /api/riders/auth/me/availability (auth) — update rider availability

Routes are thin: all business logic lives in `app.services.rider_auth_service`.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_rider, get_db
from app.config import settings
from app.models.rider import Rider
from app.schemas.rider import (
    RiderAvailabilityUpdate,
    RiderLogin,
    RiderRead,
    RiderRegister,
    RiderTokenResponse,
)
from app.services import rider_auth_service

router = APIRouter(prefix="/api/riders/auth", tags=["Rider Authentication"])


@router.post(
    "/register",
    response_model=RiderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new rider account",
)
async def register(
    payload: RiderRegister,
    db: AsyncSession = Depends(get_db),
) -> Rider:
    """Create a new rider account. Returns the profile (never the password hash)."""
    return await rider_auth_service.register_rider(db, payload)


@router.post(
    "/login",
    response_model=RiderTokenResponse,
    summary="Authenticate and receive an access token",
)
async def login(
    payload: RiderLogin,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Verify credentials and return a JWT access token."""
    rider, token = await rider_auth_service.login_rider(
        db, payload.email, payload.password
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get(
    "/me",
    response_model=RiderRead,
    summary="Get the current rider profile",
)
async def get_me(
    current_rider: Rider = Depends(get_current_rider),
) -> Rider:
    """Return the authenticated rider's profile."""
    return current_rider


@router.patch(
    "/me/availability",
    response_model=RiderRead,
    summary="Update rider availability status",
)
async def update_availability(
    payload: RiderAvailabilityUpdate,
    current_rider: Rider = Depends(get_current_rider),
    db: AsyncSession = Depends(get_db),
) -> Rider:
    """Update the rider's availability status (available/busy/offline)."""
    return await rider_auth_service.update_rider_availability(
        db, current_rider.id, payload
    )
