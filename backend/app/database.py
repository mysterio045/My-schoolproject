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
#
# Connectivity notes (Supabase):
# - We connect through Supabase's SESSION pooler (port 5432). A session-pooled
#   connection is pinned to one backend server, so asyncpg prepared statements
#   work normally. (The TRANSACTION pooler on port 6543 would make SQLAlchemy's
#   prepared-statement names collide — DuplicatePreparedStatementError.)
# - asyncpg's statement cache is disabled as an extra safety net.
# - A generous command timeout accommodates the slow pooler network.
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,           # Log SQL queries when DEBUG=True
    pool_pre_ping=True,            # Verify connections before reuse (avoids stale connections)
    pool_size=10,                  # Maximum persistent connections in the pool
    max_overflow=20,               # Maximum extra connections beyond pool_size
    connect_args={
        "ssl": "require",  # Supabase requires SSL for external connections
        "statement_cache_size": 0,
        # Generous command timeout — the Supabase pooler can be slow to respond.
        "command_timeout": 120,
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
