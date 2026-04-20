"""Lab result data access."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.intake import AnalysisRequest, Conversation
from app.db.models.result import LabResult, ResultAuditLog, ResultStatus


class ResultRepository:
    """Encapsulates all database operations for the LabResult model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(
        self,
        result_id: UUID,
        *,
        load_relations: bool = False,
    ) -> LabResult | None:
        """Fetch a single result by primary key.

        When ``load_relations`` is True, eagerly loads
        analysis_request → conversation → patient (needed for delivery).
        """
        if not load_relations:
            return await self._session.get(LabResult, result_id)

        stmt = (
            select(LabResult)
            .where(LabResult.id == result_id)
            .options(
                selectinload(LabResult.analysis_request)
                .selectinload(AnalysisRequest.conversation)
                .selectinload(Conversation.patient)
            )
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def find_by_analysis_request_id(
        self, analysis_request_id: UUID
    ) -> LabResult | None:
        stmt = select(LabResult).where(
            LabResult.analysis_request_id == analysis_request_id
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_by_conversation(self, conversation_id: UUID) -> list[LabResult]:
        """Return all results linked to a conversation (via AnalysisRequest)."""
        stmt = (
            select(LabResult)
            .join(AnalysisRequest)
            .where(AnalysisRequest.conversation_id == conversation_id)
            .order_by(LabResult.created_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_by_status(
        self,
        status: ResultStatus,
        *,
        load_relations: bool = False,
        for_update: bool = False,
    ) -> list[LabResult]:
        """Fetch all results with a specific status.

        When ``load_relations`` is True, eagerly loads the full chain
        needed for delivery: analysis_request → conversation → patient.

        When ``for_update`` is True, acquires ``FOR UPDATE SKIP LOCKED``
        row-level locks to prevent duplicate processing in multi-worker
        deployments.
        """
        stmt = select(LabResult).where(LabResult.status == status)
        if load_relations:
            stmt = stmt.options(
                selectinload(LabResult.analysis_request)
                .selectinload(AnalysisRequest.conversation)
                .selectinload(Conversation.patient)
            )
        if for_update:
            stmt = stmt.with_for_update(skip_locked=True)
        return list((await self._session.execute(stmt)).scalars().all())

    async def create(self, result: LabResult) -> LabResult:
        self._session.add(result)
        await self._session.flush()
        return result

    async def add_audit_log(self, log_entry: ResultAuditLog) -> ResultAuditLog:
        self._session.add(log_entry)
        await self._session.flush()
        return log_entry
