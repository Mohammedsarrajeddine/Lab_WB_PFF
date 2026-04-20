from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.auth import OperatorRole


def _normalize_email(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("email must be a string")
    cleaned = value.strip().lower()
    if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
        raise ValueError("email must be valid")
    return cleaned


class AuthLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return _normalize_email(value)


class OperatorUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str | None
    role: OperatorRole
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str | None = None
    refresh_expires_in: int | None = None
    operator: OperatorUserOut


class OperatorCreateIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)
    full_name: str | None = Field(default=None, max_length=160)
    role: OperatorRole = OperatorRole.INTAKE_OPERATOR
    is_active: bool = True

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return _normalize_email(value)


class RefreshTokenIn(BaseModel):
    refresh_token: str = Field(min_length=10)
