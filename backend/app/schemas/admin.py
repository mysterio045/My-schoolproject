"""
Admin User Schemas
==================
Request/response models for admin authentication and profiles.

Auth flow
---------
1. Client POST /api/v1/auth/login with `AdminLogin`.
2. Server verifies credentials, returns `TokenResponse` (JWT access token).
3. Client calls authenticated endpoints with `Authorization: Bearer <token>`.

Security notes
--------------
- `AdminLogin.password` is transmitted raw but should always be sent over
  HTTPS in production.
- `AdminCreate.password` is hashed in the service layer (bcrypt) — never
  stored in plaintext.
- `AdminRead` deliberately excludes `password_hash`.
"""

import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import BaseSchema


class AdminCreate(BaseSchema):
    """Payload to register a new admin user."""

    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Reject obviously weak passwords before reaching the service layer."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AdminLogin(BaseSchema):
    """Payload for the login endpoint."""

    email: EmailStr
    password: str


class AdminRead(BaseSchema):
    """Admin profile returned to the client (never includes the hash)."""

    id: uuid.UUID
    email: EmailStr
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseSchema):
    """Returned after successful login."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token lifetime in seconds")


class AdminUpdate(BaseSchema):
    """Optional fields that can be updated by an admin about themselves."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
