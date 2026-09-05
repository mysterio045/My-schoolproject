"""
Dashboard Schemas
=================
Response models for the admin dashboard summary endpoint.

The summary is a single aggregate payload so the frontend can render the whole
dashboard (stat cards, recent orders, recent notifications) in one round trip
instead of issuing many separate requests.

All values are computed from PostgreSQL by `app.services.dashboard_service`;
nothing here is fabricated.

Money
-----
`total_revenue` and `revenue_today` are `Decimal` (nested totals on recent
orders too) serialized as JSON numbers through `BaseSchema`.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from app.schemas.common import BaseSchema


class DashboardRecentOrder(BaseSchema):
    """
    A compact row for the dashboard's recent-orders table.

    Only the fields the dashboard table needs are exposed; the full order
    payload stays available via the orders API.
    """

    id: uuid.UUID
    order_number: str
    customer_name: str
    status: str
    total: Decimal
    rider_name: str | None
    created_at: datetime


class DashboardRecentNotification(BaseSchema):
    """A compact row for the dashboard's recent-activity/notification list."""

    id: uuid.UUID
    type: str
    title: str
    message: str
    created_at: datetime


class DashboardSummary(BaseSchema):
    """
    The full admin dashboard summary.

    Stat counts are computed with SQL aggregate queries; "today" is the current
    calendar day according to the database clock (see the service).
    """

    # Counts / money
    total_orders: int
    total_revenue: Decimal
    total_customers: int
    available_riders: int
    busy_riders: int
    offline_riders: int
    pending_orders: int
    orders_today: int
    revenue_today: Decimal

    # Recent rows
    recent_orders: list[DashboardRecentOrder] = []
    recent_notifications: list[DashboardRecentNotification] = []
