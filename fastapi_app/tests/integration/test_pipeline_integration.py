"""Integration tests for the full-stack medical lab pipeline.

These tests hit the real database and test complete service flows.
They require a running PostgreSQL instance with the test/dev database.

Run with:
    cd fastapi_app && python -m pytest tests/integration/ -v
"""

import os
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

# Configure test env BEFORE any app import
os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-key-that-is-at-least-32-characters-long!!")
os.environ.setdefault("ENVIRONMENT", "local")
os.environ.setdefault("WHATSAPP_SIMULATION_MODE", "true")

from app.db.session import AsyncSessionLocal, engine
from app.db.models.intake import (
    AnalysisRequest,
    AnalysisRequestStatus,
    Conversation,
    ConversationStatus,
    Message,
    MessageDirection,
    MessageType,
    Patient,
    Prescription,
    PrescriptionExtractionStatus,
)
from app.db.models.result import LabResult, ResultStatus, ResultAuditLog
from app.db.models.catalog import PricingTier
from app.api.routes.results import update_result_status
from app.schemas.result import ResultStatusUpdateIn
from app.schemas.intake import OutgoingMessageCreateIn, WhatsAppWebhookIn
from app.services.intake.whatsapp_intake import (
    create_outgoing_message,
    CustomerCareWindowClosedError,
    ingest_whatsapp_message,
)
from app.services.results.result_service import ResultService
from app.workers.tasks.result_delivery import _deliver_single_result
from app.integrations.whatsapp.client import WhatsAppClient
from sqlalchemy import select


@pytest.fixture(autouse=True)
async def _dispose_engine_connections_between_tests():
    """Avoid cross-event-loop asyncpg pooled connections in pytest async tests."""
    await engine.dispose()
    yield
    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _phone() -> str:
    return f"+212699{uuid.uuid4().hex[:6]}"

def _chat() -> str:
    return f"test_{uuid.uuid4().hex[:12]}"


# ---------------------------------------------------------------------------
# Test 1: ingest_whatsapp_message creates Patient + Conversation + Message + AR
# ---------------------------------------------------------------------------

async def test_ingest_message_creates_entities():
    """A new WhatsApp message should create all four core entities."""
    phone, chat_id = _phone(), _chat()

    async with AsyncSessionLocal() as session:
        payload = WhatsAppWebhookIn(
            chat_id=chat_id,
            from_phone=phone,
            from_name="Test Patient",
            message_type=MessageType.TEXT,
            text="Bonjour, pouvez-vous confirmer les horaires du laboratoire ?",
            direction=MessageDirection.INCOMING,
        )

        ack = await ingest_whatsapp_message(session, payload)
        await session.commit()

        assert ack.conversation_id is not None
        assert ack.message_id is not None
        assert ack.analysis_request_id is not None
        assert ack.prescription_detected is False

        conversation = await session.get(Conversation, ack.conversation_id)
        assert conversation is not None
        assert conversation.status == ConversationStatus.OPEN
        assert conversation.whatsapp_chat_id == chat_id

        message = await session.get(Message, ack.message_id)
        assert message is not None
        assert message.direction == MessageDirection.INCOMING

        ar = await session.get(AnalysisRequest, ack.analysis_request_id)
        assert ar is not None
        assert ar.status == AnalysisRequestStatus.RECEIVED

    # Cleanup
    async with AsyncSessionLocal() as session:
        for model, pk in [
            (Message, ack.message_id),
            (AnalysisRequest, ack.analysis_request_id),
        ]:
            obj = await session.get(model, pk)
            if obj:
                await session.delete(obj)
        await session.flush()
        conv = await session.get(Conversation, ack.conversation_id)
        pid = conv.patient_id if conv else None
        if conv:
            await session.delete(conv)
        await session.flush()
        if pid:
            p = await session.get(Patient, pid)
            if p:
                await session.delete(p)
        await session.commit()


# ---------------------------------------------------------------------------
# Test 2: duplicate message_id is idempotent
# ---------------------------------------------------------------------------

