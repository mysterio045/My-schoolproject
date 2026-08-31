"""
Auth Service
============
Business logic for admin authentication (register, login, profile).

Routes stay thin — all password hashing, JWT creation, uniqueness checks,
and database queries live here.

Flow:
    auth route
        ↓
    auth service
        ↓
    admin_users table
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import AdminUser
from app.schemas.admin import AdminCreate
from app.services.security import (
    create_access_token,
    hash_password,
    verify_password,
)


def _credential_error(detail: str = "Invalid email or password") -> HTTPException:
    """Uniform 401 for failed authentication (don't reveal which field was wrong)."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_admin_by_email(db: AsyncSession, email: str) -> AdminUser | None:
    """Fetch an admin by email (case-insensitive lookup, lowercased)."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == email.strip().lower())
    )
    return result.scalar_one_or_none()


async def get_admin_by_id(db: AsyncSession, admin_id: uuid.UUID) -> AdminUser | None:
    """Fetch an admin by primary key."""
    return await db.get(AdminUser, admin_id)


async def register_admin(db: AsyncSession, payload: AdminCreate) -> AdminUser:
    """
    Register a new admin user.

    - Normalizes/lowercases the email.
    - Rejects duplicate emails (case-insensitive) with HTTP 409.
    - Hashes the password with bcrypt before saving.

    Raises:
        HTTPException 409: If an admin with that email already exists.
    """
    email = payload.email.strip().lower()

    existing = await get_admin_by_email(db, email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An admin with this email already exists.",
        )

    admin = AdminUser(
        email=email,
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


async def login_admin(db: AsyncSession, email: str, password: str) -> tuple[AdminUser, str]:
    """
    Authenticate an admin and issue a JWT access token.

    Returns:
        (admin, access_token)

    Raises:
        HTTPException 401: If the admin does not exist, is inactive,
            or the password is wrong.
    """
    admin = await get_admin_by_email(db, email)
    if admin is None:
        raise _credential_error()

    if not admin.is_active:
        raise _credential_error("This account is inactive.")

    if not verify_password(password, admin.password_hash):
        raise _credential_error()

    token = create_access_token(subject=str(admin.id), email=admin.email)
    return admin, token
