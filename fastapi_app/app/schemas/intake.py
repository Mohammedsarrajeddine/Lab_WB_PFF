from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.models.intake import (
    AnalysisRequestStatus,
    ConversationStatus,
    MessageDirection,
    MessageType,
    PrescriptionExtractionStatus,
)
from app.db.models.catalog import PricingTier


class WhatsAppWebhookIn(BaseModel):
    chat_id: str = Field(min_length=1, max_length=128)
    from_phone: str = Field(min_length=6, max_length=32)
    from_name: str | None = Field(default=None, max_length=160)
    message_id: str | None = Field(default=None, max_length=128)
    direction: MessageDirection = MessageDirection.INCOMING
    message_type: MessageType = MessageType.TEXT
    text: str | None = None
    media_url: str | None = None
    mime_type: str | None = Field(default=None, max_length=128)
    sent_at: datetime | None = None

    @model_validator(mode="after")
    def ensure_payload_content(self) -> "WhatsAppWebhookIn":
        if self.message_type == MessageType.TEXT:
            if not self.text or not self.text.strip():
                raise ValueError("text is required when message_type is text")
            return self

        if self.message_type in {MessageType.IMAGE, MessageType.DOCUMENT, MessageType.AUDIO}:
            if not self.media_url and not self.text:
                raise ValueError(
                    "media_url or text must be provided for media messages"
                )

        return self


class WhatsAppWebhookAck(BaseModel):
    conversation_id: UUID
    message_id: UUID
    analysis_request_id: UUID
    prescription_detected: bool
    prescription_id: UUID | None = None
    extraction_status: PrescriptionExtractionStatus | None = None


class OutgoingMessageCreateIn(BaseModel):
    message_id: str | None = Field(default=None, max_length=128)
    message_type: MessageType = MessageType.TEXT
    text: str | None = None
    media_url: str | None = None
    mime_type: str | None = Field(default=None, max_length=128)
    sent_at: datetime | None = None

    @model_validator(mode="after")
    def ensure_payload_content(self) -> "OutgoingMessageCreateIn":
        if self.message_type == MessageType.TEXT:
            if not self.text or not self.text.strip():
                raise ValueError("text is required when message_type is text")
            return self

        if self.message_type in {MessageType.IMAGE, MessageType.DOCUMENT, MessageType.AUDIO}:
            if not self.media_url and not self.text:
                raise ValueError(
                    "media_url or text must be provided for media messages"
                )

        return self


class ConversationWorkflowUpdateIn(BaseModel):
    conversation_status: ConversationStatus | None = None
    analysis_request_status: AnalysisRequestStatus | None = None
    pricing_tier: PricingTier | None = None
    insurance_code: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def ensure_update_payload(self) -> "ConversationWorkflowUpdateIn":
        if (
            self.conversation_status is None
            and self.analysis_request_status is None
            and self.notes is None
            and self.pricing_tier is None
            and self.insurance_code is None
        ):
            raise ValueError(
                "At least one of conversation_status, analysis_request_status, "
                "pricing_tier, insurance_code, or notes must be provided"
            )

        return self


class ConversationWorkflowState(BaseModel):
    conversation_id: UUID
    conversation_status: ConversationStatus
    analysis_request_id: UUID
    analysis_request_status: AnalysisRequestStatus
    pricing_tier: PricingTier
    notes: str | None
    updated_at: datetime


class ConversationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    whatsapp_chat_id: str
    status: ConversationStatus
    patient_id: UUID | None
    patient_name: str | None
    patient_phone: str | None
    analysis_request_status: AnalysisRequestStatus | None
    last_message_at: datetime | None
    last_message_preview: str | None
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    items: list[ConversationListItem] = Field(default_factory=list)
    total: int
    limit: int
    offset: int


class MessageListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    direction: MessageDirection
    message_type: MessageType
    whatsapp_message_id: str | None
    content_text: str | None
    media_url: str | None
    mime_type: str | None
    sent_at: datetime
    created_at: datetime


class ConversationCloseIn(BaseModel):
    message: OutgoingMessageCreateIn
    notes: str | None = Field(default=None, max_length=4000)


class ConversationCloseResult(BaseModel):
    workflow: ConversationWorkflowState
    message: MessageListItem


class MessageListResponse(BaseModel):
    items: list[MessageListItem] = Field(default_factory=list)
    total: int
    limit: int
    offset: int


class PrescriptionPricingItemizedPrice(BaseModel):
    """A single line item from the pricing estimation."""
    code: str | None = None
    name: str
    price_dh: float
    matched_from: str


class PrescriptionPricingData(BaseModel):
    """Pricing estimation attached to a prescription extraction."""
    tier: str
    insurance_code: str = "payant"
    insurance_label: str = "Payant"
    coverage_pct: int = 0
    tiers_payant: bool = False
    itemized_prices: list[PrescriptionPricingItemizedPrice] = Field(default_factory=list)
    prelevement_dh: float = 0.0
    estimated_total_dh: float
    insurance_covers_dh: float = 0.0
    patient_pays_dh: float = 0.0


class PrescriptionExtractedPayload(BaseModel):
    """Typed schema for the JSONB ``extracted_payload`` on Prescription.

    Validates the OCR/LLM extraction output at the application layer.
    Extra keys are allowed so upstream LLM changes don't break serialization.
    """
    model_config = ConfigDict(extra="allow")

    source: str | None = None
    doctor_name: str | None = None
    patient_name: str | None = None
    date: str | None = None
    detected_analyses: list[str] = Field(default_factory=list)
    pricing_data: PrescriptionPricingData | None = None
    notes: str | None = None
    confidence: float | None = None


class PrescriptionDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    message_id: UUID
    file_url: str | None
    mime_type: str | None
    extraction_status: PrescriptionExtractionStatus
    extracted_payload: PrescriptionExtractedPayload | None = None
    created_at: datetime


class PrescriptionListResponse(BaseModel):
    items: list[PrescriptionDetail] = Field(default_factory=list)
