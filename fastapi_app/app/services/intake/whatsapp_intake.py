"""WhatsApp intake service — business logic for message processing.

This module orchestrates the intake pipeline: ingesting messages, detecting
prescriptions, managing workflow transitions, and listing data. All database
queries are delegated to the repository layer.
"""

from __future__ import annotations

import logging

from datetime import UTC, datetime, timedelta

from app.integrations.whatsapp.client import WhatsAppClient

logger = logging.getLogger(__name__)
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.intake import (
    AnalysisRequest,
    AnalysisRequestStatus,
    ConversationStatus,
    Message,
    MessageDirection,
    Prescription,
    PrescriptionExtractionStatus,
)
from app.db.repositories import (
    ConversationRepository,
    MessageRepository,
    PatientRepository,
    PrescriptionRepository,
)
from app.schemas.intake import (
    ConversationCloseIn,
    ConversationCloseResult,
    ConversationListItem,
    ConversationWorkflowState,
    ConversationWorkflowUpdateIn,
    MessageListItem,
    OutgoingMessageCreateIn,
    WhatsAppWebhookAck,
    WhatsAppWebhookIn,
)
from app.services.intake.prescription_ingestion import (
    extract_prescription_payload,
    is_prescription_candidate,
)
from app.services.catalog.pricing_service import PricingService


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ConversationNotFoundError(Exception):
    pass


class InvalidWorkflowTransitionError(Exception):
    pass


class MessageConflictError(Exception):
    pass


class CustomerCareWindowClosedError(Exception):
    pass


# ---------------------------------------------------------------------------
# Workflow transition maps
# ---------------------------------------------------------------------------

_CONVERSATION_TRANSITIONS: dict[ConversationStatus, set[ConversationStatus]] = {
    ConversationStatus.OPEN: {
        ConversationStatus.OPEN,
        ConversationStatus.PENDING_REVIEW,
        ConversationStatus.PREPARED,
    },
    ConversationStatus.PENDING_REVIEW: {
        ConversationStatus.PENDING_REVIEW,
        ConversationStatus.PREPARED,
        ConversationStatus.CLOSED,
    },
    ConversationStatus.PREPARED: {
        ConversationStatus.PREPARED,
        ConversationStatus.CLOSED,
    },
    ConversationStatus.CLOSED: {ConversationStatus.CLOSED},
}

_ANALYSIS_REQUEST_TRANSITIONS: dict[
    AnalysisRequestStatus, set[AnalysisRequestStatus]
] = {
    AnalysisRequestStatus.RECEIVED: {
        AnalysisRequestStatus.RECEIVED,
        AnalysisRequestStatus.PRESCRIPTION_RECEIVED,
        AnalysisRequestStatus.IN_REVIEW,
        AnalysisRequestStatus.PREPARED,
    },
    AnalysisRequestStatus.PRESCRIPTION_RECEIVED: {
        AnalysisRequestStatus.PRESCRIPTION_RECEIVED,
        AnalysisRequestStatus.IN_REVIEW,
        AnalysisRequestStatus.PREPARED,
    },
    AnalysisRequestStatus.IN_REVIEW: {
        AnalysisRequestStatus.IN_REVIEW,
        AnalysisRequestStatus.PREPARED,
    },
    AnalysisRequestStatus.PREPARED: {AnalysisRequestStatus.PREPARED},
}

_CUSTOMER_CARE_WINDOW = timedelta(hours=24)


def _ensure_conversation_transition(
    *, current: ConversationStatus, target: ConversationStatus
) -> None:
    if target not in _CONVERSATION_TRANSITIONS[current]:
        raise InvalidWorkflowTransitionError(
            f"Invalid conversation status transition from {current.value} to {target.value}"
        )


def _coerce_utc_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _assert_customer_care_window_open(
    *,
    latest_incoming_sent_at: datetime | None,
    now: datetime,
) -> None:
    if latest_incoming_sent_at is None:
        raise CustomerCareWindowClosedError(
            "Impossible d'envoyer un message WhatsApp libre sans rÃ©ponse rÃ©cente du patient. "
            "Demandez au patient d'envoyer 'Hi' d'abord ou utilisez un template WhatsApp approuvÃ©."
        )

    latest_customer_reply = _coerce_utc_timestamp(latest_incoming_sent_at)
    if now > latest_customer_reply + _CUSTOMER_CARE_WINDOW:
        raise CustomerCareWindowClosedError(
            "Impossible d'envoyer un message WhatsApp libre: plus de 24 heures se sont Ã©coulÃ©es "
            "depuis la derniÃ¨re rÃ©ponse du patient. Demandez au patient d'envoyer 'Hi' d'abord "
            "ou utilisez un template WhatsApp approuvÃ©."
        )


