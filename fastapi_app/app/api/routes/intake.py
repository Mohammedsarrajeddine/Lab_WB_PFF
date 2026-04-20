import json
import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_operator_roles
from app.core.config import settings
from app.core.security import verify_whatsapp_signature
from app.db.models.auth import OperatorRole
from app.db.models.intake import ConversationStatus, MessageDirection, MessageType
from app.db.repositories import PrescriptionRepository
from app.db.session import get_db_session
from app.integrations.whatsapp.webhook_parser import parse_meta_webhook
from app.schemas.intake import (
    ConversationCloseIn,
    ConversationCloseResult,
    ConversationListResponse,
    ConversationWorkflowState,
    ConversationWorkflowUpdateIn,
    MessageListItem,
    MessageListResponse,
    OutgoingMessageCreateIn,
    PrescriptionDetail,
    PrescriptionListResponse,
    WhatsAppWebhookAck,
    WhatsAppWebhookIn,
)
from app.services.intake.whatsapp_auto_reply import chatbot_auto_reply, media_acknowledgment
from app.services.intake.whatsapp_intake import (
    close_conversation_with_message,
    ConversationNotFoundError,
    CustomerCareWindowClosedError,
    InvalidWorkflowTransitionError,
    MessageConflictError,
    create_outgoing_message,
    ingest_whatsapp_message,
    list_conversations,
    list_messages,
    update_conversation_workflow,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["intake"])

operator_access_dependency = Depends(
    require_operator_roles(
        OperatorRole.INTAKE_OPERATOR,
        OperatorRole.INTAKE_MANAGER,
        OperatorRole.ADMIN,
    )
)


@router.get("/whatsapp/webhook", include_in_schema=False)
async def verify_whatsapp_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
) -> PlainTextResponse:
    if hub_mode != "subscribe":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hub.mode",
        )

    if hub_verify_token != settings.whatsapp_webhook_verify_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook verification token",
        )

    return PlainTextResponse(content=hub_challenge)


@router.post(
    "/whatsapp/webhook",
    status_code=status.HTTP_200_OK,
)
async def receive_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    # --- Verify Meta webhook signature ---
    raw_body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")

    if not verify_whatsapp_signature(
        raw_body, signature_header, settings.whatsapp_app_secret,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature",
        )

    # Parse Meta's nested payload into flat internal messages
    raw_dict = json.loads(raw_body)
    logger.debug("Webhook raw keys: %s", list(raw_dict.keys()))
    parsed_messages = parse_meta_webhook(raw_dict)
    logger.debug("Webhook parsed %d message(s)", len(parsed_messages))

    if not parsed_messages:
        # Status update (delivered/read) or empty — acknowledge
        return {"status": "ok"}

    for payload in parsed_messages:
        logger.debug(
            "Webhook msg: dir=%s type=%s text=%r from=%s",
            payload.direction, payload.message_type,
            (payload.text or "")[:50], payload.from_phone,
        )
        try:
            ack = await ingest_whatsapp_message(session, payload)
            await session.commit()
            logger.info("Webhook ingested, conv_id=%s", ack.conversation_id)

            # Trigger chatbot auto-reply for incoming messages
            chatbot_ok = settings.chatbot_enabled
            dir_ok = payload.direction == MessageDirection.INCOMING
            is_text = payload.message_type == MessageType.TEXT and bool(payload.text)
            is_media = payload.message_type in (MessageType.IMAGE, MessageType.DOCUMENT)
            logger.debug(
                "Auto-reply check: enabled=%s incoming=%s is_text=%s is_media=%s",
                chatbot_ok, dir_ok, is_text, is_media,
            )
            if chatbot_ok and dir_ok and is_text:
                logger.info("Scheduling text auto-reply for %s", payload.from_phone)
                background_tasks.add_task(
                    chatbot_auto_reply,
                    conversation_id=ack.conversation_id,
                    patient_phone=payload.from_phone,
                    patient_message=payload.text,
                )
            elif chatbot_ok and dir_ok and is_media:
                logger.info("Scheduling media ack for %s", payload.from_phone)
                background_tasks.add_task(
                    media_acknowledgment,
                    conversation_id=ack.conversation_id,
                    patient_phone=payload.from_phone,
                    message_type=payload.message_type,
                    prescription_detected=ack.prescription_detected,
                )
        except IntegrityError:
            await session.rollback()
            logger.warning("Duplicate webhook message ignored")
        except Exception:
            await session.rollback()
            logger.exception("Failed to process webhook message")

    return {"status": "ok"}


