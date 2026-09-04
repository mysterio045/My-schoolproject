"""
Shared API Dependencies
========================
Reusable FastAPI dependencies for route handlers.

Dependencies are functions that run before route handlers and provide
common functionality like database access and authentication.

Usage in routes:
    from app.api.deps import get_db, get_current_user

    @router.get("/orders")
    async def list_orders(
        db: AsyncSession = Depends(get_db),
        current_user = Depends(get_current_user),
    ):
        ...
"""

from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.admin import AdminUser

# HTTP Bearer scheme — extracts JWT token from Authorization header
# This enables the "Authorize" button in Swagger UI.
# auto_error=False so a MISSING header is handled by get_current_user (returning
# 401) instead of HTTPBearer short-circuiting with a 403.
security_scheme = HTTPBearer(auto_error=False)


# =============================================================================
# Database Session Dependency
# =============================================================================
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an async database session for each request.

    The session is automatically committed on success,
    rolled back on error, and closed in all cases.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# =============================================================================
# Authentication Dependency
# =============================================================================
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """
    Validates the JWT token and returns the authenticated admin.

    Steps:
      1. Decode + validate the JWT from the Authorization header.
      2. Load the admin from the admin_users table using the token's `sub`.
      3. Return the admin, or raise HTTP 401 if missing/inactive.

    Args:
        credentials: The bearer token from the Authorization header.
        db: An async database session (so we can load the admin row).

    Raises:
        HTTPException 401: Token missing, invalid, expired, or the admin
            does not exist / is inactive.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    import uuid

    try:
        admin_id = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: malformed subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin = await db.get(AdminUser, admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists or is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return admin
