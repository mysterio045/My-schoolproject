"""
Async Database Setup
====================
Configures SQLAlchemy 2.0 async engine and session for PostgreSQL via asyncpg.

Key components:
- engine: AsyncEngine that manages connection pool to PostgreSQL
- async_session_factory: Creates async database sessions
- Base: Declarative base class for all ORM models
- get_db: FastAPI dependency that yields a database session

Usage:
    from app.database import get_db, engine, Base
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# =============================================================================
# Async Engine
# =============================================================================
# create_async_engine creates a connection pool to PostgreSQL using asyncpg.
# The engine manages connections automatically — you don't open/close connections manually.
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,           # Log SQL queries when DEBUG=True
    pool_pre_ping=True,            # Verify connections before using them (prevents stale connections)
    pool_size=10,                  # Maximum persistent connections in the pool
    max_overflow=20,               # Maximum extra connections beyond pool_size
    connect_args={
        "ssl": "require",  # Supabase requires SSL for external connections
        # Supabase uses pgbouncer in transaction mode, which does not support
        # asyncpg prepared statements. Disabling the statement cache avoids
        # intermittent "DuplicatePreparedStatementError" errors at runtime.
        "statement_cache_size": 0,
    },
)


# =============================================================================
# Async Session Factory
# =============================================================================
# Each session represents a single database transaction.
# Sessions are created per-request via the get_db dependency.
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,        # Don't expire objects after commit (avoids lazy-load errors)
)


# =============================================================================
# Base Class for ORM Models
# =============================================================================
# All SQLAlchemy models inherit from this class.
# Example:
#   class Customer(Base):
#       __tablename__ = "customers"
#       id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
class Base(DeclarativeBase):
    pass


# =============================================================================
# Database Session Dependency
# =============================================================================
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.

    Usage in route handlers:
        @router.get("/orders")
        async def list_orders(db: AsyncSession = Depends(get_db)):
            ...

    The session is automatically closed after the request completes.
    If the request raises an exception, the transaction is rolled back.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
