import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def healthcheck() -> HealthResponse:
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.warning("Health check: database unreachable")

    status = "ok" if db_ok else "degraded"
    return HealthResponse(
        status=status,
        app_name=settings.app_name,
        environment=settings.environment,
        db_connected=db_ok,
    )
