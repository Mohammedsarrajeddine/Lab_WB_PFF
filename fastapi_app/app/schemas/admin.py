from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models.auth import OperatorRole


class PatientCreate(BaseModel):
    full_name: str | None = Field(default=None, max_length=160)
    phone_e164: str = Field(max_length=32)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=10)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    insurance_id: UUID | None = None
    channel_id: UUID | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=160)
    phone_e164: str | None = Field(default=None, max_length=32)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=10)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    insurance_id: UUID | None = None
    channel_id: UUID | None = None


class OperatorCreate(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=160)
    password: str = Field(min_length=6)
    role: OperatorRole = Field(default=OperatorRole.INTAKE_OPERATOR)
    is_active: bool = Field(default=True)


class OperatorUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=160)
    role: OperatorRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class InternalNoteCreate(BaseModel):
    content: str = Field(min_length=1)
    is_pinned: bool = False


class InternalNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    user_id: UUID
    content: str
    is_pinned: bool
    author_name: str | None = None
    created_at: str
    updated_at: str


class InsuranceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    is_active: bool


class ChannelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    is_active: bool
