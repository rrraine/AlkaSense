from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CorrectionSyncRequest(BaseModel):
    correction_id: str
    session_id: str
    sample_id: str
    original_asv_score: int = Field(..., ge=1, le=7)
    corrected_asv_score: int = Field(..., ge=1, le=7)
    correction_remark: str
    confirmed_score_id: Optional[str] = None
    deviation_remark: Optional[str] = None


class CorrectionSyncResponse(BaseModel):
    id: str
    session_id: str
    sample_id: str
    original_asv_score: int
    corrected_asv_score: int
    synced_at: Optional[datetime]
    created_at: datetime
    already_existed: bool

    class Config:
        from_attributes = True
