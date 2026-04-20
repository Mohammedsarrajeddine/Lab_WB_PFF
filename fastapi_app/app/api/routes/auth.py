from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_operator_user, require_operator_roles
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    TokenValidationError,
)
from app.db.models.auth import OperatorRole, OperatorUser
from app.db.session import get_db_session
from app.schemas.auth import (
    AuthLoginIn,
    AuthTokenOut,
    OperatorCreateIn,
    OperatorUserOut,
    RefreshTokenIn,
)
from app.services.auth import authenticate_operator, create_operator

router = APIRouter(tags=["auth"])

limiter = Limiter(key_func=get_remote_address)

admin_access_dependency = Depends(require_operator_roles(OperatorRole.ADMIN))


@router.post("/auth/login", response_model=AuthTokenOut)
@limiter.limit("5/minute")
async def post_auth_login(
    request: Request,
    payload: AuthLoginIn,
    session: AsyncSession = Depends(get_db_session),
) -> AuthTokenOut:
    try:
        operator = await authenticate_operator(
            session,
            email=payload.email,
            password=payload.password,
        )
        if operator is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token, access_expires_in = create_access_token(
            subject=str(operator.id),
            role=operator.role.value,
        )
        refresh_token, refresh_expires_in = create_refresh_token(
            subject=str(operator.id),
        )
        await session.commit()

        return AuthTokenOut(
            access_token=access_token,
            expires_in=access_expires_in,
            refresh_token=refresh_token,
            refresh_expires_in=refresh_expires_in,
            operator=operator,
        )
    except HTTPException:
        await session.rollback()
        raise
    except Exception:
        await session.rollback()
        raise


@router.post("/auth/refresh", response_model=AuthTokenOut)
@limiter.limit("10/minute")
async def post_auth_refresh(
    request: Request,
    payload: RefreshTokenIn,
    session: AsyncSession = Depends(get_db_session),
) -> AuthTokenOut:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    from uuid import UUID

    from sqlalchemy import select

    try:
        claims = decode_refresh_token(payload.refresh_token)
        operator_id = UUID(claims.subject)
    except (TokenValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    operator = await session.scalar(
        select(OperatorUser).where(OperatorUser.id == operator_id)
    )
    if operator is None or not operator.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Operator account is inactive or unavailable",
        )

    access_token, access_expires_in = create_access_token(
        subject=str(operator.id),
        role=operator.role.value,
    )
    refresh_token, refresh_expires_in = create_refresh_token(
        subject=str(operator.id),
    )

    return AuthTokenOut(
        access_token=access_token,
        expires_in=access_expires_in,
        refresh_token=refresh_token,
        refresh_expires_in=refresh_expires_in,
        operator=operator,
    )


@router.get("/auth/me", response_model=OperatorUserOut)
async def get_auth_me(
    current_operator: OperatorUser = Depends(get_current_operator_user),
) -> OperatorUserOut:
    return current_operator


@router.post(
    "/auth/operators",
    response_model=OperatorUserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[admin_access_dependency],
)
async def post_create_operator(
    payload: OperatorCreateIn,
    session: AsyncSession = Depends(get_db_session),
) -> OperatorUserOut:
    try:
        operator = await create_operator(session, payload=payload)
        await session.commit()
        return operator
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Operator email already exists",
        ) from exc
    except Exception:
        await session.rollback()
        raise
