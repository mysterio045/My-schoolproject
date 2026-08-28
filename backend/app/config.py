"""
Application Configuration
=========================
Uses Pydantic Settings to load environment variables from .env files.

All configuration is centralized here. No hardcoded values in other modules.

Environment variables are loaded in this priority:
1. OS environment variables (highest priority)
2. .env file in the backend directory
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    To configure:
    1. Copy .env.example to .env
    2. Fill in your values
    3. Never commit .env to version control
    """

    # --- Database ---
    DATABASE_URL: str = Field(
        ...,
        description="Async PostgreSQL connection string. "
        "Format: postgresql+asyncpg://user:pass@host:5432/dbname",
    )

    # --- JWT Authentication ---
    JWT_SECRET_KEY: str = Field(
        ...,
        description="Secret key for signing JWT tokens. Use a long random string.",
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="Algorithm used for JWT signing.",
    )
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440,
        description="JWT token expiry in minutes. Default is 24 hours.",
    )

    # --- CORS ---
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed origins for CORS.",
    )

    # --- Restaurant Location ---
    # These will be replaced with verified Hasinah Confectionery coordinates later.
    # Stored here instead of hardcoded in dispatch logic.
    RESTAURANT_LAT: float = Field(
        default=12.2280,
        description="Restaurant latitude for distance calculations.",
    )
    RESTAURANT_LNG: float = Field(
        default=9.3471,
        description="Restaurant longitude for distance calculations.",
    )

    # --- App Settings ---
    APP_NAME: str = Field(
        default="Smart Food Ordering API",
        description="Application name shown in Swagger docs.",
    )
    APP_VERSION: str = Field(
        default="0.1.0",
        description="API version.",
    )
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode. Set to true in development.",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


# Singleton instance — import this wherever you need settings
settings = Settings()
