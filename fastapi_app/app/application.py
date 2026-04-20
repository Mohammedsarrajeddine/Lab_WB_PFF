from contextlib import asynccontextmanager
import logging

# Ensure all app.* loggers emit INFO-level messages (delivery confirmations, etc.)
logging.getLogger("app").setLevel(logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.auth import ensure_initial_operator_if_configured
from app.workers.scheduler import start_scheduler, shutdown_scheduler
from app.integrations.whatsapp.client import WhatsAppClient

logger = logging.getLogger(__name__)


async def _load_runtime_settings_from_db() -> None:
    """Load persisted runtime settings from DB and apply them to the config."""
    try:
        from app.db.repositories.runtime_settings_repo import get_all_settings

        async with AsyncSessionLocal() as session:
            overrides = await get_all_settings(session)

        if not overrides:
            return

        # Mutable fields we allow to be overridden from DB
        MUTABLE_KEYS = {
            "whatsapp_access_token", "whatsapp_phone_number_id",
            "whatsapp_business_account_id", "groq_api_key", "groq_model",
            "groq_vision_model", "gemini_api_key", "gemini_model",
            "chatbot_enabled", "whatsapp_simulation_mode", "ngrok_authtoken",
        }

        applied = []
        for key, value in overrides.items():
            if key in MUTABLE_KEYS and hasattr(settings, key):
                field_type = type(getattr(settings, key))
                if field_type is bool:
                    setattr(settings, key, value.lower() in ("true", "1", "yes"))
                else:
                    setattr(settings, key, value)
                applied.append(key)

        if applied:
            logger.info("Loaded %d runtime settings from DB: %s", len(applied), applied)
    except Exception:
        logger.exception("Failed to load runtime settings from DB")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # --- Load persisted runtime settings from DB ---
    await _load_runtime_settings_from_db()

    # --- Seed initial operator ---
    async with AsyncSessionLocal() as session:
        seeded = await ensure_initial_operator_if_configured(session)
        if seeded:
            await session.commit()

    # --- Initialize RAG knowledge store ---
    if settings.chatbot_enabled:
        try:
            from app.rag.retrieval.vector_store import (
                ensure_pgvector_extension,
                seed_knowledge,
            )

            async with AsyncSessionLocal() as session:
                await ensure_pgvector_extension(session)

            async with AsyncSessionLocal() as session:
                inserted = await seed_knowledge(session)
                if inserted:
                    await session.commit()
                    logger.info("RAG knowledge store initialised (%d chunks).", inserted)
                else:
                    logger.info("RAG knowledge store already up to date.")
        except Exception:
            logger.exception("Failed to initialise RAG knowledge store.")

    start_scheduler()

    yield

    shutdown_scheduler()
    await WhatsAppClient.close()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Rate limiting
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

app.include_router(api_router, prefix=settings.api_prefix)

