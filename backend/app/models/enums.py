"""
PostgreSQL ENUM Types
=====================
All status enums used across the database.

These are created as PostgreSQL ENUM types via SQLAlchemy.
They enforce valid values at the database level.

Usage in models:
    from app.models.enums import OrderStatus

    class Order(Base):
        status: Mapped[OrderStatus] = mapped_column(
            OrderStatus, default=OrderStatus.PENDING
        )
"""

import enum


class OrderStatus(str, enum.Enum):
    """
    Order lifecycle statuses.

    An order progresses through:
        pending → confirmed → preparing → ready → completed
                                                        ↘ cancelled

    Separated from DeliveryStatus — an order can be 'completed'
    while its delivery is still 'on_the_way' if tracked separately.
    """
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DeliveryStatus(str, enum.Enum):
    """
    Delivery logistics statuses.

    A delivery progresses through:
        pending → assigned → accepted → picked_up → on_the_way → delivered
                                                                        ↘ failed

    This is independent of the order status.
    A delivery can fail while the order is re-assigned to another delivery.
    """
    PENDING = "pending"
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    PICKED_UP = "picked_up"
    ON_THE_WAY = "on_the_way"
    DELIVERED = "delivered"
    FAILED = "failed"


class RiderStatus(str, enum.Enum):
    """
    Rider availability statuses.

    - available: Ready to accept deliveries
    - busy: Currently handling one or more deliveries
    - offline: Not available for dispatch
    """
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


class CustomerStatus(str, enum.Enum):
    """
    Customer account statuses.

    - active: Customer has placed orders recently
    - inactive: Customer has not ordered in a while
    """
    ACTIVE = "active"
    INACTIVE = "inactive"


class NotificationRecipientType(str, enum.Enum):
    """
    Notification recipient types (polymorphic).

    The notifications table serves all three user types.
    recipient_id references different tables depending on this value:
        - admin → admin_users.id
        - customer → customers.id
        - rider → riders.id

    Foreign key validation happens in application logic, not at DB level,
    because PostgreSQL cannot enforce FK against multiple tables.
    """
    ADMIN = "admin"
    CUSTOMER = "customer"
    RIDER = "rider"


class NotificationType(str, enum.Enum):
    """
    Notification category types.

    Used to classify and filter notifications.
    """
    ORDER = "order"
    RIDER = "rider"
    SYSTEM = "system"
    DELIVERY = "delivery"
