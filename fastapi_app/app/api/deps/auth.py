from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenValidationError, decode_access_token
from app.db.models.auth import OperatorRole, OperatorUser
from app.db.session import get_db_session

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_operator_user(
    session: AsyncSession = Depends(get_db_session),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> OperatorUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = decode_access_token(credentials.credentials)
        operator_id = UUID(claims.subject)
    except (TokenValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    operator = await session.scalar(
        select(OperatorUser).where(OperatorUser.id == operator_id)
    )
    if operator is None or not operator.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Operator account is inactive or unavailable",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if operator.role.value != claims.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token role mismatch",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return operator


def require_operator_roles(*allowed_roles: OperatorRole):
    allowed = set(allowed_roles)
    if not allowed:
        raise ValueError("At least one role is required")

    async def dependency(
        current_operator: OperatorUser = Depends(get_current_operator_user),
    ) -> OperatorUser:
        if current_operator.role not in allowed:
            role_list = ", ".join(sorted(role.value for role in allowed))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {role_list}",
            )

        return current_operator

    return dependency
