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

# HTTP Bearer scheme — extracts JWT token from Authorization header
# This enables the "Authorize" button in Swagger UI
security_scheme = HTTPBearer()


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
) -> dict:
    """
    Validates the JWT token and returns the current admin user's payload.

    This is a placeholder that will be fully implemented in Phase 5 (Auth).
    For now, it decodes the token and returns the payload dict.

    Token payload structure:
        {
            "sub": "<user_id>",
            "email": "<user_email>",
            "exp": <expiry_timestamp>
        }

    Raises:
        HTTPException 401: If token is missing, invalid, or expired.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
