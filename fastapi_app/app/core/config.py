import json
import warnings
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FastAPI App"
    environment: str = "local"
    api_prefix: str = "/api/v1"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    whatsapp_simulation_mode: bool = False
    whatsapp_webhook_verify_token: str = "change-me"
    whatsapp_app_secret: str = ""  # Meta app secret for X-Hub-Signature-256 verification
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_business_account_id: str = ""
    auth_secret_key: str = "change-this-auth-secret"
    auth_access_token_ttl_minutes: int = Field(default=480, ge=1, le=10080)
    auth_initial_operator_email: str | None = None
    auth_initial_operator_password: str | None = None
    auth_initial_operator_full_name: str = "Intake Operator"
    auth_initial_operator_role: str = "admin"
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_app"
    )
    db_pool_size: int = Field(default=5, ge=1, le=50)
    db_max_overflow: int = Field(default=10, ge=0, le=100)
    db_pool_recycle: int = Field(default=1800, ge=-1, le=7200)

    # --- Chatbot / Module 2 ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    gemini_api_key: str = ""
    gemini_model: str = "google/gemini-3-flash-preview"
    ngrok_authtoken: str = ""
    chatbot_enabled: bool = True
    lab_opening_hour: int = Field(default=8, ge=0, le=23)
    lab_closing_hour: int = Field(default=18, ge=0, le=23)
    lab_timezone: str = "Africa/Casablanca"
    embedding_model: str = "all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value

        if not value:
            return []

        cleaned = value.strip()
        if not cleaned:
            return []

        if cleaned.startswith("["):
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
            raise ValueError("CORS_ORIGINS JSON value must be a list")

        return [origin.strip() for origin in cleaned.split(",") if origin.strip()]

    @model_validator(mode="after")
    def _warn_weak_secret(self) -> "Settings":
        secret = self.auth_secret_key.strip()
        if len(secret) < 32:
            if self.environment in ("staging", "production"):
                raise ValueError(
                    "AUTH_SECRET_KEY must be at least 32 characters in "
                    f"{self.environment}. Generate one with: "
                    'python -c "import secrets; print(secrets.token_urlsafe(48))"'
                )
            warnings.warn(
                "AUTH_SECRET_KEY is shorter than 32 characters. "
                "This is acceptable for local development but MUST be changed before deployment.",
                UserWarning,
                stacklevel=2,
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
