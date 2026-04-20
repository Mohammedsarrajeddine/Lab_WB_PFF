from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.result import LabResult, ResultStatus, ResultAuditLog
from app.db.models.intake import AnalysisRequest, AnalysisRequestStatus, ConversationStatus
from app.db.models.auth import OperatorUser
from app.db.repositories.result_repo import ResultRepository
from app.db.repositories.conversation_repo import ConversationRepository


class ResultNotFoundError(Exception):
    pass

class AnalysisRequestNotFoundError(Exception):
    pass


class InvalidResultStatusTransitionError(Exception):
    pass


_RESULT_STATUS_TRANSITIONS: dict[ResultStatus, set[ResultStatus]] = {
    ResultStatus.PENDING_VALIDATION: {
        ResultStatus.APPROVED,
        ResultStatus.REJECTED,
    },
    ResultStatus.APPROVED: {
        ResultStatus.REJECTED,
    },
    ResultStatus.REJECTED: {
        ResultStatus.APPROVED,
    },
    ResultStatus.DELIVERY_FAILED: {
        ResultStatus.APPROVED,
    },
    ResultStatus.SENDING: set(),
    ResultStatus.DELIVERED: set(),
}


def _ensure_result_transition(*, current: ResultStatus, target: ResultStatus) -> None:
    if target == current:
        return

    allowed_targets = _RESULT_STATUS_TRANSITIONS.get(current, set())
    if target not in allowed_targets:
        raise InvalidResultStatusTransitionError(
            f"Invalid result status transition from {current.value} to {target.value}"
        )

class ResultService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self._result_repo = ResultRepository(session)
        self._conversation_repo = ConversationRepository(session)

    async def upload_result_by_conversation(self, conversation_id: UUID, file_url: str) -> LabResult:
        # Load AR with its conversation to update workflow states
        conversation = await self._conversation_repo.find_by_id(
            conversation_id, load_analysis_request=True,
        )
        if not conversation or not conversation.analysis_request:
            raise AnalysisRequestNotFoundError(
                f"AnalysisRequest for conversation {conversation_id} not found"
            )

        ar = conversation.analysis_request
        result = await self._result_repo.find_by_analysis_request_id(ar.id)

        if result:
            result.file_url = file_url
            result.status = ResultStatus.PENDING_VALIDATION
        else:
            result = await self._result_repo.create(
                LabResult(
                    analysis_request_id=ar.id,
                    file_url=file_url,
                    status=ResultStatus.PENDING_VALIDATION,
                )
            )

        ar.status = AnalysisRequestStatus.PREPARED
        conversation.status = ConversationStatus.PREPARED

        await self.session.flush()
        return result

    async def update_result_status(
        self, result_id: UUID, status: ResultStatus, operator: OperatorUser | None = None, notes: str | None = None
    ) -> LabResult:
        result = await self._result_repo.find_by_id(result_id)
        if not result:
            raise ResultNotFoundError(f"LabResult {result_id} not found")

        previous_status = result.status
        _ensure_result_transition(current=previous_status, target=status)

        result.status = status
        if notes:
            result.operator_notes = notes

        details = f"Transition: {previous_status.value} -> {status.value}"
        if notes:
            details = f"{details}. Operator notes: {notes}"

        await self._result_repo.add_audit_log(
            ResultAuditLog(
                lab_result_id=result.id,
                operator_id=operator.id if operator else None,
                action=f"STATUS_CHANGED_TO_{status.value.upper()}",
                details=details,
            )
        )

        return result

    async def get_results_by_status(self, status: ResultStatus) -> list[LabResult]:
        """Fetch all results with a specific status, eagerly loading relations needed for delivery."""
        return await self._result_repo.list_by_status(status, load_relations=True)
