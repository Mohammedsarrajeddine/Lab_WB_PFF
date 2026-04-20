"""Message data access."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.intake import (
    Conversation,
    Message,
    MessageDirection,
)


class MessageRepository:
    """Encapsulates all database operations for the Message model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_whatsapp_id(self, whatsapp_message_id: str) -> Message | None:
        return await self._session.scalar(
            select(Message)
            .options(
                selectinload(Message.conversation).selectinload(
                    Conversation.analysis_request
                ),
                selectinload(Message.conversation).selectinload(
                    Conversation.patient
                ),
                selectinload(Message.prescription),
            )
            .where(Message.whatsapp_message_id == whatsapp_message_id)
        )

    async def find_outgoing_by_whatsapp_id(
        self, whatsapp_message_id: str
    ) -> Message | None:
        return await self._session.scalar(
            select(Message).where(
                Message.whatsapp_message_id == whatsapp_message_id
            )
        )

    async def create(self, message: Message) -> Message:
        self._session.add(message)
        await self._session.flush()
        return message

    async def get_latest_incoming_sent_at(
        self, *, conversation_id: UUID
    ) -> datetime | None:
        return await self._session.scalar(
            select(Message.sent_at)
            .where(
                Message.conversation_id == conversation_id,
                Message.direction == MessageDirection.INCOMING,
            )
            .order_by(Message.sent_at.desc(), Message.created_at.desc())
            .limit(1)
        )

    async def list_for_conversation(
        self,
        *,
        conversation_id: UUID,
        limit: int,
        offset: int,
    ) -> tuple[list[Message], int]:
        total = int(
            (
                await self._session.execute(
                    select(func.count())
                    .select_from(Message)
                    .where(Message.conversation_id == conversation_id)
                )
            ).scalar_one()
        )

        messages = (
            (
                await self._session.execute(
                    select(Message)
                    .where(Message.conversation_id == conversation_id)
                    .order_by(
                        Message.sent_at.desc(), Message.created_at.desc()
                    )
                    .offset(offset)
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )

        return list(messages), total
