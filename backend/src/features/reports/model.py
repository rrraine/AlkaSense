from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Enum
import enum

from src.db.database import Base


class UploadStatus(str, enum.Enum):
    NOT_UPLOADED = "NOT_UPLOADED"
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    FAILED = "FAILED"


class SessionReport(Base):
    __tablename__ = "session_reports"

    # No FK to sessions — sync-only table, mobile is authoritative.
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, nullable=False, index=True)
    evaluator_id = Column(String, nullable=False)
    total_samples = Column(Integer, nullable=False, default=0)
    total_classified = Column(Integer, nullable=False, default=0)
    total_rejected = Column(Integer, nullable=False, default=0)
    total_corrections = Column(Integer, nullable=False, default=0)
    asv_distribution = Column(Text, nullable=False, default="{}")
    gt_distribution = Column(Text, nullable=False, default="{}")
    csv_file_path = Column(String, nullable=True)
    upload_status = Column(
        String,
        nullable=False,
        default=UploadStatus.UPLOADED,
    )
    uploaded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
