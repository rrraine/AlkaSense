from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class ReportUploadRequest(BaseModel):
    session_id: str
    report_id: str
    total_samples: int
    total_classified: int
    total_corrections: int
    asv_distribution: dict
    gt_distribution: dict


class ReportUploadResponse(BaseModel):
    id: str
    session_id: str
    total_samples: int
    total_classified: int
    total_corrections: int
    upload_status: str
    uploaded_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
