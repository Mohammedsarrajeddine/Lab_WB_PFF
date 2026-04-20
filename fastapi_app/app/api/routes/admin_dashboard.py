"""Admin-only endpoints: dashboard stats, list patients, list operators,
internal notes, reference data (assurances, channels)."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_operator_roles, get_current_operator_user
from app.db.models.auth import OperatorRole, OperatorUser
from app.db.models.intake import (
    Conversation,
    ConversationStatus,
    InternalNote,
    Message,
    Patient,
    Prescription,
)
from app.db.models.catalog import AnalysisCatalogItem, Channel, Insurance
from app.db.session import get_db_session
from app.schemas.auth import OperatorUserOut
from app.schemas.admin import (
    ChannelOut,
    InsuranceOut,
    InternalNoteCreate,
    InternalNoteOut,
    OperatorCreate,
    OperatorUpdate,
    PatientCreate,
    PatientUpdate,
)
from app.core.security import hash_password

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin"])

admin_only = Depends(require_operator_roles(OperatorRole.ADMIN))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_patients: int
    total_conversations: int
    open_conversations: int
    pending_conversations: int
    prepared_conversations: int
    closed_conversations: int
    total_messages: int
    total_prescriptions: int
    total_analyses_catalog: int
    total_operators: int
    active_operators: int


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str | None
    phone_e164: str
    date_of_birth: str | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    reference_number: str | None = None
    insurance_id: UUID | None = None
    insurance_name: str | None = None
    channel_id: UUID | None = None
    channel_name: str | None = None
    conversation_count: int = 0
    last_message_at: str | None = None
    created_at: str


class PatientListResponse(BaseModel):
    items: list[PatientOut]
    total: int


class OperatorListResponse(BaseModel):
    items: list[OperatorUserOut]
    total: int


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    message: str
    time: str
    read: bool = False


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    unread_count: int


# ---------------------------------------------------------------------------
# Dashboard Stats
# ---------------------------------------------------------------------------

@router.get(
    "/admin/dashboard",
    response_model=DashboardStats,
    dependencies=[admin_only],
    summary="Get dashboard statistics (admin only)",
)
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_db_session),
) -> DashboardStats:
    total_patients = await session.scalar(select(func.count(Patient.id))) or 0
    total_conversations = await session.scalar(select(func.count(Conversation.id))) or 0
    open_convs = await session.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.status == ConversationStatus.OPEN
        )
    ) or 0
    pending_convs = await session.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.status == ConversationStatus.PENDING_REVIEW
        )
    ) or 0
    prepared_convs = await session.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.status == ConversationStatus.PREPARED
        )
    ) or 0
    closed_convs = await session.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.status == ConversationStatus.CLOSED
        )
    ) or 0
    total_messages = await session.scalar(select(func.count(Message.id))) or 0
    total_prescriptions = await session.scalar(select(func.count(Prescription.id))) or 0
    total_catalog = await session.scalar(select(func.count(AnalysisCatalogItem.id))) or 0
    total_operators = await session.scalar(select(func.count(OperatorUser.id))) or 0
    active_operators = await session.scalar(
        select(func.count(OperatorUser.id)).where(OperatorUser.is_active == True)
    ) or 0

    return DashboardStats(
        total_patients=total_patients,
        total_conversations=total_conversations,
        open_conversations=open_convs,
        pending_conversations=pending_convs,
        prepared_conversations=prepared_convs,
        closed_conversations=closed_convs,
        total_messages=total_messages,
        total_prescriptions=total_prescriptions,
        total_analyses_catalog=total_catalog,
        total_operators=total_operators,
        active_operators=active_operators,
    )


# ---------------------------------------------------------------------------
# List Patients
# ---------------------------------------------------------------------------

async def _build_patient_out(p: Patient, session: AsyncSession) -> PatientOut:
    """Helper to build PatientOut from a Patient model instance."""
    conv_count = await session.scalar(
        select(func.count(Conversation.id)).where(Conversation.patient_id == p.id)
    ) or 0
    last_msg = await session.scalar(
        select(func.max(Conversation.last_message_at)).where(
            Conversation.patient_id == p.id
        )
    )
    insurance_name = None
    if p.insurance_id:
        ins = await session.get(Insurance, p.insurance_id)
        insurance_name = ins.name if ins else None
    channel_name = None
    if p.channel_id:
        ch = await session.get(Channel, p.channel_id)
        channel_name = ch.name if ch else None

    return PatientOut(
        id=p.id,
        full_name=p.full_name,
        phone_e164=p.phone_e164,
        date_of_birth=p.date_of_birth.isoformat() if p.date_of_birth else None,
        gender=p.gender,
        address=p.address,
        city=p.city,
        reference_number=p.reference_number,
        insurance_id=p.insurance_id,
        insurance_name=insurance_name,
        channel_id=p.channel_id,
        channel_name=channel_name,
        conversation_count=conv_count,
        last_message_at=last_msg.isoformat() if last_msg else None,
        created_at=p.created_at.isoformat(),
    )


@router.get(
    "/admin/patients",
    response_model=PatientListResponse,
    dependencies=[admin_only],
    summary="List all patients (admin only)",
)
async def list_patients(
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> PatientListResponse:
    base_q = select(Patient)
    count_q = select(func.count(Patient.id))

    if search:
        pattern = f"%{search}%"
        base_q = base_q.where(
            Patient.full_name.ilike(pattern) | Patient.phone_e164.ilike(pattern)
        )
        count_q = count_q.where(
            Patient.full_name.ilike(pattern) | Patient.phone_e164.ilike(pattern)
        )

    total = await session.scalar(count_q) or 0
    rows = (
        await session.scalars(
            base_q.order_by(Patient.created_at.desc()).limit(limit).offset(offset)
        )
    ).all()

    items = [await _build_patient_out(p, session) for p in rows]
    return PatientListResponse(items=items, total=total)


@router.post(
    "/admin/patients",
    response_model=PatientOut,
    dependencies=[admin_only],
    summary="Create a new patient (admin only)",
)
async def create_patient(
    payload: PatientCreate,
    session: AsyncSession = Depends(get_db_session),
) -> PatientOut:
    existing = await session.scalar(select(Patient).where(Patient.phone_e164 == payload.phone_e164))
    if existing:
        raise HTTPException(status_code=400, detail="Patient with this phone already exists")

    patient = Patient(
        full_name=payload.full_name,
        phone_e164=payload.phone_e164,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        address=payload.address,
        city=payload.city,
        insurance_id=payload.insurance_id,
        channel_id=payload.channel_id,
    )
    session.add(patient)
    await session.commit()
    await session.refresh(patient)
    return await _build_patient_out(patient, session)


@router.get(
    "/admin/patients/{patient_id}",
    response_model=PatientOut,
    dependencies=[admin_only],
    summary="Get a patient (admin only)",
)
async def get_patient(
    patient_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PatientOut:
    patient = await session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return await _build_patient_out(patient, session)


@router.patch(
    "/admin/patients/{patient_id}",
    response_model=PatientOut,
    dependencies=[admin_only],
    summary="Update a patient (admin only)",
)
async def update_patient(
    patient_id: UUID,
    payload: PatientUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> PatientOut:
    patient = await session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if payload.phone_e164 and payload.phone_e164 != patient.phone_e164:
        existing = await session.scalar(select(Patient).where(Patient.phone_e164 == payload.phone_e164))
        if existing:
             raise HTTPException(status_code=400, detail="Phone number already in use")
        patient.phone_e164 = payload.phone_e164

    for field in ("full_name", "date_of_birth", "gender", "address", "city", "insurance_id", "channel_id"):
        val = getattr(payload, field)
        if val is not None:
            setattr(patient, field, val)

    await session.commit()
    await session.refresh(patient)
    return await _build_patient_out(patient, session)

@router.delete(
    "/admin/patients/{patient_id}",
    dependencies=[admin_only],
    summary="Delete a patient (admin only)",
)
async def delete_patient(
    patient_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    patient = await session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await session.delete(patient)
    await session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# List Operators
# ---------------------------------------------------------------------------

@router.get(
    "/admin/operators",
    response_model=OperatorListResponse,
    dependencies=[admin_only],
    summary="List all operators (admin only)",
)
async def list_operators(
    session: AsyncSession = Depends(get_db_session),
) -> OperatorListResponse:
    total = await session.scalar(select(func.count(OperatorUser.id))) or 0
    rows = (
        await session.scalars(
            select(OperatorUser).order_by(OperatorUser.created_at.desc())
        )
    ).all()

    return OperatorListResponse(
        items=[OperatorUserOut.model_validate(op) for op in rows],
        total=total,
    )

@router.post(
    "/admin/operators",
    response_model=OperatorUserOut,
    dependencies=[admin_only],
    summary="Create a new operator (admin only)",
)
async def create_operator(
    payload: OperatorCreate,
    session: AsyncSession = Depends(get_db_session),
) -> OperatorUserOut:
    existing = await session.scalar(select(OperatorUser).where(OperatorUser.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Operator with this email already exists")
    
    op = OperatorUser(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    session.add(op)
    await session.commit()
    await session.refresh(op)
    return OperatorUserOut.model_validate(op)

@router.get(
    "/admin/operators/{operator_id}",
    response_model=OperatorUserOut,
    dependencies=[admin_only],
    summary="Get an operator (admin only)",
)
async def get_operator(
    operator_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> OperatorUserOut:
    op = await session.get(OperatorUser, operator_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    return OperatorUserOut.model_validate(op)

@router.patch(
    "/admin/operators/{operator_id}",
    response_model=OperatorUserOut,
    dependencies=[admin_only],
    summary="Update an operator (admin only)",
)
async def update_operator(
    operator_id: UUID,
    payload: OperatorUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> OperatorUserOut:
    op = await session.get(OperatorUser, operator_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
        
    if payload.email and payload.email != op.email:
        existing = await session.scalar(select(OperatorUser).where(OperatorUser.email == payload.email))
        if existing:
             raise HTTPException(status_code=400, detail="Email already in use")
        op.email = payload.email
        
    if payload.full_name is not None:
        op.full_name = payload.full_name
    if payload.role is not None:
        op.role = payload.role
    if payload.is_active is not None:
        op.is_active = payload.is_active
    if payload.password:
        op.password_hash = hash_password(payload.password)
        
    await session.commit()
    await session.refresh(op)
    return OperatorUserOut.model_validate(op)

@router.delete(
    "/admin/operators/{operator_id}",
    dependencies=[admin_only],
    summary="Delete an operator (admin only)",
)
async def delete_operator(
    operator_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    op = await session.get(OperatorUser, operator_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    await session.delete(op)
    await session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Notifications (poll-based)
# ---------------------------------------------------------------------------

@router.get(
    "/admin/notifications",
    response_model=NotificationListResponse,
    dependencies=[admin_only],
    summary="Get recent notifications (admin only)",
)
async def get_notifications(
    session: AsyncSession = Depends(get_db_session),
) -> NotificationListResponse:
    """Build notifications from recent DB activity."""
    notifications: list[NotificationItem] = []

    # New open conversations
    open_convs = (
        await session.scalars(
            select(Conversation)
            .where(Conversation.status == ConversationStatus.OPEN)
            .order_by(Conversation.created_at.desc())
            .limit(10)
        )
    ).all()

    for conv in open_convs:
        patient = await session.get(Patient, conv.patient_id) if conv.patient_id else None
        name = patient.full_name if patient and patient.full_name else "Patient inconnu"
        notifications.append(
            NotificationItem(
                id=f"conv-{conv.id}",
                type="conversation",
                title="Nouvelle conversation",
                message=f"{name} a envoyé un message",
                time=conv.created_at.isoformat() if conv.created_at else "",
            )
        )

    # Pending review conversations
    pending_convs = (
        await session.scalars(
            select(Conversation)
            .where(Conversation.status == ConversationStatus.PENDING_REVIEW)
            .order_by(Conversation.updated_at.desc())
            .limit(5)
        )
    ).all()

    for conv in pending_convs:
        patient = await session.get(Patient, conv.patient_id) if conv.patient_id else None
        name = patient.full_name if patient and patient.full_name else "Patient inconnu"
        notifications.append(
            NotificationItem(
                id=f"pending-{conv.id}",
                type="pending",
                title="En attente de revue",
                message=f"La conversation de {name} attend une revue",
                time=conv.updated_at.isoformat() if conv.updated_at else "",
            )
        )

    # Recent prescriptions
    recent_prescriptions = (
        await session.scalars(
            select(Prescription)
            .order_by(Prescription.created_at.desc())
            .limit(5)
        )
    ).all()

    for rx in recent_prescriptions:
        notifications.append(
            NotificationItem(
                id=f"rx-{rx.id}",
                type="prescription",
                title="Ordonnance reçue",
                message=f"Nouvelle ordonnance ({rx.extraction_status})",
                time=rx.created_at.isoformat() if rx.created_at else "",
            )
        )

    # Sort by time descending
    notifications.sort(key=lambda n: n.time, reverse=True)
    notifications = notifications[:20]

    return NotificationListResponse(
        items=notifications,
        unread_count=len(notifications),
    )


# ---------------------------------------------------------------------------
# Internal Notes
# ---------------------------------------------------------------------------

@router.get(
    "/admin/conversations/{conversation_id}/notes",
    response_model=list[InternalNoteOut],
    dependencies=[admin_only],
    summary="List internal notes for a conversation",
)
async def list_internal_notes(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[InternalNoteOut]:
    conv = await session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    rows = (
        await session.scalars(
            select(InternalNote)
            .where(InternalNote.conversation_id == conversation_id)
            .order_by(InternalNote.created_at.desc())
        )
    ).all()

    items: list[InternalNoteOut] = []
    for n in rows:
        author = await session.get(OperatorUser, n.user_id)
        items.append(
            InternalNoteOut(
                id=n.id,
                conversation_id=n.conversation_id,
                user_id=n.user_id,
                content=n.content,
                is_pinned=n.is_pinned,
                author_name=author.full_name if author else None,
                created_at=n.created_at.isoformat(),
                updated_at=n.updated_at.isoformat(),
            )
        )
    return items


@router.post(
    "/admin/conversations/{conversation_id}/notes",
    response_model=InternalNoteOut,
    summary="Create an internal note on a conversation",
)
async def create_internal_note(
    conversation_id: UUID,
    payload: InternalNoteCreate,
    current_user: OperatorUser = Depends(get_current_operator_user),
    session: AsyncSession = Depends(get_db_session),
) -> InternalNoteOut:
    conv = await session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    note = InternalNote(
        conversation_id=conversation_id,
        user_id=current_user.id,
        content=payload.content,
        is_pinned=payload.is_pinned,
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)

    return InternalNoteOut(
        id=note.id,
        conversation_id=note.conversation_id,
        user_id=note.user_id,
        content=note.content,
        is_pinned=note.is_pinned,
        author_name=current_user.full_name,
        created_at=note.created_at.isoformat(),
        updated_at=note.updated_at.isoformat(),
    )


@router.delete(
    "/admin/notes/{note_id}",
    dependencies=[admin_only],
    summary="Delete an internal note",
)
async def delete_internal_note(
    note_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    note = await session.get(InternalNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await session.delete(note)
    await session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Reference Data: Assurances / Channels
# ---------------------------------------------------------------------------

@router.get(
    "/admin/assurances",
    response_model=list[InsuranceOut],
    dependencies=[admin_only],
    summary="List all insurance providers",
)
async def list_assurances(
    session: AsyncSession = Depends(get_db_session),
) -> list[InsuranceOut]:
    rows = (
        await session.scalars(
            select(Insurance).order_by(Insurance.name)
        )
    ).all()
    return [InsuranceOut.model_validate(r) for r in rows]


@router.get(
    "/admin/channels",
    response_model=list[ChannelOut],
    dependencies=[admin_only],
    summary="List all contact channels",
)
async def list_channels(
    session: AsyncSession = Depends(get_db_session),
) -> list[ChannelOut]:
    rows = (
        await session.scalars(
            select(Channel).order_by(Channel.name)
        )
    ).all()
    return [ChannelOut.model_validate(r) for r in rows]