def _ensure_analysis_request_transition(
    *, current: AnalysisRequestStatus, target: AnalysisRequestStatus
) -> None:
    if target not in _ANALYSIS_REQUEST_TRANSITIONS[current]:
        raise InvalidWorkflowTransitionError(
            f"Invalid analysis request status transition from {current.value} to {target.value}"
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_phone(raw_phone: str) -> str:
    compact = raw_phone.strip()
    if compact.lower().startswith("whatsapp:"):
        compact = compact.split(":", 1)[1]
    compact = compact.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not compact:
        return compact
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    return compact if compact.startswith("+") else f"+{compact}"


def _resolve_sent_at(value: datetime | None) -> datetime:
    return value if value else datetime.now(UTC)


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

async def ingest_whatsapp_message(
    session: AsyncSession,
    payload: WhatsAppWebhookIn,
) -> WhatsAppWebhookAck:
    message_repo = MessageRepository(session)
    patient_repo = PatientRepository(session)
    conversation_repo = ConversationRepository(session)

    # Idempotency check
    if payload.message_id:
        existing = await message_repo.find_by_whatsapp_id(payload.message_id)
        if existing:
            conv = existing.conversation
            ar = conv.analysis_request
            if ar is None:
                patient = conv.patient or await patient_repo.get_or_create(
                    phone_e164=_normalize_phone(payload.from_phone),
                    full_name=payload.from_name,
                )
                if conv.patient_id is None:
                    conv.patient = patient
                ar = await conversation_repo.get_or_create_analysis_request(
                    conversation=conv, patient=patient,
                )

            rx = existing.prescription
            return WhatsAppWebhookAck(
                conversation_id=conv.id,
                message_id=existing.id,
                analysis_request_id=ar.id,
                prescription_detected=rx is not None,
                prescription_id=rx.id if rx else None,
                extraction_status=rx.extraction_status if rx else None,
            )

    # Create entities
    phone = _normalize_phone(payload.from_phone)
    patient = await patient_repo.get_or_create(
        phone_e164=phone, full_name=payload.from_name,
    )
    conversation = await conversation_repo.get_or_create(
        chat_id=payload.chat_id, patient=patient,
    )
    analysis_request = await conversation_repo.get_or_create_analysis_request(
        conversation=conversation, patient=patient,
    )

    sent_at = _resolve_sent_at(payload.sent_at)
    message = await message_repo.create(
        Message(
            conversation=conversation,
            direction=payload.direction,
            message_type=payload.message_type,
            whatsapp_message_id=payload.message_id,
            content_text=payload.text,
            media_url=payload.media_url,
            mime_type=payload.mime_type,
            sent_at=sent_at,
        )
    )

    if conversation.last_message_at is None or sent_at >= conversation.last_message_at:
        conversation.last_message_at = sent_at

    # Prescription detection
    prescription: Prescription | None = None
    if is_prescription_candidate(
        message_type=payload.message_type,
        mime_type=payload.mime_type,
        media_url=payload.media_url,
        content_text=payload.text,
    ):
        extracted = await extract_prescription_payload(
            media_url=payload.media_url,
            mime_type=payload.mime_type,
            content_text=payload.text,
        )
        
        pricing_svc = PricingService(session)
        pricing_data = await pricing_svc.estimate_price(
            extracted.get("detected_analyses", []),
            analysis_request.pricing_tier
        )
        extracted["pricing_data"] = pricing_data

        prescription = await PrescriptionRepository(session).create(
            Prescription(
                conversation=conversation,
                message=message,
                file_url=payload.media_url,
                mime_type=payload.mime_type,
                extraction_status=PrescriptionExtractionStatus.COMPLETED,
                extracted_payload=extracted,
            )
        )
        conversation.status = ConversationStatus.PENDING_REVIEW
        analysis_request.status = AnalysisRequestStatus.PRESCRIPTION_RECEIVED

    await session.flush()

    return WhatsAppWebhookAck(
        conversation_id=conversation.id,
        message_id=message.id,
        analysis_request_id=analysis_request.id,
        prescription_detected=prescription is not None,
        prescription_id=prescription.id if prescription else None,
        extraction_status=prescription.extraction_status if prescription else None,
    )


async def update_conversation_workflow(
    session: AsyncSession,
    *,
    conversation_id: UUID,
    payload: ConversationWorkflowUpdateIn,
) -> ConversationWorkflowState:
    conv_repo = ConversationRepository(session)
    conversation = await conv_repo.find_by_id(
        conversation_id, load_analysis_request=True, load_prescriptions=True,
    )
    if conversation is None:
        raise ConversationNotFoundError(f"Conversation {conversation_id} not found")

    analysis_request = conversation.analysis_request
    if analysis_request is None:
        analysis_request = AnalysisRequest(
            conversation=conversation,
            patient_id=conversation.patient_id,
            status=AnalysisRequestStatus.RECEIVED,
        )
        session.add(analysis_request)
        await session.flush()

    # Apply transitions
    if payload.analysis_request_status is not None:
        _ensure_analysis_request_transition(
            current=analysis_request.status, target=payload.analysis_request_status,
        )
        analysis_request.status = payload.analysis_request_status

    if payload.conversation_status is not None:
        _ensure_conversation_transition(
            current=conversation.status, target=payload.conversation_status,
        )
        conversation.status = payload.conversation_status

    # Auto-sync rules
    if analysis_request.status in {
        AnalysisRequestStatus.PRESCRIPTION_RECEIVED,
        AnalysisRequestStatus.IN_REVIEW,
    } and conversation.status == ConversationStatus.OPEN:
        _ensure_conversation_transition(
            current=conversation.status, target=ConversationStatus.PENDING_REVIEW,
        )
        conversation.status = ConversationStatus.PENDING_REVIEW

    if conversation.status == ConversationStatus.PREPARED and (
        analysis_request.status != AnalysisRequestStatus.PREPARED
    ):
        _ensure_analysis_request_transition(
            current=analysis_request.status, target=AnalysisRequestStatus.PREPARED,
        )
        analysis_request.status = AnalysisRequestStatus.PREPARED

    if analysis_request.status == AnalysisRequestStatus.PREPARED and conversation.status in {
        ConversationStatus.OPEN, ConversationStatus.PENDING_REVIEW,
    }:
        _ensure_conversation_transition(
            current=conversation.status, target=ConversationStatus.PREPARED,
        )
        conversation.status = ConversationStatus.PREPARED

    if conversation.status == ConversationStatus.CLOSED and (
        analysis_request.status != AnalysisRequestStatus.PREPARED
    ):
        raise InvalidWorkflowTransitionError(
            "Conversation can be closed only when analysis request is prepared"
        )
        
    # Resolve insurance code — insurance_code takes priority over raw pricing_tier
    effective_insurance = payload.insurance_code
    if payload.pricing_tier is not None and payload.pricing_tier != analysis_request.pricing_tier:
        analysis_request.pricing_tier = payload.pricing_tier

    if payload.insurance_code is not None or payload.pricing_tier is not None:
        # When insurance changes, also sync the tier from the insurance profile
        if effective_insurance:
            from app.services.catalog.insurance_profiles import get_insurance_profile
            profile = get_insurance_profile(effective_insurance)
            analysis_request.pricing_tier = profile.tier

        pricing_svc = PricingService(session)
        # Recompute prices for all prescriptions in this conversation
        for rx in conversation.prescriptions:
            if rx.extracted_payload:
                raw_names = rx.extracted_payload.get("detected_analyses", [])
                p_data = await pricing_svc.estimate_price(
                    raw_names,
                    analysis_request.pricing_tier,
                    insurance_code=effective_insurance,
                )
                # Ensure SQLAlchemy detects the mutation
                new_payload = dict(rx.extracted_payload)
                new_payload["pricing_data"] = p_data
                rx.extracted_payload = new_payload

    if payload.notes is not None:
        cleaned = payload.notes.strip()
        analysis_request.notes = cleaned if cleaned else None

    await session.flush()
    await session.refresh(conversation)
    await session.refresh(analysis_request)

    updated_at = max(analysis_request.updated_at, conversation.updated_at)

    return ConversationWorkflowState(
        conversation_id=conversation.id,
        conversation_status=conversation.status,
        analysis_request_id=analysis_request.id,
        analysis_request_status=analysis_request.status,
        pricing_tier=analysis_request.pricing_tier,
        notes=analysis_request.notes,
        updated_at=updated_at,
    )


async def create_outgoing_message(
    session: AsyncSession,
    *,
    conversation_id: UUID,
    payload: OutgoingMessageCreateIn,
) -> MessageListItem:
    conv_repo = ConversationRepository(session)
    msg_repo = MessageRepository(session)

    conversation = await conv_repo.find_by_id(conversation_id, load_patient=True)
    if conversation is None:
        raise ConversationNotFoundError(f"Conversation {conversation_id} not found")

    # Idempotency
    if payload.message_id:
        existing = await msg_repo.find_outgoing_by_whatsapp_id(payload.message_id)
        if existing:
            if existing.conversation_id != conversation_id or existing.direction != MessageDirection.OUTGOING:
                raise MessageConflictError("message_id is already used by another message")
            return MessageListItem.model_validate(existing)

    patient_phone = (
        conversation.patient.phone_e164
        if conversation.patient
        else None
    )
    if payload.text and patient_phone:
        latest_incoming_sent_at = await msg_repo.get_latest_incoming_sent_at(
            conversation_id=conversation.id,
        )
        _assert_customer_care_window_open(
            latest_incoming_sent_at=latest_incoming_sent_at,
            now=datetime.now(tz=UTC),
        )

    sent_at = _resolve_sent_at(payload.sent_at)
    message = await msg_repo.create(
        Message(
            conversation_id=conversation.id,
            direction=MessageDirection.OUTGOING,
            message_type=payload.message_type,
            whatsapp_message_id=payload.message_id,
            content_text=payload.text,
            media_url=payload.media_url,
            mime_type=payload.mime_type,
            sent_at=sent_at,
        )
    )

    if conversation.last_message_at is None or sent_at >= conversation.last_message_at:
        conversation.last_message_at = sent_at

    # Deliver via WhatsApp Business API
    if payload.text and patient_phone:
        try:
            wa_client = WhatsAppClient.get_instance()
            await wa_client.send_text_message(patient_phone, payload.text)
            logger.info(
                "Outgoing message delivered via WhatsApp to %s (conv %s)",
                patient_phone, conversation_id,
            )
        except Exception:
            logger.exception(
                "Failed to deliver outgoing WhatsApp message to %s (conv %s)",
                patient_phone, conversation_id,
            )
    elif not patient_phone:
        logger.warning(
            "Cannot deliver outgoing message: no patient phone for conv %s",
            conversation_id,
        )

    return MessageListItem.model_validate(message)


async def close_conversation_with_message(
    session: AsyncSession,
    *,
    conversation_id: UUID,
    payload: ConversationCloseIn,
) -> ConversationCloseResult:
    message = await create_outgoing_message(
        session, conversation_id=conversation_id, payload=payload.message,
    )
    await update_conversation_workflow(
        session, conversation_id=conversation_id,
        payload=ConversationWorkflowUpdateIn(
            analysis_request_status=AnalysisRequestStatus.PREPARED,
            notes=payload.notes,
        ),
    )
    workflow = await update_conversation_workflow(
        session, conversation_id=conversation_id,
        payload=ConversationWorkflowUpdateIn(
            conversation_status=ConversationStatus.CLOSED,
        ),
    )
    return ConversationCloseResult(workflow=workflow, message=message)


async def list_conversations(
    session: AsyncSession,
    *,
    status: ConversationStatus | None = None,
    patient_id: UUID | None = None,
    limit: int,
    offset: int,
) -> tuple[list[ConversationListItem], int]:
    conv_repo = ConversationRepository(session)
    conversations, previews, total = await conv_repo.list_with_previews(
        status=status, patient_id=patient_id, limit=limit, offset=offset,
    )

    items = [
        ConversationListItem(
            id=c.id,
            whatsapp_chat_id=c.whatsapp_chat_id,
            status=c.status,
            patient_id=c.patient_id,
            patient_name=c.patient.full_name if c.patient else None,
            patient_phone=c.patient.phone_e164 if c.patient else None,
            analysis_request_status=c.analysis_request.status if c.analysis_request else None,
            last_message_at=c.last_message_at,
            last_message_preview=previews.get(c.id),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in conversations
    ]
    return items, total


async def list_messages(
    session: AsyncSession,
    *,
    conversation_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[MessageListItem], int]:
    conv_repo = ConversationRepository(session)
    if await conv_repo.find_by_id(conversation_id) is None:
        raise ConversationNotFoundError(f"Conversation {conversation_id} not found")

    msg_repo = MessageRepository(session)
    messages, total = await msg_repo.list_for_conversation(
        conversation_id=conversation_id, limit=limit, offset=offset,
    )

    items = [MessageListItem.model_validate(m) for m in messages]
    return items, total
