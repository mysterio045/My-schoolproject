"""
Notification Service
====================
Business logic for notifications (polymorphic recipients).

Route handlers stay thin — all recipient validation, creation, listing,
filtering, and read-state updates live here.

RECIPIENT VALIDATION
--------------------
The `notifications` table uses `recipient_type` + `recipient_id` to reference
admin, customer, OR rider ids. PostgreSQL cannot enforce a foreign key against
multiple tables, so existence is validated here in the application layer:
    - recipient_type = admin    → must exist in admin_users
    - recipient_type = customer → must exist in customers
    - recipient_type = rider    → must exist in riders
"""

import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.enums import NotificationRecipientType, NotificationType
from app.models.notification import Notification
from app.models.rider import Rider
from app.schemas.notification import NotificationCreate

logger = logging.getLogger(__name__)


async def _validate_recipient(
    db: AsyncSession, recipient_type: NotificationRecipientType, recipient_id: uuid.UUID
) -> None:
    """Raise HTTP 404 if the recipient does not exist, else return the object."""
    model = {
        NotificationRecipientType.ADMIN: AdminUser,
        NotificationRecipientType.CUSTOMER: Customer,
        NotificationRecipientType.RIDER: Rider,
    }.get(recipient_type)

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported recipient_type: {recipient_type}",
        )

    obj = await db.get(model, recipient_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"{recipient_type.value.capitalize()} recipient "
                f"{recipient_id} not found."
            ),
        )


async def get_notification_or_404(db: AsyncSession, notification_id: uuid.UUID) -> Notification:
    """Fetch a notification or raise HTTP 404."""
    notification = await db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    return notification


async def create_notification(
    db: AsyncSession, payload: NotificationCreate
) -> Notification:
    """
    Create a notification for a polymorphic recipient.

    Validates that the recipient actually exists before creating the row.
    """
    await _validate_recipient(db, payload.recipient_type, payload.recipient_id)

    notification = await _insert_notification(
        db,
        recipient_type=payload.recipient_type,
        recipient_id=payload.recipient_id,
        type=payload.type,
        title=payload.title,
        message=payload.message,
    )
    await publish_notification_created(notification)
    return notification


async def _insert_notification(
    db: AsyncSession,
    recipient_type: NotificationRecipientType,
    recipient_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
) -> Notification:
    """Insert a notification row in its own transaction and return it."""
    notification = Notification(
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        type=type,
        title=title.strip(),
        message=message,
        read=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def publish_notification_created(notification: Notification) -> None:
    """Broadcast a ``notification.created`` invalidation event."""
    from app.realtime import publish
    from app.realtime.events import NOTIFICATION_CREATED

    await publish(
        NOTIFICATION_CREATED,
        entity_id=notification.id,
        recipient_type=str(notification.recipient_type),
        recipient_id=str(notification.recipient_id),
    )


async def publish_notification_read(notification: Notification) -> None:
    """Broadcast a ``notification.read`` invalidation event."""
    from app.realtime import publish
    from app.realtime.events import NOTIFICATION_READ

    await publish(NOTIFICATION_READ, entity_id=notification.id)


# ---------------------------------------------------------------------------
# Automated notifications (called by domain services after a successful change)
# ---------------------------------------------------------------------------
async def notify(
    db: AsyncSession,
    recipient_type: NotificationRecipientType,
    recipient_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
) -> Notification | None:
    """
    Create an automated notification and broadcast its event.

    Best-effort by contract: callers wrap this in try/except so a notification
    failure can never roll back (or raise from) the domain change it describes.
    """
    notification = await _insert_notification(
        db,
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        type=type,
        title=title,
        message=message,
    )
    await publish_notification_created(notification)
    return notification


async def get_admin_ids(db: AsyncSession) -> list[uuid.UUID]:
    """Return every admin user id (used for admin-facing notifications)."""
    result = await db.execute(select(AdminUser.id))
    return [row.id for row in result.all()]


async def list_notifications(
    db: AsyncSession,
    recipient_type: NotificationRecipientType,
    recipient_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
) -> tuple[list[Notification], int]:
    """
    List notifications for a recipient with optional unread filter + pagination.

    Returns (notifications_for_page, total_count) ordered newest first.
    """
    base = select(Notification)
    count_stmt = select(func.count()).select_from(Notification)

    base = base.where(Notification.recipient_type == recipient_type)
    count_stmt = count_stmt.where(Notification.recipient_type == recipient_type)

    base = base.where(Notification.recipient_id == recipient_id)
    count_stmt = count_stmt.where(Notification.recipient_id == recipient_id)

    if unread_only:
        base = base.where(Notification.read == False)  # noqa: E712
        count_stmt = count_stmt.where(Notification.read == False)  # noqa: E712

    total = (await db.execute(count_stmt)).scalar_one()

    base = (
        base.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    notifications = (await db.execute(base)).scalars().all()
    return list(notifications), total


async def count_unread(db: AsyncSession, recipient_type, recipient_id) -> int:
    """Count unread notifications for a recipient."""
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.recipient_type == recipient_type,
            Notification.recipient_id == recipient_id,
            Notification.read == False,  # noqa: E712
        )
    )
    return result.scalar_one()


async def mark_notification_read(
    db: AsyncSession, notification_id: uuid.UUID, read: bool = True
) -> Notification:
    """Mark a notification as read (or unread)."""
    notification = await get_notification_or_404(db, notification_id)
    notification.read = read
    await db.commit()
    await db.refresh(notification)
    await publish_notification_read(notification)
    return notification
