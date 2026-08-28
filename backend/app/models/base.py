"""
Shared Model Utilities
======================
Reusable base class and column types for all SQLAlchemy models.

Provides:
- Base: Declarative base class for all models
- TimestampMixin: Adds created_at / updated_at columns
- PrimaryKeyMixin: Adds UUID primary key with PostgreSQL gen_random_uuid()
"""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.

    All 10 tables inherit from this class.
    Alembic discovers models by importing the models/__init__.py
    which imports all model classes that inherit from this Base.
    """
    pass


class TimestampMixin:
    """
    Adds created_at and updated_at columns to any model.

    Usage:
        class MyModel(Base, TimestampMixin):
            __tablename__ = "my_model"
            ...
    """
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class PrimaryKeyMixin:
    """
    Adds a UUID primary key column named 'id'.

    Uses PostgreSQL's gen_random_uuid() for server-side UUID generation.
    """
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
