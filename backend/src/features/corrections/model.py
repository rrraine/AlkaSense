from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean

from src.db.database import Base


class CorrectionLog(Base):
    __tablename__ = "correction_log"

    # No FK to sessions or samples — sync-only table, mobile is authoritative.
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, nullable=False, index=True)
    sample_id = Column(String, nullable=False, index=True)
    evaluator_id = Column(String, nullable=False)
    original_asv_score = Column(Integer, nullable=False)
    corrected_asv_score = Column(Integer, nullable=False)
    correction_remark = Column(Text, nullable=False)
    confirmed_score_id = Column(String, nullable=True)
    deviation_remark = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    synced_at = Column(DateTime, nullable=True)
