from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.chatbot import router as chatbot_router
from app.api.routes.health import router as health_router
from app.api.routes.intake import router as intake_router
from app.api.routes.catalog import router as catalog_router
from app.api.routes.media_proxy import router as media_router
from app.api.routes.admin_settings import router as admin_settings_router
from app.api.routes.admin_runtime_status import router as admin_runtime_status_router
from app.api.routes.admin_dashboard import router as admin_dashboard_router
from app.api.routes.results import router as results_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(chatbot_router)
api_router.include_router(health_router)
api_router.include_router(intake_router)
api_router.include_router(catalog_router)
api_router.include_router(results_router)
api_router.include_router(media_router)
api_router.include_router(admin_settings_router)
api_router.include_router(admin_runtime_status_router)
api_router.include_router(admin_dashboard_router)
