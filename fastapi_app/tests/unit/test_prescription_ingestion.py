from app.db.models.intake import MessageType
from app.services.intake.prescription_ingestion import is_prescription_candidate


def test_prescription_candidate_detected_from_pdf_mime() -> None:
    assert is_prescription_candidate(
        message_type=MessageType.DOCUMENT,
        mime_type="application/pdf",
        media_url=None,
        content_text=None,
    )


def test_prescription_candidate_detected_from_keywords() -> None:
    assert is_prescription_candidate(
        message_type=MessageType.TEXT,
        mime_type=None,
        media_url=None,
        content_text="Bonjour, voici mon ordonnance pour les analyses.",
    )


def test_prescription_candidate_rejected_for_regular_text() -> None:
    assert not is_prescription_candidate(
        message_type=MessageType.TEXT,
        mime_type=None,
        media_url=None,
        content_text="Bonjour, je veux connaitre vos horaires.",
    )
