"""WhatsApp auto-reply service — background tasks for chatbot and media acknowledgment.

Extracted from the intake route handler to maintain clean layer separation:
routes → services → repositories.
"""

from __future__ import annotations

import logging
from uuid import UUID

from app.core.config import settings
from app.db.models.intake import Message, MessageDirection, MessageType
from app.db.repositories import MessageRepository, PrescriptionRepository
from app.db.session import AsyncSessionLocal
from app.integrations.whatsapp.client import WhatsAppClient
from app.services.chatbot import handle_patient_message

logger = logging.getLogger(__name__)


async def chatbot_auto_reply(
    conversation_id: UUID,
    patient_phone: str,
    patient_message: str,
) -> None:
    """Background task: generate a chatbot reply and send it via WhatsApp."""
    try:
        async with AsyncSessionLocal() as session:
            # Build conversation history from recent messages
            msg_repo = MessageRepository(session)
            messages, _ = await msg_repo.list_for_conversation(
                conversation_id=conversation_id, limit=20, offset=0,
            )
            # Messages come in desc order; reverse for chronological
            history = [
                {
                    "role": "user" if m.direction == MessageDirection.INCOMING else "assistant",
                    "content": m.content_text or "",
                }
                for m in reversed(messages)
                if m.content_text
            ]

            # Call the chatbot RAG pipeline
            result = await handle_patient_message(
                session,
                message=patient_message,
                conversation_history=history[:-1],  # exclude current message (already in history)
            )

            reply_text = result["response"]
            if not reply_text:
                return

            # Send via WhatsApp Business API
            wa_client = WhatsAppClient.get_instance()
            await wa_client.send_text_message(patient_phone, reply_text)

            # Store the outgoing message in DB
            outgoing = Message(
                conversation_id=conversation_id,
                direction=MessageDirection.OUTGOING,
                message_type=MessageType.TEXT,
                content_text=reply_text,
            )
            session.add(outgoing)
            await session.commit()

            logger.info(
                "Chatbot auto-reply sent to %s for conversation %s",
                patient_phone, conversation_id,
            )
    except Exception:
        logger.exception(
            "Chatbot auto-reply failed for conversation %s", conversation_id,
        )


async def media_acknowledgment(
    conversation_id: UUID,
    patient_phone: str,
    message_type: MessageType,
    prescription_detected: bool,
) -> None:
    """Background task: send an acknowledgment when the patient sends an image/document.

    If a prescription was detected and OCR extracted analyses, include them in the reply.
    """
    try:
        # Check if OCR extracted specific analyses
        extraction_summary = ""
        if prescription_detected:
            async with AsyncSessionLocal() as session:
                prescriptions = await PrescriptionRepository(session).list_for_conversation(
                    conversation_id=conversation_id,
                )
                if prescriptions:
                    latest = prescriptions[0]  # desc order → index 0 = newest
                    payload = latest.extracted_payload or {}
                    doctor = payload.get("doctor_name")
                    patient = payload.get("patient_name")
                    analyses = payload.get("detected_analyses") or []
                    source = payload.get("source", "unknown")

                    parts = ["✅ *Ordonnance reçue et analysée !*\n"]
                    if doctor:
                        parts.append(f"👨‍⚕️ Médecin : {doctor}")
                    if patient:
                        parts.append(f"🧑 Patient : {patient}")
                    if analyses:
                        parts.append(f"\n📋 *Analyses détectées ({len(analyses)}) :*")
                        for a in analyses:
                            parts.append(f"  • {a}")

                    pricing = payload.get("pricing_data")
                    if pricing and pricing.get("estimated_total_dh"):
                        total = pricing["estimated_total_dh"]
                        prelevement = pricing.get("prelevement_dh", 0)
                        insurance_label = pricing.get("insurance_label")
                        coverage_pct = pricing.get("coverage_pct", 0)
                        patient_pays = pricing.get("patient_pays_dh", total)

                        parts.append(f"\n💰 *Estimation totale :* {total:.2f} DH")
                        if prelevement:
                            parts.append(f"   _(dont prélèvement : {prelevement:.2f} DH)_")
                        if insurance_label and coverage_pct > 0:
                            insurance_covers = pricing.get("insurance_covers_dh", 0)
                            parts.append(
                                f"🏥 *{insurance_label}* ({coverage_pct}%) : "
                                f"-{insurance_covers:.2f} DH"
                            )
                            parts.append(f"👤 *À votre charge :* {patient_pays:.2f} DH")

                    parts.append(
                        "\nNotre équipe va confirmer ces informations et vous recontacter."
                    )
                    extraction_summary = "\n".join(parts)
                    logger.debug("OCR extraction source=%s, analyses=%s", source, analyses)

        if extraction_summary:
            reply = extraction_summary
        elif prescription_detected:
            reply = (
                "Merci ! Nous avons bien reçu votre ordonnance. "
                "Notre équipe va l'analyser et vous revenir rapidement avec les détails. 📋"
            )
        elif message_type == MessageType.IMAGE:
            reply = (
                "Merci pour l'image ! Si c'est une ordonnance, notre équipe va la traiter. "
                "Sinon, n'hésitez pas à nous envoyer votre question par message texte. 😊"
            )
        else:
            reply = (
                "Merci pour le document ! Notre équipe va le consulter. "
                "N'hésitez pas à nous envoyer vos questions par message texte. 😊"
            )

        wa_client = WhatsAppClient.get_instance()
        await wa_client.send_text_message(patient_phone, reply)

        # Store outgoing message in DB
        async with AsyncSessionLocal() as session:
            outgoing = Message(
                conversation_id=conversation_id,
                direction=MessageDirection.OUTGOING,
                message_type=MessageType.TEXT,
                content_text=reply,
            )
            session.add(outgoing)
            await session.commit()

        logger.info("Media acknowledgment sent to %s for conversation %s", patient_phone, conversation_id)
    except Exception:
        logger.exception(
            "Media acknowledgment failed for conversation %s", conversation_id,
        )
