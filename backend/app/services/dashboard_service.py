"""
Dashboard Service
=================
Aggregates statistics for the admin dashboard summary endpoint.

Route → dashboard_service → SQLAlchemy → PostgreSQL.

All counts and monetary values are computed with aggregate SQL queries against
the live database. No fabricated values, and no client/browser clocks are
involved — the "today" boundary is derived from the database clock itself
(`func.date_trunc('day', func.now())`), matching the same clock that stamps
`created_at` on every row, so there are no naive-datetime drift bugs.

`recent_orders` / `recent_notifications` are folded into the same single
payload so the dashboard needs exactly one request (no wasteful extra calls).
"""

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.enums import NotificationRecipientType, OrderStatus, RiderStatus
from app.models.notification import Notification
from app.models.order import Order
from app.models.rider import Rider
from app.schemas.dashboard import (
    DashboardRecentNotification,
    DashboardRecentOrder,
    DashboardSummary,
)

# Number of recent orders / notifications returned in the summary.
RECENT_ORDERS_LIMIT = 5
RECENT_NOTIFICATIONS_LIMIT = 5


def _scalar_int(value) -> int:
    """Coerce an aggregate result to a plain int (None -> 0)."""
    return int(value or 0)


def _scalar_decimal(value) -> Decimal:
    """Coerce an aggregate money result (None -> Decimal 0)."""
    return value if value is not None else Decimal("0.00")


async def get_dashboard_summary(db: AsyncSession, admin: AdminUser) -> DashboardSummary:
    """
    Build the full dashboard summary for the given admin.

    Args:
        db: Async database session.
        admin: The authenticated admin (used to scope recent notifications).

    Returns:
        A `DashboardSummary` populated entirely from the database.
    """

    # --- "Today" boundary using the DATABASE clock (UTC via func.now()) -----
    today_start = func.date_trunc("day", func.now())

    # --- Counts & money ------------------------------------------------------
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar_one()
    total_customers = (
        await db.execute(select(func.count()).select_from(Customer))
    ).scalar_one()

    pending_orders = (
        await db.execute(
            select(func.count())
            .select_from(Order)
            .where(Order.status == OrderStatus.PENDING)
        )
    ).scalar_one()

    orders_today = (
        await db.execute(
            select(func.count())
            .select_from(Order)
            .where(Order.created_at >= today_start)
        )
    ).scalar_one()

    # Revenue = sum of order totals for valid (non-cancelled) orders. This is
    # the single, consistent definition of revenue in the project.
    total_revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0))
            .where(Order.status != OrderStatus.CANCELLED)
        )
    ).scalar_one()

    revenue_today = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0))
            .where(
                Order.status != OrderStatus.CANCELLED,
                Order.created_at >= today_start,
            )
        )
    ).scalar_one()

    # --- Rider status counts -------------------------------------------------
    available_riders, busy_riders, offline_riders = 0, 0, 0
    rider_counts = (await db.execute(
        select(Rider.status, func.count()).group_by(Rider.status)
    )).all()
    for status, count in rider_counts:
        if status == RiderStatus.AVAILABLE:
            available_riders = count
        elif status == RiderStatus.BUSY:
            busy_riders = count
        elif status == RiderStatus.OFFLINE:
            offline_riders = count

    # --- Recent orders (with rider name via the 1:1 delivery record) ---------
    recent_rows = (await db.execute(
        select(Order, Delivery, Rider.name)
        .outerjoin(Delivery, Delivery.order_id == Order.id)
        .outerjoin(Rider, Rider.id == Delivery.rider_id)
        .order_by(Order.created_at.desc())
        .limit(RECENT_ORDERS_LIMIT)
    )).all()
    recent_orders = [
        DashboardRecentOrder(
            id=order.id,
            order_number=order.order_number,
            customer_name=order.customer_name,
            status=order.status,
            total=order.total,
            rider_name=rider_name,
            created_at=order.created_at,
        )
        for order, _delivery, rider_name in recent_rows
    ]

    # --- Recent notifications for the current admin --------------------------
    notification_rows = (await db.execute(
        select(Notification)
        .where(
            Notification.recipient_type == NotificationRecipientType.ADMIN,
            Notification.recipient_id == admin.id,
        )
        .order_by(Notification.created_at.desc())
        .limit(RECENT_NOTIFICATIONS_LIMIT)
    )).scalars().all()
    recent_notifications = [
        DashboardRecentNotification(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            created_at=n.created_at,
        )
        for n in notification_rows
    ]

    return DashboardSummary(
        total_orders=_scalar_int(total_orders),
        total_revenue=_scalar_decimal(total_revenue),
        total_customers=_scalar_int(total_customers),
        available_riders=_scalar_int(available_riders),
        busy_riders=_scalar_int(busy_riders),
        offline_riders=_scalar_int(offline_riders),
        pending_orders=_scalar_int(pending_orders),
        orders_today=_scalar_int(orders_today),
        revenue_today=_scalar_decimal(revenue_today),
        recent_orders=recent_orders,
        recent_notifications=recent_notifications,
    )