async def test_duplicate_message_idempotent():
    """Sending the same message_id twice should reuse the existing entity."""
    phone, chat_id = _phone(), _chat()
    msg_id = f"wamid_{uuid.uuid4().hex[:16]}"

    async with AsyncSessionLocal() as session:
        payload = WhatsAppWebhookIn(
            chat_id=chat_id, from_phone=phone, from_name="Test",
            message_id=msg_id, message_type=MessageType.TEXT,
            text="Premier message", direction=MessageDirection.INCOMING,
        )
        ack1 = await ingest_whatsapp_message(session, payload)
        await session.commit()

    async with AsyncSessionLocal() as session:
        payload2 = WhatsAppWebhookIn(
            chat_id=chat_id, from_phone=phone, from_name="Test",
            message_id=msg_id, message_type=MessageType.TEXT,
            text="Texte ignoré", direction=MessageDirection.INCOMING,
        )
        ack2 = await ingest_whatsapp_message(session, payload2)
        await session.commit()

    assert ack1.conversation_id == ack2.conversation_id
    assert ack1.message_id == ack2.message_id

    # Verify original text is preserved
    async with AsyncSessionLocal() as session:
        message = await session.get(Message, ack1.message_id)
        assert message.content_text == "Premier message"

    # Cleanup
    async with AsyncSessionLocal() as session:
        for model, pk in [
            (Message, ack1.message_id),
            (AnalysisRequest, ack1.analysis_request_id),
        ]:
            obj = await session.get(model, pk)
            if obj:
                await session.delete(obj)
        await session.flush()
        conv = await session.get(Conversation, ack1.conversation_id)
        pid = conv.patient_id if conv else None
        if conv:
            await session.delete(conv)
        await session.flush()
        if pid:
            p = await session.get(Patient, pid)
            if p:
                await session.delete(p)
        await session.commit()


# ---------------------------------------------------------------------------
# Test 3: prescription keyword triggers extraction pipeline
# ---------------------------------------------------------------------------

async def test_prescription_triggers_extraction():
    """A message with 'ordonnance' triggers prescription detection."""
    phone, chat_id = _phone(), _chat()

    mock_result = {
        "source": "groq_llm", "media_url": None, "mime_type": None,
        "doctor_name": "Dr. Test", "patient_name": "Patient Test",
        "date": "2026-03-31",
        "detected_analyses": ["NFS", "Glycémie à jeun"],
        "notes": None, "confidence": 0.85, "raw_extraction": {},
    }

    with patch(
        "app.services.intake.whatsapp_intake.extract_prescription_payload",
        new_callable=AsyncMock, return_value=mock_result,
    ):
        async with AsyncSessionLocal() as session:
            payload = WhatsAppWebhookIn(
                chat_id=chat_id, from_phone=phone, from_name="Rx Test",
                message_type=MessageType.TEXT,
                text="Bonjour, voici mon ordonnance pour NFS et glycémie",
                direction=MessageDirection.INCOMING,
            )
            ack = await ingest_whatsapp_message(session, payload)
            await session.commit()

    assert ack.prescription_detected is True
    assert ack.prescription_id is not None
    assert ack.extraction_status == PrescriptionExtractionStatus.COMPLETED

    async with AsyncSessionLocal() as session:
        ar = await session.get(AnalysisRequest, ack.analysis_request_id)
        assert ar.status == AnalysisRequestStatus.PRESCRIPTION_RECEIVED

        rx = await session.get(Prescription, ack.prescription_id)
        assert rx.extraction_status == PrescriptionExtractionStatus.COMPLETED
        assert "detected_analyses" in rx.extracted_payload

    # Cleanup
    async with AsyncSessionLocal() as session:
        rx = await session.get(Prescription, ack.prescription_id)
        if rx:
            await session.delete(rx)
        msg = await session.get(Message, ack.message_id)
        if msg:
            await session.delete(msg)
        ar = await session.get(AnalysisRequest, ack.analysis_request_id)
        if ar:
            await session.delete(ar)
        await session.flush()
        conv = await session.get(Conversation, ack.conversation_id)
        pid = conv.patient_id if conv else None
        if conv:
            await session.delete(conv)
        await session.flush()
        if pid:
            p = await session.get(Patient, pid)
            if p:
                await session.delete(p)
        await session.commit()


