from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.db.models.result import ResultStatus

class ResultUploadIn(BaseModel):
    file_url: str

class ResultStatusUpdateIn(BaseModel):
    status: ResultStatus
    notes: str | None = None

class ResultOut(BaseModel):
    id: UUID
    analysis_request_id: UUID
    file_url: str
    status: ResultStatus
    retry_count: int = 0
    operator_notes: str | None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}
