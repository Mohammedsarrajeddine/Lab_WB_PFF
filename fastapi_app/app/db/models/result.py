"""Lab result domain models — LabResult, ResultAuditLog.

Enum columns use ``create_type=False`` because PostgreSQL ENUM types are managed
by Alembic migrations. The database enforces valid enum values at the server level.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ResultStatus(StrEnum):
    PENDING_VALIDATION = "pending_validation"
    APPROVED = "approved"
    SENDING = "sending"
    DELIVERED = "delivered"
    DELIVERY_FAILED = "delivery_failed"
    REJECTED = "rejected"


MAX_DELIVERY_RETRIES = 3


class LabResult(TimestampMixin, Base):
    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    analysis_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ResultStatus] = mapped_column(
        Enum(
            ResultStatus,
            name="result_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
        default=ResultStatus.PENDING_VALIDATION,
        server_default=ResultStatus.PENDING_VALIDATION.value,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    operator_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis_request = relationship("AnalysisRequest")


class ResultAuditLog(TimestampMixin, Base):
    __tablename__ = "result_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    lab_result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lab_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    operator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operator_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    lab_result = relationship("LabResult")
