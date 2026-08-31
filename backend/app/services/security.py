"""
Security Service (JWT + Password Hashing)
=========================================
Low-level helpers for authentication: creating/verifying JWTs and
hashing/verifying passwords.

This module intentionally has NO business logic and NO database access.
It is the shared building block used by the auth service.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# passlib context — uses bcrypt by default. Configured for lazy loading.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =============================================================================
# Password hashing
# =============================================================================
def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Returns a self-contained hash string (includes the salt and algorithm),
    e.g. `$2b$12$....` that can be stored directly in the database.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Compare a plaintext password against a stored bcrypt hash.

    Returns True if they match, False otherwise.
    """
    return pwd_context.verify(plain_password, password_hash)


# =============================================================================
# JWT creation / validation
# =============================================================================
def create_access_token(
    subject: str,
    email: str,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: The admin user's ID (stored in the token's `sub` claim).
        email:   The admin user's email (stored in the token's `email` claim).
        expires_delta: Optional custom lifetime. Defaults to the configured
            JWT_ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        A JWT string (already signed with the configured secret key).
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload: dict[str, Any] = {
        "sub": str(subject),
        "email": email,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Args:
        token: The JWT string from the Authorization header.

    Returns:
        The decoded payload dict (contains the `sub`, `email`, `exp` claims).

    Raises:
        JWTError: If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
