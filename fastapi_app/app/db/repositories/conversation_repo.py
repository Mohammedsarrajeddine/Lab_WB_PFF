"""Conversation data access."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.intake import (
    AnalysisRequest,
    AnalysisRequestStatus,
    Conversation,
    ConversationStatus,
    Message,
    Patient,
)


class ConversationRepository:
    """Encapsulates all database operations for the Conversation model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(
        self,
        conversation_id: UUID,
        *,
        load_analysis_request: bool = False,
        load_prescriptions: bool = False,
        load_patient: bool = False,
    ) -> Conversation | None:
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        if load_analysis_request:
            stmt = stmt.options(selectinload(Conversation.analysis_request))
        if load_prescriptions:
            stmt = stmt.options(selectinload(Conversation.prescriptions))
        if load_patient:
            stmt = stmt.options(selectinload(Conversation.patient))
        return await self._session.scalar(stmt)

    async def find_by_chat_id(self, chat_id: str) -> Conversation | None:
        return await self._session.scalar(
            select(Conversation)
            .options(selectinload(Conversation.analysis_request))
            .where(Conversation.whatsapp_chat_id == chat_id)
        )

    async def get_or_create(
        self,
        *,
        chat_id: str,
        patient: Patient,
    ) -> Conversation:
        conversation = await self.find_by_chat_id(chat_id)
        if conversation:
            if conversation.patient_id is None:
                conversation.patient = patient
            return conversation

        conversation = Conversation(
            whatsapp_chat_id=chat_id,
            patient=patient,
            status=ConversationStatus.OPEN,
        )
        self._session.add(conversation)
        await self._session.flush()
        return conversation

    async def get_or_create_analysis_request(
        self,
        *,
        conversation: Conversation,
        patient: Patient,
    ) -> AnalysisRequest:
        existing = await self._session.scalar(
            select(AnalysisRequest).where(
                AnalysisRequest.conversation_id == conversation.id
            )
        )
        if existing is not None:
            if existing.patient_id is None:
                existing.patient = patient
            return existing

        analysis_request = AnalysisRequest(
            conversation=conversation,
            patient=patient,
            status=AnalysisRequestStatus.RECEIVED,
        )
        self._session.add(analysis_request)
        await self._session.flush()
        return analysis_request

    async def list_with_previews(
        self,
        *,
        status: ConversationStatus | None = None,
        patient_id: UUID | None = None,
        limit: int,
        offset: int,
    ) -> tuple[list[Conversation], dict[UUID, str | None], int]:
        """Return paginated conversations, a preview map, and total count."""
        filters = []
        if status:
            filters.append(Conversation.status == status)
        if patient_id:
            filters.append(Conversation.patient_id == patient_id)

        # Count
        count_stmt = select(func.count()).select_from(Conversation)
        if filters:
            count_stmt = count_stmt.where(*filters)
        total = int((await self._session.execute(count_stmt)).scalar_one())

        # Conversations
        query = (
            select(Conversation)
            .options(
                selectinload(Conversation.patient),
                selectinload(Conversation.analysis_request),
            )
            .order_by(
                Conversation.last_message_at.desc().nullslast(),
                Conversation.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        if filters:
            query = query.where(*filters)

        conversations = list(
            (await self._session.execute(query)).scalars().all()
        )
        conversation_ids = [c.id for c in conversations]

        # Message previews
        previews: dict[UUID, str | None] = {}
        if conversation_ids:
            latest_sent_subquery = (
                select(
                    Message.conversation_id.label("conversation_id"),
                    func.max(Message.sent_at).label("max_sent_at"),
                )
                .where(Message.conversation_id.in_(conversation_ids))
                .group_by(Message.conversation_id)
                .subquery()
            )

            preview_rows = await self._session.execute(
                select(
                    Message.conversation_id,
                    Message.content_text,
                    Message.media_url,
                )
                .join(
                    latest_sent_subquery,
                    and_(
                        Message.conversation_id
                        == latest_sent_subquery.c.conversation_id,
                        Message.sent_at == latest_sent_subquery.c.max_sent_at,
                    ),
                )
                .order_by(Message.created_at.desc())
            )

            for cid, content_text, media_url in preview_rows:
                previews.setdefault(cid, _build_preview(content_text, media_url))

        return conversations, previews, total


def _build_preview(text: str | None, media_url: str | None) -> str | None:
    candidate = (text or "").strip() or (media_url or "").strip()
    if not candidate:
        return None
    return candidate[:117] + "..." if len(candidate) > 120 else candidate
