from functools import lru_cache

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_name: str = "Project Re-Paint API"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/vrr",
        validation_alias=AliasChoices("DATABASE_URL", "DATABAASE_URL"),
    )

    @model_validator(mode="after")
    def coerce_database_url_for_asyncpg(self) -> "Settings":
        u = self.database_url
        if u.startswith("postgresql+asyncpg://"):
            return self
        if u.startswith("postgres://"):
            self.database_url = u.replace("postgres://", "postgresql+asyncpg://", 1)
        elif u.startswith("postgresql://"):
            self.database_url = u.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self

    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24 * 30

    backend_cors_origins: str = "http://localhost:3000"

    admin_bootstrap_token: str = ""

    rate_limit_public_post: str = "60/minute"

    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_bucket_name: str | None = None
    s3_public_base_url: str | None = None

    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    hcaptcha_secret: str | None = None
    email_domain_blocklist: str = ""

    gofundme_url: str | None = None
    use_stripe_donations: bool = False

    cron_secret: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def blocked_email_domains(self) -> set[str]:
        return {d.strip().lower() for d in self.email_domain_blocklist.split(",") if d.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
