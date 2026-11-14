"""Application configuration using Pydantic Settings."""
from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory (this file lives in backend/app/core/config.py)
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        # Read the project-root .env for local execution. Runtime variables take precedence.
        env_file=BACKEND_DIR.parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/veterinaria"

    # Security
    secret_key: str = "dev-secret-san-francisco-change-me"
    token_ttl_seconds: int = 7 * 24 * 60 * 60  # 7 days
    pbkdf2_iterations: int = 120_000

    # Private object storage. Local files are supported for development and older records.
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None
    initialize_db_on_start: bool = True

    # Paths
    @property
    def base_dir(self) -> Path:
        """backend/ directory."""
        return BACKEND_DIR

    @property
    def project_root(self) -> Path:
        """Repository root (parent of backend/)."""
        return BACKEND_DIR.parent

    @property
    def dataset_dir(self) -> Path:
        return self.project_root / "dataset"

    @property
    def nuevas_dir(self) -> Path:
        return self.dataset_dir / "nuevas"

    # CORS
    cors_origins: list[str] = ["*"]

    # App
    app_title: str = "API Veterinaria CNN"
    debug: bool = False


settings = Settings()