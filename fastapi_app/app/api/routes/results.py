from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.db.repositories.result_repo import ResultRepository
from app.schemas.result import ResultUploadIn, ResultStatusUpdateIn, ResultOut
from app.services.results.result_service import (
    AnalysisRequestNotFoundError,
    InvalidResultStatusTransitionError,
    ResultNotFoundError,
    ResultService,
)
from app.db.models.auth import OperatorUser
from app.api.deps.auth import get_current_operator_user

router = APIRouter(prefix="/results", tags=["results"])

@router.post("/conversations/{conversation_id}", response_model=ResultOut)
async def upload_result(
    conversation_id: UUID, 
    payload: ResultUploadIn,
    session: AsyncSession = Depends(get_db_session),
    operator: OperatorUser = Depends(get_current_operator_user)
):
    svc = ResultService(session)
    try:
        res = await svc.upload_result_by_conversation(conversation_id, payload.file_url)
        await session.commit()
        await session.refresh(res)
        return res
    except AnalysisRequestNotFoundError as e:
        await session.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        await session.rollback()
        raise

@router.get("/conversations/{conversation_id}", response_model=list[ResultOut])
async def get_results_for_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    operator: OperatorUser = Depends(get_current_operator_user)
):
    repo = ResultRepository(session)
    return await repo.list_by_conversation(conversation_id)

@router.patch("/{result_id}/status", response_model=ResultOut)
async def update_result_status(
    result_id: UUID,
    payload: ResultStatusUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    operator: OperatorUser = Depends(get_current_operator_user)
):
    svc = ResultService(session)
    try:
        res = await svc.update_result_status(result_id, payload.status, operator, payload.notes)
        await session.commit()
        await session.refresh(res)
        return res
    except InvalidResultStatusTransitionError as e:
        await session.rollback()
        raise HTTPException(status_code=422, detail=str(e))
    except ResultNotFoundError as e:
        await session.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        await session.rollback()
        raise
