"""
Smart Food Ordering & Rider Dispatch API
=========================================
FastAPI application entry point.

This module:
- Creates the FastAPI application instance
- Configures CORS for frontend access
- Registers API route modules
- Sets up Swagger/OpenAPI documentation
- Provides the health check endpoint

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Swagger UI:
    http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import (
    auth,
    customers,
    menu,
    orders,
    deliveries,
    riders,
    notifications,
    dispatch,
)


# =============================================================================
# Application Lifespan
# =============================================================================
# The lifespan context manager handles startup/shutdown events.
# Currently only logs startup. Database connection pool is created automatically
# by the engine when the first query is made.
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Debug mode: {settings.DEBUG}")
    yield
    print("Shutting down...")


# =============================================================================
# FastAPI Application
# =============================================================================
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Backend API for Smart Food Ordering and Rider Dispatch System.\n\n"
        "Manages restaurant operations including orders, menu, riders, "
        "deliveries, dispatch, analytics, and notifications."
    ),
    docs_url="/docs",         # Swagger UI
    redoc_url="/redoc",       # ReDoc alternative docs
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# =============================================================================
# CORS Configuration
# =============================================================================
# Allows the Next.js frontend (running on a different port) to access the API.
# In production, the frontend and API may share the same domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,   # e.g. ["http://localhost:3000"]
    allow_credentials=True,                      # Allow cookies/auth headers
    allow_methods=["*"],                         # Allow all HTTP methods
    allow_headers=["*"],                         # Allow all headers
)


# =============================================================================
# Health Check Endpoint
# =============================================================================
# Used by monitoring, load balancers, and frontend to verify the API is running.
@app.get(
    "/health",
    tags=["Health"],
    summary="Health check endpoint",
    description="Returns API status. Use this to verify the server is running.",
)
async def health_check():
    """
    Health check endpoint.

    Returns:
        {"status": "ok"}
    """
    return {"status": "ok"}


# =============================================================================
# API Route Registration
# =============================================================================
# Routers under app/api/routes (auth, menu, customers, orders, deliveries,
# riders, notifications, dispatch) are registered here. analytics/real-time
# come in later phases.
app.include_router(auth.router)
app.include_router(menu.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(deliveries.router)
app.include_router(riders.router)
app.include_router(notifications.router)
app.include_router(dispatch.router)
