"""Admin-only endpoints to view and update runtime settings (API keys, etc.).

Changes are applied in-memory AND persisted to the database.
They survive container restarts; DB values override .env on startup.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_operator_roles
from app.core.config import settings
from app.db.models.auth import OperatorRole
from app.db.session import get_db_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin"])

admin_only = Depends(require_operator_roles(OperatorRole.ADMIN))

StatusName = Literal["connected", "attention", "disconnected", "missing", "simulation"]
ToneName = Literal["success", "warning", "danger", "neutral", "info"]
OverallStatusName = Literal["healthy", "degraded", "critical"]


class RuntimeSettingsOut(BaseModel):
    """Masked view of current runtime settings."""

    whatsapp_access_token: str
    whatsapp_phone_number_id: str
    whatsapp_business_account_id: str
    gemini_api_key: str
    gemini_model: str
    groq_api_key: str
    groq_model: str
    groq_vision_model: str
    chatbot_enabled: bool
    whatsapp_simulation_mode: bool
    ngrok_authtoken: str


class RuntimeSettingsPatch(BaseModel):
    """Partial update; only provided fields are changed."""

    whatsapp_access_token: str | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_business_account_id: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    groq_api_key: str | None = None
    groq_model: str | None = None
    groq_vision_model: str | None = None
    chatbot_enabled: bool | None = None
    whatsapp_simulation_mode: bool | None = None
    ngrok_authtoken: str | None = None


class RuntimeDependencyStatus(BaseModel):
    key: str
    label: str
    workflow_role: str
    status: StatusName
    tone: ToneName
    configured: bool
    summary: str
    detail: str
    metadata: dict[str, str] = Field(default_factory=dict)


class RuntimeStatusSnapshot(BaseModel):
    overall_status: OverallStatusName
    checked_at: datetime
    connected_count: int
    attention_count: int
    disconnected_count: int
    services: list[RuntimeDependencyStatus]


def _mask(value: str, visible: int = 8) -> str:
    """Show first `visible` chars, mask the rest."""

    if not value:
        return "(non défini)"
    if len(value) <= visible:
        return value
    return value[:visible] + "•" * min(len(value) - visible, 20)


def _read_settings() -> RuntimeSettingsOut:
    return RuntimeSettingsOut(
        whatsapp_access_token=_mask(settings.whatsapp_access_token),
        whatsapp_phone_number_id=settings.whatsapp_phone_number_id or "(non défini)",
        whatsapp_business_account_id=settings.whatsapp_business_account_id or "(non défini)",
        gemini_api_key=_mask(settings.gemini_api_key),
        gemini_model=settings.gemini_model,
        groq_api_key=_mask(settings.groq_api_key),
        groq_model=settings.groq_model,
        groq_vision_model=settings.groq_vision_model,
        chatbot_enabled=settings.chatbot_enabled,
        whatsapp_simulation_mode=settings.whatsapp_simulation_mode,
        ngrok_authtoken=_mask(getattr(settings, "ngrok_authtoken", "")),
    )


@router.get(
    "/admin/settings",
    response_model=RuntimeSettingsOut,
    dependencies=[admin_only],
    summary="View current runtime settings (masked secrets)",
)
async def get_runtime_settings() -> RuntimeSettingsOut:
    return _read_settings()


@router.patch(
    "/admin/settings",
    response_model=RuntimeSettingsOut,
    dependencies=[admin_only],
    summary="Update runtime settings without Docker rebuild",
)
async def patch_runtime_settings(
    payload: RuntimeSettingsPatch,
    session: AsyncSession = Depends(get_db_session),
) -> RuntimeSettingsOut:
    from app.db.repositories.runtime_settings_repo import upsert_many

    updated_in_memory: dict[str, str] = {}

    field_map: list[tuple[str, bool]] = [
        ("whatsapp_access_token", False),
        ("whatsapp_phone_number_id", False),
        ("whatsapp_business_account_id", False),
        ("gemini_api_key", False),
        ("gemini_model", False),
        ("groq_api_key", False),
        ("groq_model", False),
        ("groq_vision_model", False),
        ("chatbot_enabled", True),
        ("whatsapp_simulation_mode", True),
        ("ngrok_authtoken", False),
    ]

    for key, is_bool in field_map:
        value = getattr(payload, key, None)
        if value is None:
            continue
        if is_bool:
            setattr(settings, key, value)
            updated_in_memory[key] = str(value).lower()
        else:
            cleaned = value.strip() if isinstance(value, str) else str(value)
            setattr(settings, key, cleaned)
            updated_in_memory[key] = cleaned

    if not updated_in_memory:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucun champ à mettre à jour.",
        )

    await upsert_many(session, updated_in_memory)
    await session.commit()

    if "whatsapp_access_token" in updated_in_memory:
        try:
            from app.integrations.whatsapp.client import WhatsAppClient

            WhatsAppClient._instance = None
        except Exception:
            pass

    logger.info("Settings updated & persisted to DB: %s", list(updated_in_memory.keys()))
    return _read_settings()
