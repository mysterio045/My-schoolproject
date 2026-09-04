"""
Notification Routes
====================
Endpoints for polymorphic notifications (admin, customer, rider recipients).
All require admin authentication (consistent with the existing authorization
design). Callers specify the recipient_type + recipient_id explicitly to list
or create notifications for a given recipient.

Endpoints:
    GET   /api/notifications                 — list notifications for a recipient (auth)
    GET   /api/notifications/unread-count    — count unread for a recipient (auth)
    GET   /api/notifications/{notification_id}        — get one notification (auth)
    POST  /api/notifications                 — create a notification (auth)
    PATCH /api/notifications/{notification_id}/read   — mark as read/unread (auth)

Routes are thin — all business logic lives in `app.services.notification_service`.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.models.enums import NotificationRecipientType
from app.schemas.common import Page, PageParams, BaseSchema
from app.schemas.notification import NotificationCreate, NotificationRead, NotificationUpdate
from app.services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=Page[NotificationRead],
    summary="List notifications for a recipient",
)
async def list_notifications(
    params: PageParams = Depends(),
    recipient_type: NotificationRecipientType = Query(description="admin | customer | rider"),
    recipient_id: uuid.UUID = Query(description="UUID of the recipient"),
    unread_only: bool = Query(default=False, description="Only return unread notifications"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """List notifications for a recipient with optional unread filter."""
    notifications, total = await notification_service.list_notifications(
        db,
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        page=params.page,
        page_size=params.page_size,
        unread_only=unread_only,
    )
    pages = (total + params.page_size - 1) // params.page_size
    return {
        "items": notifications,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": pages,
    }


@router.get(
    "/unread-count",
    response_model=dict,
    summary="Count unread notifications for a recipient",
)
async def count_unread(
    recipient_type: NotificationRecipientType = Query(description="admin | customer | rider"),
    recipient_id: uuid.UUID = Query(description="UUID of the recipient"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> dict:
    """Return the number of unread notifications for a recipient."""
    count = await notification_service.count_unread(db, recipient_type, recipient_id)
    return {"count": count}


@router.get(
    "/{notification_id}",
    response_model=NotificationRead,
    summary="Get a single notification",
)
async def get_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> NotificationRead:
    """Return one notification, or HTTP 404 if it does not exist."""
    return await notification_service.get_notification_or_404(db, notification_id)


@router.post(
    "",
    response_model=NotificationRead,
    status_code=201,
    summary="Create a notification",
)
async def create_notification(
    payload: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> NotificationRead:
    """Create a notification for a polymorphic recipient (admin only)."""
    return await notification_service.create_notification(db, payload)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationRead,
    summary="Mark a notification as read (or unread)",
)
async def mark_read(
    notification_id: uuid.UUID,
    payload: NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
) -> NotificationRead:
    """Mark a notification read/unread via the `read` boolean (admin only)."""
    data = payload.model_dump(exclude_unset=True)
    read = data.get("read", True)
    return await notification_service.mark_notification_read(
        db, notification_id, read=bool(read)
    )
