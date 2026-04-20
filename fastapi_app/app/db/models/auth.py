from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OperatorRole(StrEnum):
    INTAKE_OPERATOR = "intake_operator"
    INTAKE_MANAGER = "intake_manager"
    ADMIN = "admin"


class OperatorUser(Base):
    __tablename__ = "operator_users"
    __table_args__ = (
        Index("ix_operator_users_role_active", "role", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[OperatorRole] = mapped_column(
        Enum(
            OperatorRole,
            name="operator_role_enum",
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False,
        ),
        nullable=False,
        default=OperatorRole.INTAKE_OPERATOR,
        server_default=OperatorRole.INTAKE_OPERATOR.value,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
