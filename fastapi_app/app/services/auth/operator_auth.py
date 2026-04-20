from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.models.auth import OperatorRole, OperatorUser
from app.schemas.auth import OperatorCreateIn


def normalize_operator_email(email: str) -> str:
    return email.strip().lower()


def parse_operator_role(raw_role: str) -> OperatorRole:
    try:
        return OperatorRole(raw_role.strip().lower())
    except ValueError as exc:
        allowed = ", ".join(role.value for role in OperatorRole)
        raise ValueError(f"Invalid operator role '{raw_role}'. Allowed values: {allowed}") from exc


async def authenticate_operator(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> OperatorUser | None:
    normalized_email = normalize_operator_email(email)
    operator = await session.scalar(
        select(OperatorUser).where(OperatorUser.email == normalized_email)
    )
    if operator is None or not operator.is_active:
        return None

    if not verify_password(password, operator.password_hash):
        return None

    operator.last_login_at = datetime.now(UTC)
    await session.flush()
    await session.refresh(operator)
    return operator


async def create_operator(
    session: AsyncSession,
    *,
    payload: OperatorCreateIn,
) -> OperatorUser:
    operator = OperatorUser(
        email=normalize_operator_email(payload.email),
        full_name=payload.full_name.strip() if payload.full_name else None,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    session.add(operator)
    await session.flush()
    await session.refresh(operator)
    return operator


async def ensure_initial_operator_if_configured(session: AsyncSession) -> bool:
    initial_email = settings.auth_initial_operator_email
    initial_password = settings.auth_initial_operator_password

    if not initial_email or not initial_password:
        return False

    normalized_email = normalize_operator_email(initial_email)
    existing_operator = await session.scalar(
        select(OperatorUser).where(OperatorUser.email == normalized_email)
    )
    if existing_operator is not None:
        return False

    existing_count = int((await session.execute(select(func.count()).select_from(OperatorUser))).scalar_one())
    if existing_count > 0:
        return False

    initial_role = parse_operator_role(settings.auth_initial_operator_role)
    operator = OperatorUser(
        email=normalized_email,
        full_name=settings.auth_initial_operator_full_name.strip() or None,
        password_hash=hash_password(initial_password),
        role=initial_role,
        is_active=True,
    )
    session.add(operator)
    await session.flush()
    return True
