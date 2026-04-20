import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db_session
from app.schemas.chatbot import ChatMessageIn, ChatMessageOut
from app.services.chatbot import handle_patient_message

router = APIRouter(tags=["chatbot"])

logger = logging.getLogger(__name__)


@router.post(
    "/chatbot/message",
    response_model=ChatMessageOut,
    summary="Send a message to the lab chatbot",
    description="Public endpoint — no authentication required. "
    "Patients use this to ask questions about the laboratory.",
)
async def post_chatbot_message(
    payload: ChatMessageIn,
    session: AsyncSession = Depends(get_db_session),
) -> ChatMessageOut:
    if not settings.chatbot_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chatbot is currently disabled",
        )

    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chatbot is not configured (missing API key)",
        )

    try:
        history = [
            {"role": item.role, "content": item.content}
            for item in payload.conversation_history
        ]

        result = await handle_patient_message(
            session,
            message=payload.message,
            conversation_history=history,
        )

        return ChatMessageOut(
            response=result["response"],
            is_off_hours=result["is_off_hours"],
            sources=result["sources"],
        )
    except Exception:
        logger.exception("Chatbot processing failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur interne est survenue. Veuillez réessayer plus tard.",
        )
