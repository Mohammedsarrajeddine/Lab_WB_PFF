"""Prescription data access."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.intake import Prescription


class PrescriptionRepository:
    """Encapsulates all database operations for the Prescription model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, prescription: Prescription) -> Prescription:
        self._session.add(prescription)
        await self._session.flush()
        return prescription

    async def list_for_conversation(
        self, conversation_id: UUID
    ) -> list[Prescription]:
        stmt = (
            select(Prescription)
            .where(Prescription.conversation_id == conversation_id)
            .order_by(Prescription.created_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())
