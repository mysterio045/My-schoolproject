"""
Notification Model
==================
Serves notifications for admin, customers, and riders (polymorphic).

The notifications table uses recipient_type + recipient_id to support
all three user types from a single table.

POLYMORPHIC RELATIONSHIP:
  recipient_type = "admin"    → recipient_id references admin_users.id
  recipient_type = "customer" → recipient_id references customers.id
  recipient_type = "rider"    → recipient_id references riders.id

  PostgreSQL cannot enforce a foreign key against multiple tables.
  Recipient validation is handled in the application/service layer.

INDEXES:
  - (recipient_type, recipient_id): Fast lookups for "show me my notifications"
  - read: Fast filtering for unread notifications
  - created_at: Chronological ordering
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, PrimaryKeyMixin
from app.models.enums import NotificationRecipientType, NotificationType


class Notification(Base, PrimaryKeyMixin):
    __tablename__ = "notifications"

    # Polymorphic recipient — validated in application logic, not DB constraints
    recipient_type: Mapped[NotificationRecipientType] = mapped_column(
        String(20), nullable=False, index=True,
    )
    # UUID of the recipient (admin_users.id, customers.id, or riders.id)
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False,
    )

    # Notification category
    type: Mapped[NotificationType] = mapped_column(
        String(30), nullable=False,
    )

    # Content
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Read status
    read: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False, index=True,
    )

    def __repr__(self) -> str:
        return f"<Notification {self.type}: {self.title}>"
