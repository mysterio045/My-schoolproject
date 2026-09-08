"""
Rider Auth Service
==================
Business logic for rider authentication (register, login, profile, availability).

Routes stay thin — all password hashing, JWT creation, uniqueness checks,
and database queries live here.

Flow:
    rider auth route
        ↓
    rider auth service
        ↓
    riders table
"""

import uuid
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RiderStatus
from app.models.rider import Rider
from app.schemas.rider import RiderAvailabilityUpdate, RiderRegister
from app.services.security import (
    create_access_token,
    hash_password,
    verify_password,
)


def _credential_error(detail: str = "Invalid email or password") -> HTTPException:
    """Uniform 401 for failed authentication."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_rider_by_email(db: AsyncSession, email: str) -> Rider | None:
    """Fetch a rider by email (case-insensitive lookup)."""
    result = await db.execute(
        select(Rider).where(Rider.email == email.strip().lower())
    )
    return result.scalar_one_or_none()


async def get_rider_by_id(db: AsyncSession, rider_id: uuid.UUID) -> Rider | None:
    """Fetch a rider by primary key."""
    return await db.get(Rider, rider_id)


async def register_rider(db: AsyncSession, payload: RiderRegister) -> Rider:
    """
    Register a new rider account.

    - Normalizes/lowercases the email.
    - Rejects duplicate emails with HTTP 409.
    - Hashes the password with bcrypt before saving.
    - Sets initial status to offline.

    Raises:
        HTTPException 409: If a rider with that email already exists.
    """
    email = payload.email.strip().lower()

    existing = await get_rider_by_email(db, email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A rider with this email already exists.",
        )

    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    full_name = f"{first_name} {last_name}"

    rider = Rider(
        first_name=first_name,
        last_name=last_name,
        name=full_name,
        email=email,
        password_hash=hash_password(payload.password),
        phone=payload.phone.strip(),
        vehicle_type=payload.vehicle_type,
        vehicle_plate_number=payload.vehicle_plate_number,
        status=RiderStatus.OFFLINE,
        joined_at=date.today(),
    )
    db.add(rider)
    await db.commit()
    await db.refresh(rider)
    return rider


async def login_rider(db: AsyncSession, email: str, password: str) -> tuple[Rider, str]:
    """
    Authenticate a rider and issue a JWT access token.

    Returns:
        (rider, access_token)

    Raises:
        HTTPException 401: If the rider does not exist or password is wrong.
    """
    rider = await get_rider_by_email(db, email)
    if rider is None:
        raise _credential_error()

    if not verify_password(password, rider.password_hash):
        raise _credential_error()

    token = create_access_token(subject=str(rider.id), email=rider.email)
    return rider, token


async def get_rider_profile(db: AsyncSession, rider_id: uuid.UUID) -> Rider:
    """
    Get rider profile by ID.

    Raises:
        HTTPException 404: If the rider does not exist.
    """
    rider = await get_rider_by_id(db, rider_id)
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider not found.",
        )
    return rider


async def update_rider_availability(
    db: AsyncSession,
    rider_id: uuid.UUID,
    payload: RiderAvailabilityUpdate,
) -> Rider:
    """
    Update rider availability status.

    Raises:
        HTTPException 404: If the rider does not exist.
    """
    rider = await get_rider_by_id(db, rider_id)
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider not found.",
        )

    rider.status = payload.status
    await db.commit()
    await db.refresh(rider)
    return rider