# ---------------------------------------------------------------------------
# Test 4: result upload → approve flow with audit log
# ---------------------------------------------------------------------------

async def test_result_upload_approve_flow():
    """Upload result → approve → verify audit log."""
    phone, chat_id = _phone(), _chat()
    pid, cid, arid = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    # Setup
    async with AsyncSessionLocal() as session:
        session.add(Patient(id=pid, full_name="Result Test", phone_e164=phone))
        await session.flush()
        session.add(Conversation(
            id=cid, whatsapp_chat_id=chat_id,
            status=ConversationStatus.PREPARED, patient_id=pid,
        ))
        await session.flush()
        session.add(AnalysisRequest(
            id=arid, conversation_id=cid,
            status=AnalysisRequestStatus.PREPARED,
            pricing_tier=PricingTier.NON_CONVENTIONNEL,
        ))
        await session.commit()

    # Upload + Approve
    async with AsyncSessionLocal() as session:
        svc = ResultService(session)
        result = await svc.upload_result_by_conversation(cid, "https://example.com/test.pdf")
        await session.commit()

        assert result.status == ResultStatus.PENDING_VALIDATION
        assert result.file_url == "https://example.com/test.pdf"

        approved = await svc.update_result_status(
            result.id, ResultStatus.APPROVED, notes="Test validation"
        )
        await session.commit()
        assert approved.status == ResultStatus.APPROVED

        # Verify audit log
        stmt = select(ResultAuditLog).where(ResultAuditLog.lab_result_id == result.id)
        logs = list((await session.execute(stmt)).scalars().all())
        assert any(log.action == "STATUS_CHANGED_TO_APPROVED" for log in logs)

        result_id = result.id

    # Cleanup
    async with AsyncSessionLocal() as session:
        stmt = select(ResultAuditLog).where(ResultAuditLog.lab_result_id == result_id)
        for log in (await session.execute(stmt)).scalars().all():
            await session.delete(log)
        r = await session.get(LabResult, result_id)
        if r:
            await session.delete(r)
        ar = await session.get(AnalysisRequest, arid)
        if ar:
            await session.delete(ar)
        await session.flush()
        c = await session.get(Conversation, cid)
        if c:
            await session.delete(c)
        await session.flush()
        p = await session.get(Patient, pid)
        if p:
            await session.delete(p)
        await session.commit()


async def test_outgoing_message_rejects_closed_customer_care_window():
    """Free-form sends should fail when the patient has not replied in the last 24h."""
    pid, cid = uuid.uuid4(), uuid.uuid4()
    phone = _phone()
    old_sent_at = datetime.now(tz=UTC) - timedelta(hours=25)

    async with AsyncSessionLocal() as session:
        session.add(Patient(id=pid, full_name="Window Closed", phone_e164=phone))
        await session.flush()
        session.add(Conversation(
            id=cid,
            whatsapp_chat_id=_chat(),
            status=ConversationStatus.OPEN,
            patient_id=pid,
        ))
        await session.flush()
        session.add(Message(
            conversation_id=cid,
            direction=MessageDirection.INCOMING,
            message_type=MessageType.TEXT,
            content_text="Bonjour",
            sent_at=old_sent_at,
        ))
        await session.commit()

    async with AsyncSessionLocal() as session:
        with pytest.raises(CustomerCareWindowClosedError) as exc_info:
            await create_outgoing_message(
                session,
                conversation_id=cid,
                payload=OutgoingMessageCreateIn(text="Message hors fenetre"),
            )
        assert "24 heures" in str(exc_info.value)
        await session.rollback()

    async with AsyncSessionLocal() as session:
        stmt = select(Message).where(Message.conversation_id == cid)
        rows = list((await session.execute(stmt)).scalars().all())
        assert len([row for row in rows if row.direction == MessageDirection.OUTGOING]) == 0

    async with AsyncSessionLocal() as session:
        stmt = select(Message).where(Message.conversation_id == cid)
        for message in (await session.execute(stmt)).scalars().all():
            await session.delete(message)
        conversation = await session.get(Conversation, cid)
        if conversation:
            await session.delete(conversation)
        patient = await session.get(Patient, pid)
        if patient:
            await session.delete(patient)
        await session.commit()


