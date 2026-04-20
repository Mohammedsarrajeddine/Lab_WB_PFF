"""Background task — autonomous result delivery agent.

Polls for APPROVED results, marks them SENDING (optimistic lock),
sends via WhatsApp, then marks DELIVERED or DELIVERY_FAILED.
Includes retry logic with MAX_DELIVERY_RETRIES to prevent infinite loops.
"""

import logging
from uuid import UUID

from app.db.session import AsyncSessionLocal
from app.db.models.result import ResultStatus, ResultAuditLog, MAX_DELIVERY_RETRIES
from app.db.models.intake import AnalysisRequestStatus, ConversationStatus
from app.db.repositories.result_repo import ResultRepository
from app.integrations.whatsapp.client import WhatsAppClient

logger = logging.getLogger(__name__)


async def process_approved_results() -> None:
    """Poll for approved results and deliver them via WhatsApp.

    Safety guarantees:
    1. Status is set to SENDING *before* calling WhatsApp (prevents duplicates)
    2. Each result is processed in its own commit boundary
    3. Failed deliveries increment retry_count; after MAX_DELIVERY_RETRIES
       the status becomes DELIVERY_FAILED (dead letter — no more retries)
    """
    logger.info("Polling for APPROVED results to deliver...")

    async with AsyncSessionLocal() as session:
        repo = ResultRepository(session)
        approved_results = await repo.list_by_status(
            ResultStatus.APPROVED, load_relations=True, for_update=True,
        )

    if not approved_results:
        return

    logger.info("Found %d approved result(s) to deliver.", len(approved_results))
    wa_client = WhatsAppClient.get_instance()

    for result in approved_results:
        await _deliver_single_result(result.id, wa_client)


async def _mark_ineligible_as_failed(
    *,
    repo: ResultRepository,
    result,
    reason: str,
) -> None:
    result.status = ResultStatus.DELIVERY_FAILED
    result.operator_notes = f"Inéligible à l'envoi automatique: {reason}"
    await repo.add_audit_log(
        ResultAuditLog(
            lab_result_id=result.id,
            action="STATUS_CHANGED_TO_DELIVERY_FAILED",
            details=f"Ineligible for automated delivery: {reason}",
        )
    )
    logger.warning("Result %s marked DELIVERY_FAILED: %s", result.id, reason)


async def _deliver_single_result(result_id: UUID, wa_client: WhatsAppClient) -> None:
    """Deliver a single result in its own session/transaction boundary."""
    async with AsyncSessionLocal() as session:
        repo = ResultRepository(session)

        fresh = await repo.find_by_id(result_id, load_relations=True)
        if fresh is None or fresh.status != ResultStatus.APPROVED:
            return  # Already processed by another worker or status changed

        analysis_request = fresh.analysis_request
        conversation = analysis_request.conversation if analysis_request else None
        patient = conversation.patient if conversation else None

        # ── Eligibility checks (PFF requirement) ──
        if not patient or not patient.phone_e164:
            await _mark_ineligible_as_failed(
                repo=repo,
                result=fresh,
                reason="patient has no phone number",
            )
            await session.commit()
            return

        if analysis_request is None:
            await _mark_ineligible_as_failed(
                repo=repo,
                result=fresh,
                reason="analysis request is missing",
            )
            await session.commit()
            return

        if analysis_request.status != AnalysisRequestStatus.PREPARED:
            await _mark_ineligible_as_failed(
                repo=repo,
                result=fresh,
                reason=(
                    "analysis request status is "
                    f"'{analysis_request.status.value}' (expected prepared)"
                ),
            )
            await session.commit()
            return

        if conversation is None:
            await _mark_ineligible_as_failed(
                repo=repo,
                result=fresh,
                reason="conversation is missing",
            )
            await session.commit()
            return

        if conversation.status == ConversationStatus.CLOSED:
            await _mark_ineligible_as_failed(
                repo=repo,
                result=fresh,
                reason="conversation is closed",
            )
            await session.commit()
            return

        # ── Step 1: Mark as SENDING (optimistic lock — prevents duplicates) ──
        fresh.status = ResultStatus.SENDING
        await repo.add_audit_log(
            ResultAuditLog(
                lab_result_id=fresh.id,
                action="STATUS_CHANGED_TO_SENDING",
                details="Automated delivery agent starting send",
            )
        )
        await session.commit()

        # ── Step 2: Actually send via WhatsApp ──
        try:
            msg_text = (
                f"Bonjour {patient.full_name or ''},\n\n"
                f"Vos résultats d'analyses médicales sont prêts et ont été "
                f"validés par notre équipe certifiée.\n"
                f"Vous pouvez consulter votre dossier PDF : {fresh.file_url}\n\n"
                "Cordialement, Laboratoire PFF."
            )
            await wa_client.send_text_message(patient.phone_e164, msg_text)

        except Exception as exc:
            # ── Step 3a: Send failed — increment retry or dead-letter ──
            logger.error("Failed to deliver result %s: %s", fresh.id, exc)
            fresh.retry_count += 1

            if fresh.retry_count >= MAX_DELIVERY_RETRIES:
                fresh.status = ResultStatus.DELIVERY_FAILED
                fresh.operator_notes = (
                    f"Échec définitif après {MAX_DELIVERY_RETRIES} tentatives. "
                    f"Dernière erreur: {str(exc)[:200]}"
                )
                await repo.add_audit_log(
                    ResultAuditLog(
                        lab_result_id=fresh.id,
                        action="STATUS_CHANGED_TO_DELIVERY_FAILED",
                        details=f"Max retries ({MAX_DELIVERY_RETRIES}) exceeded. Last error: {str(exc)[:200]}",
                    )
                )
                logger.error("Result %s permanently failed after %d retries.", fresh.id, MAX_DELIVERY_RETRIES)
            else:
                # Reset to APPROVED so it will be retried on next poll
                fresh.status = ResultStatus.APPROVED
                await repo.add_audit_log(
                    ResultAuditLog(
                        lab_result_id=fresh.id,
                        action="DELIVERY_RETRY_SCHEDULED",
                        details=f"Retry {fresh.retry_count}/{MAX_DELIVERY_RETRIES}. Error: {str(exc)[:200]}",
                    )
                )
                logger.warning("Result %s will be retried (%d/%d).", fresh.id, fresh.retry_count, MAX_DELIVERY_RETRIES)

            await session.commit()
            return

        # ── Step 3b: Send succeeded — mark DELIVERED ──
        fresh.status = ResultStatus.DELIVERED
        fresh.operator_notes = "Envoi automatique WhatsApp réussi"
        await repo.add_audit_log(
            ResultAuditLog(
                lab_result_id=fresh.id,
                action="STATUS_CHANGED_TO_DELIVERED",
                details=f"Auto-delivered to {patient.phone_e164}",
            )
        )
        await session.commit()
        logger.info("Delivered result %s to %s", fresh.id, patient.phone_e164)
