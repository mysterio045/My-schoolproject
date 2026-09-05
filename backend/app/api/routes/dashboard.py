"""
Dashboard Routes
================
Admin dashboard summary endpoint. Requires admin authentication (same as every
other API route). Thin wrapper — all aggregation lives in the dashboard service.

Endpoints:
    GET /api/dashboard/summary — aggregate stats + recent orders/notifications (auth)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.admin import AdminUser
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Admin dashboard summary",
)
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_user),
) -> DashboardSummary:
    """Return aggregated dashboard stats and recent activity for the admin."""
    return await dashboard_service.get_dashboard_summary(db, current_admin)
