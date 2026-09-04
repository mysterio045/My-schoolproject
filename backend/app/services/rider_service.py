"""
Rider Service
=============
Business logic for delivery riders: CRUD, listing, detail, and status changes.

Route handlers stay thin — all uniqueness checks, status defaults, delivery
history loading, and validation live here.

RIDER STATUS
------------
The `riders.status` column uses the RiderStatus enum:
    available / busy / offline

There is no separate boolean "active/inactive" column on the Rider model.
"Active" vs "inactive" is expressed through `status`: a rider is considered
active while `available`, busy handling a delivery while `busy`, and
effectively inactive / not dispatchable while `offline`. This reuses the
existing model/schema rather than introducing a new column.

DELIVERY HISTORY
----------------
The Rider model has a `deliveries` relationship. The detail endpoint eager-loads
that history (newest first) so the client can see each delivery a rider has
been involved in, without an N+1 query.
"""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.delivery import Delivery
from app.models.rider import Rider
from app.schemas.rider import RiderCreate, RiderUpdate


# ---------------------------------------------------------------------------
# Repos / queries
# ---------------------------------------------------------------------------
async def get_rider_or_404(db: AsyncSession, rider_id: uuid.UUID) -> Rider:
    """Fetch a rider or raise HTTP 404."""
    rider = await db.get(Rider, rider_id)
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider not found.",
        )
    return rider


def _detail_load_options():
    """Eager-load a rider's delivery history for the detail view."""
    return (selectinload(Rider.deliveries),)


# ---------------------------------------------------------------------------
# Create / Read
# ---------------------------------------------------------------------------
async def list_riders(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
) -> tuple[list[Rider], int]:
    """
    List riders with optional status filter, name/phone/email search, and
    pagination. Returns (riders_for_page, total_count) ordered by name.
    """
    base = select(Rider)
    count_stmt = select(func.count()).select_from(Rider)

    if status_filter is not None:
        base = base.where(Rider.status == status_filter)
        count_stmt = count_stmt.where(Rider.status == status_filter)

    if search:
        like = f"%{search.strip()}%"
        from sqlalchemy import or_

        cond = or_(
            Rider.name.ilike(like),
            Rider.phone.ilike(like),
            Rider.email.ilike(like),
        )
        base = base.where(cond)
        count_stmt = count_stmt.where(cond)

    total = (await db.execute(count_stmt)).scalar_one()

    base = (
        base.order_by(Rider.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    riders = (await db.execute(base)).scalars().all()
    return list(riders), total


async def get_rider_detail(db: AsyncSession, rider_id: uuid.UUID) -> Rider:
    """
    Fetch a single rider including their delivery history.

    Deliveries are loaded newest-first via `selectinload`, avoiding N+1 and
    lazy-load issues on the async session.
    """
    result = await db.execute(
        select(Rider)
        .options(*_detail_load_options())
        .where(Rider.id == rider_id)
    )
    rider = result.scalar_one_or_none()
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider not found.",
        )
    rider.deliveries = sorted(
        rider.deliveries, key=lambda d: d.created_at, reverse=True
    )
    return rider


async def create_rider(db: AsyncSession, payload: RiderCreate) -> Rider:
    """Create a new rider after validating email uniqueness."""
    if payload.email is not None:
        email = payload.email.strip().lower()
        clash = (
            await db.execute(
                select(Rider).where(Rider.email == email)
            )
        ).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A rider with this email already exists.",
            )
    else:
        email = None

    joined_at = payload.joined_at if payload.joined_at is not None else date.today()

    rider = Rider(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=email,
        lat=payload.lat,
        lng=payload.lng,
        location_address=payload.location_address,
        joined_at=joined_at,
        avatar=payload.avatar,
    )
    db.add(rider)
    await db.commit()
    await db.refresh(rider)
    return rider


# ---------------------------------------------------------------------------
# Update / status
# ---------------------------------------------------------------------------
async def update_rider(db: AsyncSession, rider_id: uuid.UUID, payload: RiderUpdate) -> Rider:
    """Update permitted fields of a rider (including status/availability)."""
    rider = await get_rider_or_404(db, rider_id)

    data = payload.model_dump(exclude_unset=True)

    # Enforce email uniqueness when changing it.
    new_email = data.get("email")
    if new_email is not None:
        email = str(new_email).strip().lower()
        clash = (
            await db.execute(
                select(Rider).where(Rider.email == email, Rider.id != rider_id)
            )
        ).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A rider with this email already exists.",
            )
        data["email"] = email

    for field, value in data.items():
        if field == "name" and value is not None:
            value = value.strip()
        if field == "phone" and value is not None:
            value = value.strip()
        setattr(rider, field, value)

    await db.commit()
    await db.refresh(rider)
    return rider


async def update_rider_status(
    db: AsyncSession, rider_id: uuid.UUID, new_status
) -> Rider:
    """Set a rider's availability/online status (RiderStatus enum)."""
    rider = await get_rider_or_404(db, rider_id)
    rider.status = new_status
    await db.commit()
    await db.refresh(rider)
    return rider
