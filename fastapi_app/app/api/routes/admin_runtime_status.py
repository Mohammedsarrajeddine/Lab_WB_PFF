"""Admin runtime dependency status endpoints."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.api.deps.auth import require_operator_roles
from app.core.config import settings
from app.db.models.auth import OperatorRole
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin"])

admin_only = Depends(require_operator_roles(OperatorRole.ADMIN))

StatusName = Literal["connected", "attention", "disconnected", "missing", "simulation"]
ToneName = Literal["success", "warning", "danger", "neutral", "info"]
OverallStatusName = Literal["healthy", "degraded", "critical"]

NOT_CONFIGURED = "(not configured)"
HTTP_TIMEOUT = httpx.Timeout(6.0, connect=3.0)


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


def _is_preview_model(model_name: str) -> bool:
    lowered = model_name.strip().lower()
    return any(marker in lowered for marker in ("preview", "beta", "experimental"))


def _build_overall_status(
    services: list[RuntimeDependencyStatus],
) -> tuple[OverallStatusName, int, int, int]:
    connected_count = sum(1 for service in services if service.status == "connected")
    attention_count = sum(
        1 for service in services if service.status in {"attention", "simulation"}
    )
    disconnected_count = sum(
        1 for service in services if service.status in {"disconnected", "missing"}
    )

    database_down = any(
        service.key == "database" and service.status == "disconnected"
        for service in services
    )
    workflow_blocked = any(
        service.key in {"ocr_pipeline", "chatbot_workflow"}
        and service.status == "disconnected"
        for service in services
    )

    if database_down or workflow_blocked:
        overall_status: OverallStatusName = "critical"
    elif disconnected_count or attention_count:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return overall_status, connected_count, attention_count, disconnected_count


async def _check_database_status() -> RuntimeDependencyStatus:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return RuntimeDependencyStatus(
            key="database",
            label="Postgres Database",
            workflow_role="Persistent storage for patients, messages, and runtime config.",
            status="connected",
            tone="success",
            configured=True,
            summary="Database connection is healthy.",
            detail="Postgres responded to a lightweight health query.",
            metadata={"engine": "postgresql", "mode": "asyncpg"},
        )
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Database status check failed: %s", exc)
        return RuntimeDependencyStatus(
            key="database",
            label="Postgres Database",
            workflow_role="Persistent storage for patients, messages, and runtime config.",
            status="disconnected",
            tone="danger",
            configured=True,
            summary="Database connection failed.",
            detail="The API cannot reach Postgres right now. Core workflows are blocked.",
            metadata={"engine": "postgresql", "mode": "asyncpg"},
        )


async def _check_whatsapp_status(client: httpx.AsyncClient) -> RuntimeDependencyStatus:
    token = settings.whatsapp_access_token.strip()
    phone_id = settings.whatsapp_phone_number_id.strip()
    business_id = settings.whatsapp_business_account_id.strip()

    if settings.whatsapp_simulation_mode:
        return RuntimeDependencyStatus(
            key="whatsapp",
            label="WhatsApp Cloud API",
            workflow_role="Inbound and outbound patient messaging.",
            status="simulation",
            tone="info",
            configured=True,
            summary="Simulation mode is active.",
            detail="Messages are simulated locally, so the live Meta connection is bypassed.",
            metadata={
                "phone_number_id": phone_id or NOT_CONFIGURED,
                "business_account_id": business_id or NOT_CONFIGURED,
            },
        )

    if not token or not phone_id:
        return RuntimeDependencyStatus(
            key="whatsapp",
            label="WhatsApp Cloud API",
            workflow_role="Inbound and outbound patient messaging.",
            status="missing",
            tone="danger",
            configured=False,
            summary="WhatsApp credentials are incomplete.",
            detail="The access token and phone number ID are required for live message delivery.",
            metadata={
                "phone_number_id": phone_id or NOT_CONFIGURED,
                "business_account_id": business_id or NOT_CONFIGURED,
            },
        )

    try:
        response = await client.get(
            f"https://graph.facebook.com/v22.0/{phone_id}",
            params={"fields": "id,display_phone_number"},
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - depends on external network
        logger.warning("WhatsApp status check failed: %s", exc)
        return RuntimeDependencyStatus(
            key="whatsapp",
            label="WhatsApp Cloud API",
            workflow_role="Inbound and outbound patient messaging.",
            status="disconnected",
            tone="danger",
            configured=True,
            summary="Meta Graph API is unreachable.",
            detail="The access token is present, but the backend could not validate the phone number.",
            metadata={
                "phone_number_id": phone_id,
                "business_account_id": business_id or NOT_CONFIGURED,
            },
        )

    payload = response.json()
    if not business_id:
        return RuntimeDependencyStatus(
            key="whatsapp",
            label="WhatsApp Cloud API",
            workflow_role="Inbound and outbound patient messaging.",
            status="attention",
            tone="warning",
            configured=False,
            summary="WhatsApp is connected with partial metadata.",
            detail="Live messaging works, but the business account ID is still missing from admin setup.",
            metadata={
                "phone_number_id": phone_id,
                "display_phone_number": str(payload.get("display_phone_number", phone_id)),
            },
        )

    return RuntimeDependencyStatus(
        key="whatsapp",
        label="WhatsApp Cloud API",
        workflow_role="Inbound and outbound patient messaging.",
        status="connected",
        tone="success",
        configured=True,
        summary="Meta connection is validated.",
        detail="The backend reached WhatsApp Cloud API and confirmed the configured phone number.",
        metadata={
            "phone_number_id": phone_id,
            "display_phone_number": str(payload.get("display_phone_number", phone_id)),
            "business_account_id": business_id,
        },
    )


async def _check_gemini_status(client: httpx.AsyncClient) -> RuntimeDependencyStatus:
    api_key = settings.gemini_api_key.strip()
    model_name = settings.gemini_model.strip()

    if not api_key:
        return RuntimeDependencyStatus(
            key="gemini",
            label="Gemini via OpenRouter",
            workflow_role="Primary OCR model for prescription extraction.",
            status="missing",
            tone="danger",
            configured=False,
            summary="OpenRouter API key is missing.",
            detail="Gemini OCR cannot run until the OpenRouter credential is configured.",
            metadata={"model": model_name or NOT_CONFIGURED},
        )

    if not model_name:
        return RuntimeDependencyStatus(
            key="gemini",
            label="Gemini via OpenRouter",
            workflow_role="Primary OCR model for prescription extraction.",
            status="attention",
            tone="warning",
            configured=False,
            summary="Gemini model is not selected.",
            detail="The key is present, but no default OpenRouter model is configured.",
            metadata={"provider": "openrouter"},
        )

    try:
        response = await client.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - depends on external network
        logger.warning("Gemini status check failed: %s", exc)
        return RuntimeDependencyStatus(
            key="gemini",
            label="Gemini via OpenRouter",
            workflow_role="Primary OCR model for prescription extraction.",
            status="disconnected",
            tone="danger",
            configured=True,
            summary="OpenRouter is unreachable.",
            detail="The API key exists, but the backend could not validate the OpenRouter connection.",
            metadata={"model": model_name},
        )

    model_ids = {
        str(item.get("id", "")).strip()
        for item in response.json().get("data", [])
        if isinstance(item, dict)
    }

    if model_name not in model_ids:
        return RuntimeDependencyStatus(
            key="gemini",
            label="Gemini via OpenRouter",
            workflow_role="Primary OCR model for prescription extraction.",
            status="attention",
            tone="warning",
            configured=True,
            summary="OpenRouter is connected but the model was not found.",
            detail="The configured Gemini model is not present in the current OpenRouter catalog.",
            metadata={"model": model_name},
        )

    if _is_preview_model(model_name):
        return RuntimeDependencyStatus(
            key="gemini",
            label="Gemini via OpenRouter",
            workflow_role="Primary OCR model for prescription extraction.",
            status="attention",
            tone="warning",
            configured=True,
            summary="Gemini is connected with a preview model.",
            detail="Preview models can change behavior over time. Consider pinning a stable release later.",
            metadata={"model": model_name, "stability": "preview"},
        )

    return RuntimeDependencyStatus(
        key="gemini",
        label="Gemini via OpenRouter",
        workflow_role="Primary OCR model for prescription extraction.",
        status="connected",
        tone="success",
        configured=True,
        summary="OpenRouter is connected and the model is available.",
        detail="The primary OCR runtime is ready for handwritten prescription extraction.",
        metadata={"model": model_name, "provider": "openrouter"},
    )


async def _check_groq_status(client: httpx.AsyncClient) -> RuntimeDependencyStatus:
    api_key = settings.groq_api_key.strip()
    chat_model = settings.groq_model.strip()
    vision_model = settings.groq_vision_model.strip()

    if not api_key:
        return RuntimeDependencyStatus(
            key="groq",
            label="Groq Runtime",
            workflow_role="Chatbot responses and OCR fallback models.",
            status="missing",
            tone="danger",
            configured=False,
            summary="Groq API key is missing.",
            detail="The chatbot and vision fallback cannot use Groq until the credential is configured.",
            metadata={
                "chat_model": chat_model or NOT_CONFIGURED,
                "vision_model": vision_model or NOT_CONFIGURED,
            },
        )

    try:
        response = await client.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - depends on external network
        logger.warning("Groq status check failed: %s", exc)
        return RuntimeDependencyStatus(
            key="groq",
            label="Groq Runtime",
            workflow_role="Chatbot responses and OCR fallback models.",
            status="disconnected",
            tone="danger",
            configured=True,
            summary="Groq is unreachable.",
            detail="The API key exists, but the backend could not validate the Groq runtime.",
            metadata={
                "chat_model": chat_model or NOT_CONFIGURED,
                "vision_model": vision_model or NOT_CONFIGURED,
            },
        )

    model_ids = {
        str(item.get("id", "")).strip()
        for item in response.json().get("data", [])
        if isinstance(item, dict)
    }

    issues: list[str] = []
    if not chat_model:
        issues.append("chat model missing")
    elif chat_model not in model_ids:
        issues.append(f"chat model not found: {chat_model}")

    if not vision_model:
        issues.append("vision model missing")
    elif vision_model not in model_ids:
        issues.append(f"vision model not found: {vision_model}")

    if issues:
        return RuntimeDependencyStatus(
            key="groq",
            label="Groq Runtime",
            workflow_role="Chatbot responses and OCR fallback models.",
            status="attention",
            tone="warning",
            configured=False,
            summary="Groq is connected with model configuration issues.",
            detail="; ".join(issues).capitalize() + ".",
            metadata={
                "chat_model": chat_model or NOT_CONFIGURED,
                "vision_model": vision_model or NOT_CONFIGURED,
            },
        )

    return RuntimeDependencyStatus(
        key="groq",
        label="Groq Runtime",
        workflow_role="Chatbot responses and OCR fallback models.",
        status="connected",
        tone="success",
        configured=True,
        summary="Groq is connected and both models are available.",
        detail="Chat and fallback vision runtimes are ready for production traffic.",
        metadata={"chat_model": chat_model, "vision_model": vision_model},
    )


async def _check_ngrok_status(client: httpx.AsyncClient) -> RuntimeDependencyStatus:
    auth_token = settings.ngrok_authtoken.strip()

    if not auth_token:
        return RuntimeDependencyStatus(
            key="ngrok",
            label="ngrok Tunnel",
            workflow_role="Webhook tunnel for Meta callbacks during local development.",
            status="missing",
            tone="danger",
            configured=False,
            summary="ngrok auth token is missing.",
            detail="Webhook tunneling cannot be managed from the local stack until the token is set.",
            metadata={"dashboard": "http://127.0.0.1:4040"},
        )

    try:
        response = await client.get("http://ngrok:4040/api/tunnels")
        response.raise_for_status()
    except Exception as exc:
        logger.warning("ngrok status check failed: %s", exc)
        return RuntimeDependencyStatus(
            key="ngrok",
            label="ngrok Tunnel",
            workflow_role="Webhook tunnel for Meta callbacks during local development.",
            status="disconnected",
            tone="danger",
            configured=True,
            summary="ngrok container is not reachable.",
            detail="The auth token is configured, but the local ngrok inspector did not respond.",
            metadata={"dashboard": "http://127.0.0.1:4040"},
        )

    tunnels = response.json().get("tunnels", [])
    public_url = NOT_CONFIGURED
    if tunnels:
        public_url = str(tunnels[0].get("public_url", NOT_CONFIGURED))

    if not tunnels:
        return RuntimeDependencyStatus(
            key="ngrok",
            label="ngrok Tunnel",
            workflow_role="Webhook tunnel for Meta callbacks during local development.",
            status="attention",
            tone="warning",
            configured=True,
            summary="ngrok is reachable but no tunnel is active.",
            detail="The inspector is online. Start the tunnel profile when you need a public webhook URL.",
            metadata={
                "dashboard": "http://127.0.0.1:4040",
                "public_url": public_url,
            },
        )

    return RuntimeDependencyStatus(
        key="ngrok",
        label="ngrok Tunnel",
        workflow_role="Webhook tunnel for Meta callbacks during local development.",
        status="connected",
        tone="success",
        configured=True,
        summary="ngrok tunnel is active.",
        detail="The local tunnel inspector reports at least one public endpoint for webhook delivery.",
        metadata={
            "dashboard": "http://127.0.0.1:4040",
            "public_url": public_url,
            "tunnel_count": str(len(tunnels)),
        },
    )


def _build_ocr_pipeline_status(
    gemini_status: RuntimeDependencyStatus,
    groq_status: RuntimeDependencyStatus,
) -> RuntimeDependencyStatus:
    gemini_ready = gemini_status.status in {"connected", "attention"}
    groq_ready = groq_status.status in {"connected", "attention"}

    if gemini_ready and groq_ready:
        status_name: StatusName = "connected"
        tone: ToneName = "success"
        summary = "OCR pipeline has primary and fallback coverage."
        detail = "Gemini is configured as the main OCR engine and Groq is available as the fallback path."
    elif gemini_ready:
        status_name = "attention"
        tone = "warning"
        summary = "OCR pipeline is online with no fallback."
        detail = "Prescription extraction can run through Gemini, but the Groq fallback path needs attention."
    elif groq_ready:
        status_name = "attention"
        tone = "warning"
        summary = "OCR fallback is available, but the primary model is down."
        detail = "Groq can still cover some OCR cases, but Gemini should be restored for the intended workflow."
    else:
        status_name = "disconnected"
        tone = "danger"
        summary = "OCR pipeline is not ready."
        detail = "Neither the primary Gemini path nor the Groq fallback path is currently available."

    return RuntimeDependencyStatus(
        key="ocr_pipeline",
        label="Prescription OCR Pipeline",
        workflow_role="Image analysis flow for prescription extraction and catalog matching.",
        status=status_name,
        tone=tone,
        configured=gemini_ready or groq_ready,
        summary=summary,
        detail=detail,
        metadata={"primary": gemini_status.status, "fallback": groq_status.status},
    )


def _build_chatbot_workflow_status(
    database_status: RuntimeDependencyStatus,
    groq_status: RuntimeDependencyStatus,
) -> RuntimeDependencyStatus:
    if not settings.chatbot_enabled:
        return RuntimeDependencyStatus(
            key="chatbot_workflow",
            label="Chatbot Workflow",
            workflow_role="Automated patient replies and lab guidance.",
            status="attention",
            tone="warning",
            configured=False,
            summary="Chatbot is disabled in runtime settings.",
            detail="The feature toggle is off, so automated patient replies are intentionally paused.",
            metadata={"feature_flag": "disabled"},
        )

    if database_status.status == "disconnected":
        return RuntimeDependencyStatus(
            key="chatbot_workflow",
            label="Chatbot Workflow",
            workflow_role="Automated patient replies and lab guidance.",
            status="disconnected",
            tone="danger",
            configured=True,
            summary="Chatbot is blocked by database connectivity.",
            detail="Conversation context cannot be persisted while Postgres is unavailable.",
            metadata={"database": database_status.status, "groq": groq_status.status},
        )

    if groq_status.status in {"missing", "disconnected"}:
        return RuntimeDependencyStatus(
            key="chatbot_workflow",
            label="Chatbot Workflow",
            workflow_role="Automated patient replies and lab guidance.",
            status="disconnected",
            tone="danger",
            configured=False,
            summary="Chatbot has no active language model runtime.",
            detail="Groq powers the chatbot replies, so the workflow is blocked until that runtime is restored.",
            metadata={"database": database_status.status, "groq": groq_status.status},
        )

    if groq_status.status == "attention":
        return RuntimeDependencyStatus(
            key="chatbot_workflow",
            label="Chatbot Workflow",
            workflow_role="Automated patient replies and lab guidance.",
            status="attention",
            tone="warning",
            configured=True,
            summary="Chatbot is online with model configuration warnings.",
            detail="The core workflow is available, but the Groq runtime still needs configuration cleanup.",
            metadata={"database": database_status.status, "groq": groq_status.status},
        )

    return RuntimeDependencyStatus(
        key="chatbot_workflow",
        label="Chatbot Workflow",
        workflow_role="Automated patient replies and lab guidance.",
        status="connected",
        tone="success",
        configured=True,
        summary="Chatbot workflow is ready.",
        detail="Database persistence and Groq reply generation are both available for automated responses.",
        metadata={"database": database_status.status, "groq": groq_status.status},
    )


@router.get(
    "/admin/settings/status",
    response_model=RuntimeStatusSnapshot,
    dependencies=[admin_only],
    summary="Inspect runtime dependency status for admin setup",
)
async def get_runtime_settings_status() -> RuntimeStatusSnapshot:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        database_status, whatsapp_status, gemini_status, groq_status, ngrok_status = (
            await asyncio.gather(
                _check_database_status(),
                _check_whatsapp_status(client),
                _check_gemini_status(client),
                _check_groq_status(client),
                _check_ngrok_status(client),
            )
        )

    ocr_pipeline_status = _build_ocr_pipeline_status(gemini_status, groq_status)
    chatbot_workflow_status = _build_chatbot_workflow_status(
        database_status,
        groq_status,
    )

    services = [
        database_status,
        whatsapp_status,
        gemini_status,
        groq_status,
        ngrok_status,
        ocr_pipeline_status,
        chatbot_workflow_status,
    ]
    overall_status, connected_count, attention_count, disconnected_count = (
        _build_overall_status(services)
    )

    return RuntimeStatusSnapshot(
        overall_status=overall_status,
        checked_at=datetime.now(timezone.utc),
        connected_count=connected_count,
        attention_count=attention_count,
        disconnected_count=disconnected_count,
        services=services,
    )
