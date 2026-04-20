"""Intake domain models — Patient, Conversation, Message, Prescription, AnalysisRequest.

Enum columns use ``create_type=False`` because PostgreSQL ENUM types are managed
by Alembic migrations (see ``alembic/versions/20260325_0001_initial.py``).
The database **does** enforce valid enum values at the server level — the flag
only tells SQLAlchemy not to re-issue ``CREATE TYPE`` on ``metadata.create_all()``.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.models.catalog import PricingTier


class ConversationStatus(StrEnum):
    OPEN = "open"
    PENDING_REVIEW = "pending_review"
    PREPARED = "prepared"
    CLOSED = "closed"


class MessageDirection(StrEnum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"


class MessageType(StrEnum):
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"
    OTHER = "other"


class PrescriptionExtractionStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisRequestStatus(StrEnum):
    RECEIVED = "received"
    PRESCRIPTION_RECEIVED = "prescription_received"
    IN_REVIEW = "in_review"
    PREPARED = "prepared"


class AnalysisTestOrigin(StrEnum):
    AI = "ai"
    MANUAL = "manual"



class Patient(TimestampMixin, Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    phone_e164: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(
        String(50), nullable=True, unique=True,
    )
    insurance_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assurances.id", ondelete="SET NULL"),
        nullable=True,
    )
    channel_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("channels.id", ondelete="SET NULL"),
        nullable=True,
    )

    conversations: Mapped[list[Conversation]] = relationship(back_populates="patient")
    analysis_requests: Mapped[list[AnalysisRequest]] = relationship(
        back_populates="patient"
    )
    insurance = relationship("Insurance")
    channel = relationship("Channel")


class Conversation(TimestampMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (Index("ix_conversations_last_message_at", "last_message_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    whatsapp_chat_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
    )
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(
            ConversationStatus,
            name="conversation_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
        default=ConversationStatus.OPEN,
        server_default=ConversationStatus.OPEN.value,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operator_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_ai_managed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    needs_human_attention: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    is_after_hours: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    patient: Mapped[Patient | None] = relationship(back_populates="conversations")
    assignee = relationship("OperatorUser", foreign_keys=[assigned_to])
    messages: Mapped[list[Message]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    prescriptions: Mapped[list[Prescription]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    analysis_request: Mapped[AnalysisRequest | None] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_sent_at", "conversation_id", "sent_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    direction: Mapped[MessageDirection] = mapped_column(
        Enum(
            MessageDirection,
            name="message_direction_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
    )
    message_type: Mapped[MessageType] = mapped_column(
        Enum(
            MessageType,
            name="message_type_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
    )
    whatsapp_message_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        unique=True,
    )
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    prescription: Mapped[Prescription | None] = relationship(back_populates="message")


class Prescription(TimestampMixin, Base):
    __tablename__ = "prescriptions"
    __table_args__ = (Index("ix_prescriptions_extraction_status", "extraction_status"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    extraction_status: Mapped[PrescriptionExtractionStatus] = mapped_column(
        Enum(
            PrescriptionExtractionStatus,
            name="prescription_extraction_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
        default=PrescriptionExtractionStatus.PENDING,
        server_default=PrescriptionExtractionStatus.PENDING.value,
    )
    extracted_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    conversation: Mapped[Conversation] = relationship(back_populates="prescriptions")
    message: Mapped[Message] = relationship(back_populates="prescription")


class AnalysisRequest(TimestampMixin, Base):
    __tablename__ = "analysis_requests"
    __table_args__ = (Index("ix_analysis_requests_status", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[AnalysisRequestStatus] = mapped_column(
        Enum(
            AnalysisRequestStatus,
            name="analysis_request_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
        default=AnalysisRequestStatus.RECEIVED,
        server_default=AnalysisRequestStatus.RECEIVED.value,
    )
    pricing_tier: Mapped[PricingTier] = mapped_column(
        Enum(
            PricingTier, 
            name="pricing_tier_enum", 
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False
        ),
        nullable=False,
        default=PricingTier.NON_CONVENTIONNEL,
        server_default=PricingTier.NON_CONVENTIONNEL.value,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    conversation: Mapped[Conversation] = relationship(back_populates="analysis_request")
    patient: Mapped[Patient | None] = relationship(back_populates="analysis_requests")
    tests: Mapped[list[AnalysisTest]] = relationship(
        back_populates="analysis_request",
        cascade="all, delete-orphan",
    )


class AnalysisTest(TimestampMixin, Base):
    """Individual test extracted from a prescription for a given analysis request."""

    __tablename__ = "analysis_tests"
    __table_args__ = (
        Index("ix_analysis_tests_analysis_request_id", "analysis_request_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    analysis_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    catalog_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_catalog.id", ondelete="SET NULL"),
        nullable=True,
    )
    origin: Mapped[AnalysisTestOrigin] = mapped_column(
        Enum(
            AnalysisTestOrigin,
            name="analysis_test_origin_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
        default=AnalysisTestOrigin.AI,
        server_default=AnalysisTestOrigin.AI.value,
    )
    is_validated: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )
    is_corrected: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )
    corrected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operator_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    tube_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sample_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis_request: Mapped[AnalysisRequest] = relationship(back_populates="tests")
    catalog_item = relationship("AnalysisCatalogItem")
    corrector = relationship("OperatorUser", foreign_keys=[corrected_by])


class InternalNote(TimestampMixin, Base):
    """Private notes attached to a conversation, visible only to operators."""

    __tablename__ = "internal_notes"
    __table_args__ = (
        Index("ix_internal_notes_conversation_id", "conversation_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operator_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )

    conversation: Mapped[Conversation] = relationship()
    author = relationship("OperatorUser")
