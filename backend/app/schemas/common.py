"""
Shared Pydantic Base Schemas
============================
Reusable base configuration and support types shared by all schema modules.

What this provides
------------------
- `BaseSchema` / `ORMModel`: Base classes that turn on Pydantic v2's
  `from_attributes` mode, so response schemas can be built directly from
  SQLAlchemy ORM objects (e.g. `OrderRead.model_validate(db_order)`).
- `PageParams`: Query parameters used for list endpoints (pagination).
- `Page` / `PageData`: A consistent paginated response envelope so the
  frontend always receives `{ items: [...], total, page, page_size, pages }`.
- Re-exported field types for convenience.

Money note
----------
Pydantic v2 serializes Python `Decimal` to `str` by default to preserve
precision. For API clients we instead want a JSON number, so `Money` is a
`Decimal` field configured with `json_encoders` via the base model to emit a
float. Keep all money as `Decimal` in the service layer; the schema layer is
the only place it becomes a float for display.
"""

from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    """
    Base class for all request/response schemas.

    Attributes set here:
      - `from_attributes=True`: allows `Model.model_validate(orm_object)`.
      - `json_encoders={Decimal: float}`: emits money as JSON numbers
        (Pydantic v2 serializes Decimal to str by default; we convert to
        float so API clients receive a JSON number for money fields).
    """

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: float},
    )


# Human-friendly alias used by response models to keep code readable.
ORMModel = BaseSchema


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------
class PageParams(BaseModel):
    """
    Query parameters accepted by list endpoints.

    Example: ?page=1&page_size=20
    """

    page: int = Field(default=1, ge=1, description="1-based page number")
    page_size: int = Field(
        default=20, ge=1, le=100, description="Number of records per page"
    )


class Page(BaseModel, Generic[T]):
    """
    Paginated response envelope.

    shape: { items: [...], total: int, page: int, page_size: int, pages: int }
    """

    items: list[T]
    total: int = Field(description="Total number of records across all pages")
    page: int
    page_size: int
    pages: int = Field(description="Total number of pages")
