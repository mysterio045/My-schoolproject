"""
Auth Routes
===========
Public + authenticated endpoints for admin authentication.

Endpoints:
    POST /api/auth/register  (public)  — create a new admin account
    POST /api/auth/login     (public)  — authenticate and get a JWT
    GET  /api/auth/me        (auth)    — return the current admin profile

Routes are thin: all business logic lives in `app.services.auth_service`.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.config import settings
from app.models.admin import AdminUser
from app.schemas.admin import AdminCreate, AdminLogin, AdminRead, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new admin user",
)
async def register(
    payload: AdminCreate,
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """Create a new admin account. Returns the profile (never the password hash)."""
    return await auth_service.register_admin(db, payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive an access token",
)
async def login(
    payload: AdminLogin,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Verify credentials and return a JWT access token."""
    admin, token = await auth_service.login_admin(
        db, payload.email, payload.password
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get(
    "/me",
    response_model=AdminRead,
    summary="Get the current admin profile",
)
async def get_me(
    current_user: AdminUser = Depends(get_current_user),
) -> AdminUser:
    """Return the authenticated admin's profile."""
    return current_user
