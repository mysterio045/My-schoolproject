"""
Pydantic Schemas (Request/Response Models)
=========================================
Central exports for all schema modules.

Usage:
    from app.schemas import OrderCreate, OrderRead, DeliveryRead

Modules
-------
- common: base classes, pagination, response envelope
- admin:  admin auth + profile
- customer, rider, menu, order, delivery, notification: per-entity schemas
"""

from app.schemas.common import BaseSchema, ORMModel, Page, PageParams
from app.schemas.admin import (
    AdminCreate,
    AdminLogin,
    AdminRead,
    AdminUpdate,
    TokenResponse,
)
from app.schemas.customer import (
    CustomerCreate,
    CustomerDetailRead,
    CustomerRead,
    CustomerUpdate,
)
from app.schemas.rider import (
    RiderCreate,
    RiderDetailRead,
    RiderLocationUpdate,
    RiderRead,
    RiderUpdate,
)
from app.schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryRead,
    MenuCategoryUpdate,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
)
from app.schemas.order import (
    OrderCreate,
    OrderItemCreate,
    OrderItemRead,
    OrderRead,
    OrderStatusUpdate,
    OrderTimelineRead,
    OrderUpdate,
)
from app.schemas.delivery import (
    AssignRiderRequest,
    DeliveryCreate,
    DeliveryRead,
    DeliveryStatusUpdate,
    DeliveryWithOrderRead,
)
from app.schemas.notification import (
    NotificationCreate,
    NotificationRead,
    NotificationUpdate,
)
from app.schemas.dispatch import (
    DispatchRequest,
    DispatchResultRead,
)

__all__ = [
    "BaseSchema",
    "ORMModel",
    "Page",
    "PageParams",
    # admin
    "AdminCreate",
    "AdminLogin",
    "AdminRead",
    "AdminUpdate",
    "TokenResponse",
    # customer
    "CustomerCreate",
    "CustomerRead",
    "CustomerUpdate",
    "CustomerDetailRead",
    # rider
    "RiderCreate",
    "RiderRead",
    "RiderUpdate",
    "RiderLocationUpdate",
    "RiderDetailRead",
    # menu
    "MenuCategoryCreate",
    "MenuCategoryRead",
    "MenuCategoryUpdate",
    "MenuItemCreate",
    "MenuItemRead",
    "MenuItemUpdate",
    # order
    "OrderCreate",
    "OrderItemCreate",
    "OrderItemRead",
    "OrderRead",
    "OrderStatusUpdate",
    "OrderTimelineRead",
    "OrderUpdate",
    # delivery
    "AssignRiderRequest",
    "DeliveryCreate",
    "DeliveryRead",
    "DeliveryStatusUpdate",
    "DeliveryWithOrderRead",
    # notification
    "NotificationCreate",
    "NotificationRead",
    "NotificationUpdate",
    # dispatch
    "DispatchRequest",
    "DispatchResultRead",
]
