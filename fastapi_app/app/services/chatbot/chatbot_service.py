"""Chatbot service — business logic for Module 2."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.rag.pipelines.chatbot_rag import run_chatbot_rag


def is_off_hours() -> bool:
    """Return True if the lab is currently closed."""
    tz = ZoneInfo(settings.lab_timezone)
    now = datetime.now(tz)

    # Sunday = 6
    if now.weekday() == 6:
        return True

    # Saturday: only open until 13h
    if now.weekday() == 5:
        return now.hour < settings.lab_opening_hour or now.hour >= 13

    # Weekdays
    return (
        now.hour < settings.lab_opening_hour
        or now.hour >= settings.lab_closing_hour
    )


async def handle_patient_message(
    session: AsyncSession,
    *,
    message: str,
    conversation_history: list[dict[str, str]] | None = None,
) -> dict:
    """Process a patient message through the RAG chatbot.

    Returns a dict with ``response``, ``is_off_hours``, and ``sources``.
    """
    off_hours = is_off_hours()
    history = conversation_history or []

    response_text, sources = await run_chatbot_rag(
        session,
        patient_message=message,
        conversation_history=history,
        is_off_hours=off_hours,
    )

    return {
        "response": response_text,
        "is_off_hours": off_hours,
        "sources": sources,
    }
