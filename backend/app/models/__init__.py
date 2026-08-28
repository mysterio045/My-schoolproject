"""
SQLAlchemy Models
=================
All 10 database models are imported here so Alembic can discover them.

IMPORTANT: Every model must be imported in this file for Alembic's
autogenerate to detect it. If you create a new model and forget to
import it here, Alembic will not create the corresponding table.

Models are imported in dependency order to avoid circular imports:
1. Enums (no dependencies)
2. AdminUser, Customer, Rider (no FK dependencies)
3. MenuCategory, MenuItem (MenuItem depends on MenuCategory)
4. Order, OrderItem, OrderTimeline (depend on Customer, MenuItem)
5. Delivery (depends on Order, Rider)
6. Notification (no FK dependencies — polymorphic)
"""

# Enums
from app.models.enums import (  # noqa: F401
    OrderStatus,
    DeliveryStatus,
    RiderStatus,
    CustomerStatus,
    NotificationRecipientType,
    NotificationType,
)

# Base classes
from app.models.base import Base, PrimaryKeyMixin, TimestampMixin  # noqa: F401

# Models (import order matters for dependency resolution)
from app.models.admin import AdminUser  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.rider import Rider  # noqa: F401
from app.models.menu import MenuCategory, MenuItem  # noqa: F401
from app.models.order import Order, OrderItem, OrderTimeline  # noqa: F401
from app.models.delivery import Delivery  # noqa: F401
from app.models.notification import Notification  # noqa: F401

__all__ = [
    # Enums
    "OrderStatus",
    "DeliveryStatus",
    "RiderStatus",
    "CustomerStatus",
    "NotificationRecipientType",
    "NotificationType",
    # Base
    "Base",
    # Models
    "AdminUser",
    "Customer",
    "Rider",
    "MenuCategory",
    "MenuItem",
    "Order",
    "OrderItem",
    "OrderTimeline",
    "Delivery",
    "Notification",
]
