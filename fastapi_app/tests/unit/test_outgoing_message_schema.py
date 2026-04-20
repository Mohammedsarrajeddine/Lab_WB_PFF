import pytest
from pydantic import ValidationError

from app.db.models.intake import MessageType
from app.schemas.intake import OutgoingMessageCreateIn


def test_outgoing_text_message_requires_text() -> None:
    with pytest.raises(ValidationError):
        OutgoingMessageCreateIn(
            message_type=MessageType.TEXT,
            text="   ",
        )


def test_outgoing_media_message_allows_media_url_only() -> None:
    payload = OutgoingMessageCreateIn(
        message_type=MessageType.DOCUMENT,
        media_url="https://example.com/result.pdf",
        mime_type="application/pdf",
    )

    assert payload.message_type == MessageType.DOCUMENT
    assert payload.media_url == "https://example.com/result.pdf"


def test_outgoing_media_message_requires_content_or_media_url() -> None:
    with pytest.raises(ValidationError):
        OutgoingMessageCreateIn(
            message_type=MessageType.IMAGE,
            text=None,
            media_url=None,
        )
