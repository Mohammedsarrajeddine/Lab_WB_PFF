import pytest

from app.db.models.intake import AnalysisRequestStatus, ConversationStatus
from app.services.intake.whatsapp_intake import (
    InvalidWorkflowTransitionError,
    _ensure_analysis_request_transition,
    _ensure_conversation_transition,
)


def test_conversation_transition_open_to_pending_review_allowed() -> None:
    _ensure_conversation_transition(
        current=ConversationStatus.OPEN,
        target=ConversationStatus.PENDING_REVIEW,
    )


def test_conversation_transition_prepared_to_open_rejected() -> None:
    with pytest.raises(InvalidWorkflowTransitionError):
        _ensure_conversation_transition(
            current=ConversationStatus.PREPARED,
            target=ConversationStatus.OPEN,
        )


def test_analysis_request_transition_prescription_received_to_in_review_allowed() -> None:
    _ensure_analysis_request_transition(
        current=AnalysisRequestStatus.PRESCRIPTION_RECEIVED,
        target=AnalysisRequestStatus.IN_REVIEW,
    )


def test_analysis_request_transition_prepared_to_in_review_rejected() -> None:
    with pytest.raises(InvalidWorkflowTransitionError):
        _ensure_analysis_request_transition(
            current=AnalysisRequestStatus.PREPARED,
            target=AnalysisRequestStatus.IN_REVIEW,
        )