async def test_outgoing_message_allows_recent_customer_reply():
    """Recent patient replies keep the 24h free-form send window open."""
    pid, cid = uuid.uuid4(), uuid.uuid4()
    phone = _phone()
    recent_sent_at = datetime.now(tz=UTC) - timedelta(hours=1)
    wa_client = AsyncMock()
    wa_client.send_text_message = AsyncMock(return_value={"messages": [{"id": "wamid.test"}]})

    async with AsyncSessionLocal() as session:
        session.add(Patient(id=pid, full_name="Window Open", phone_e164=phone))
        await session.flush()
        session.add(Conversation(
            id=cid,
            whatsapp_chat_id=_chat(),
            status=ConversationStatus.OPEN,
            patient_id=pid,
        ))
        await session.flush()
        session.add(Message(
            conversation_id=cid,
            direction=MessageDirection.INCOMING,
            message_type=MessageType.TEXT,
            content_text="Salut",
            sent_at=recent_sent_at,
        ))
        await session.commit()

    with patch(
        "app.services.intake.whatsapp_intake.WhatsAppClient.get_instance",
        return_value=wa_client,
    ):
        async with AsyncSessionLocal() as session:
            created = await create_outgoing_message(
                session,
                conversation_id=cid,
                payload=OutgoingMessageCreateIn(text="Message autorise"),
            )
            await session.commit()

    assert created.content_text == "Message autorise"
    wa_client.send_text_message.assert_awaited_once_with(phone, "Message autorise")

    async with AsyncSessionLocal() as session:
        stmt = select(Message).where(Message.conversation_id == cid)
        for message in (await session.execute(stmt)).scalars().all():
            await session.delete(message)
        conversation = await session.get(Conversation, cid)
        if conversation:
            await session.delete(conversation)
        patient = await session.get(Patient, pid)
        if patient:
            await session.delete(patient)
        await session.commit()


# ---------------------------------------------------------------------------
# Test 5: chatbot RAG returns relevant context
# ---------------------------------------------------------------------------

async def test_chatbot_returns_relevant_rag_context():
    """RAG pipeline returns a meaningful response with lab context."""
    from app.core.config import settings
    from groq import AuthenticationError

    if not settings.groq_api_key:
        pytest.skip("GROQ_API_KEY not configured — skipping RAG test")

    from app.rag.pipelines.chatbot_rag import run_chatbot_rag

    async with AsyncSessionLocal() as session:
        try:
            response, sources = await run_chatbot_rag(
                session,
                patient_message="Quels sont vos horaires d'ouverture ?",
                conversation_history=[],
                is_off_hours=False,
            )
        except AuthenticationError:
            pytest.skip("GROQ_API_KEY is invalid/unauthorized — skipping RAG test")

    assert response is not None
    assert len(response.strip()) > 10
    assert isinstance(sources, list)


# ---------------------------------------------------------------------------
# Test 6: invalid result status transition returns HTTP 422
# ---------------------------------------------------------------------------

