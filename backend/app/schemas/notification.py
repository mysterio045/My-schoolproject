"""
Notification Schemas
====================
Request/response models for notifications.

Notifications are polymorphic: a single `notifications` table serves admins,
customers, and riders via `recipient_type` + `recipient_id`.

Validation
----------
PostgreSQL cannot enforce a foreign key against multiple tables, so recipient
existence is validated in the application/service layer:
  - recipient_type = "admin"    → recipient_id must exist in admin_users
  - recipient_type = "customer" → recipient_id must exist in customers
  - recipient_type = "rider"    → recipient_id must exist in riders
"""

import uuid
from datetime import datetime

from app.schemas.common import BaseSchema
from app.models.enums import NotificationRecipientType, NotificationType


class NotificationCreate(BaseSchema):
    """
    Payload to create a notification.

    Normally created by the service layer (e.g. "order confirmed", "rider
    assigned") rather than directly by clients, but exposed for completeness.
    """

    recipient_type: NotificationRecipientType
    recipient_id: uuid.UUID
    type: NotificationType
    title: str
    message: str


class NotificationUpdate(BaseSchema):
    """Fields that can be updated (primarily marking as read)."""

    read: bool | None = None


class NotificationRead(BaseSchema):
    """Notification as returned to the client."""

    id: uuid.UUID
    recipient_type: NotificationRecipientType
    recipient_id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    read: bool
    created_at: datetime