@router.post(
    "/conversations/{conversation_id}/close",
    response_model=ConversationCloseResult,
    dependencies=[operator_access_dependency],
)
async def post_close_conversation(
    conversation_id: UUID,
    payload: ConversationCloseIn,
    session: AsyncSession = Depends(get_db_session),
) -> ConversationCloseResult:
    try:
        result = await close_conversation_with_message(
            session,
            conversation_id=conversation_id,
            payload=payload,
        )
        await session.commit()
        return result
    except ConversationNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except MessageConflictError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except InvalidWorkflowTransitionError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except CustomerCareWindowClosedError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/conversations/{conversation_id}/messages/outgoing",
    response_model=MessageListItem,
    status_code=status.HTTP_201_CREATED,
    dependencies=[operator_access_dependency],
)
async def post_outgoing_message(
    conversation_id: UUID,
    payload: OutgoingMessageCreateIn,
    session: AsyncSession = Depends(get_db_session),
) -> MessageListItem:
    try:
        message = await create_outgoing_message(
            session,
            conversation_id=conversation_id,
            payload=payload,
        )
        await session.commit()
        return message
    except ConversationNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except MessageConflictError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except CustomerCareWindowClosedError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    dependencies=[operator_access_dependency],
)
async def get_conversations(
    conversation_status: ConversationStatus | None = Query(default=None, alias="status"),
    patient_id: UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationListResponse:
    items, total = await list_conversations(
        session,
        status=conversation_status,
        patient_id=patient_id,
        limit=limit,
        offset=offset,
    )
    return ConversationListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/messages",
    response_model=MessageListResponse,
    dependencies=[operator_access_dependency],
)
async def get_messages(
    conversation_id: UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> MessageListResponse:
    try:
        items, total = await list_messages(
            session,
            conversation_id=conversation_id,
            limit=limit,
            offset=offset,
        )
    except ConversationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return MessageListResponse(items=items, total=total, limit=limit, offset=offset)


@router.patch(
    "/conversations/{conversation_id}/workflow",
    response_model=ConversationWorkflowState,
    dependencies=[operator_access_dependency],
)
async def patch_conversation_workflow(
    conversation_id: UUID,
    payload: ConversationWorkflowUpdateIn,
    session: AsyncSession = Depends(get_db_session),
) -> ConversationWorkflowState:
    try:
        state = await update_conversation_workflow(
            session,
            conversation_id=conversation_id,
            payload=payload,
        )
        await session.commit()
        return state
    except ConversationNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidWorkflowTransitionError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/conversations/{conversation_id}/prescriptions",
    response_model=PrescriptionListResponse,
    summary="List prescriptions for a conversation",
    dependencies=[operator_access_dependency],
)
async def get_conversation_prescriptions(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PrescriptionListResponse:
    repo = PrescriptionRepository(session)
    rows = await repo.list_for_conversation(conversation_id)

    items = [PrescriptionDetail.model_validate(row) for row in rows]
    return PrescriptionListResponse(items=items)


@router.post(
    "/simulate/message",
    response_model=WhatsAppWebhookAck,
    summary="Simulate a patient WhatsApp message (dev/demo)",
    description="Development endpoint to simulate a patient sending a message "
    "via WhatsApp. Only available in simulation mode.",
)
async def simulate_patient_message(
    payload: WhatsAppWebhookIn,
    session: AsyncSession = Depends(get_db_session),
) -> WhatsAppWebhookAck:
    if not settings.whatsapp_simulation_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation mode is disabled",
        )

    try:
        ack = await ingest_whatsapp_message(session, payload=payload)
        await session.commit()
        return ack
    except MessageConflictError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception:
        await session.rollback()
        raise