async def test_result_invalid_status_transition_returns_422():
    """Route should map invalid result state transition to HTTP 422."""
    phone, chat_id = _phone(), _chat()
    pid, cid, arid = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    async with AsyncSessionLocal() as session:
        session.add(Patient(id=pid, full_name="Transition Test", phone_e164=phone))
        await session.flush()
        session.add(Conversation(
            id=cid,
            whatsapp_chat_id=chat_id,
            status=ConversationStatus.PREPARED,
            patient_id=pid,
        ))
        await session.flush()
        session.add(AnalysisRequest(
            id=arid,
            conversation_id=cid,
            status=AnalysisRequestStatus.PREPARED,
            pricing_tier=PricingTier.NON_CONVENTIONNEL,
        ))
        await session.flush()

        result = LabResult(
            analysis_request_id=arid,
            file_url="https://example.com/transition-test.pdf",
            status=ResultStatus.PENDING_VALIDATION,
        )
        session.add(result)
        await session.commit()
        result_id = result.id

    async with AsyncSessionLocal() as session:
        with pytest.raises(HTTPException) as exc_info:
            await update_result_status(
                result_id=result_id,
                payload=ResultStatusUpdateIn(status=ResultStatus.DELIVERED),
                session=session,
                operator=None,  # type: ignore[arg-type]
            )

        assert exc_info.value.status_code == 422
        assert "Invalid result status transition" in str(exc_info.value.detail)
        await session.rollback()

    async with AsyncSessionLocal() as session:
        fresh = await session.get(LabResult, result_id)
        assert fresh is not None
        assert fresh.status == ResultStatus.PENDING_VALIDATION

    # Cleanup
    async with AsyncSessionLocal() as session:
        stmt = select(ResultAuditLog).where(ResultAuditLog.lab_result_id == result_id)
        for log in (await session.execute(stmt)).scalars().all():
            await session.delete(log)
        r = await session.get(LabResult, result_id)
        if r:
            await session.delete(r)
        ar = await session.get(AnalysisRequest, arid)
        if ar:
            await session.delete(ar)
        await session.flush()
        c = await session.get(Conversation, cid)
        if c:
            await session.delete(c)
        await session.flush()
        p = await session.get(Patient, pid)
        if p:
            await session.delete(p)
        await session.commit()


# ---------------------------------------------------------------------------
# Test 7: ineligible approved result becomes DELIVERY_FAILED with audit log
# ---------------------------------------------------------------------------

async def test_ineligible_approved_result_becomes_delivery_failed_with_audit_log():
    """Worker should dead-letter ineligible approved results and audit the action."""
    cid, arid = uuid.uuid4(), uuid.uuid4()

    # Setup conversation without patient (ineligible by design)
    async with AsyncSessionLocal() as session:
        session.add(Conversation(
            id=cid,
            whatsapp_chat_id=_chat(),
            status=ConversationStatus.PREPARED,
            patient_id=None,
        ))
        await session.flush()
        session.add(AnalysisRequest(
            id=arid,
            conversation_id=cid,
            patient_id=None,
            status=AnalysisRequestStatus.PREPARED,
            pricing_tier=PricingTier.NON_CONVENTIONNEL,
        ))
        await session.flush()

        result = LabResult(
            analysis_request_id=arid,
            file_url="https://example.com/ineligible.pdf",
            status=ResultStatus.APPROVED,
        )
        session.add(result)
        await session.commit()
        result_id = result.id

    wa_client = WhatsAppClient.get_instance()
    await _deliver_single_result(result_id, wa_client)

    async with AsyncSessionLocal() as session:
        updated = await session.get(LabResult, result_id)
        assert updated is not None
        assert updated.status == ResultStatus.DELIVERY_FAILED
        assert updated.operator_notes is not None
        assert "Inéligible à l'envoi automatique" in updated.operator_notes

        stmt = select(ResultAuditLog).where(ResultAuditLog.lab_result_id == result_id)
        logs = list((await session.execute(stmt)).scalars().all())
        assert any(log.action == "STATUS_CHANGED_TO_DELIVERY_FAILED" for log in logs)
        assert any(
            (log.details or "").startswith("Ineligible for automated delivery:")
            for log in logs
        )

    # Cleanup
    async with AsyncSessionLocal() as session:
        stmt = select(ResultAuditLog).where(ResultAuditLog.lab_result_id == result_id)
        for log in (await session.execute(stmt)).scalars().all():
            await session.delete(log)
        r = await session.get(LabResult, result_id)
        if r:
            await session.delete(r)
        ar = await session.get(AnalysisRequest, arid)
        if ar:
            await session.delete(ar)
        await session.flush()
        c = await session.get(Conversation, cid)
        if c:
            await session.delete(c)
        await session.commit()
