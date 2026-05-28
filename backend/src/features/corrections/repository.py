from datetime import datetime
from sqlalchemy.orm import Session

from .model import CorrectionLog


def get_by_correction_id(db: Session, correction_id: str) -> CorrectionLog | None:
    return db.query(CorrectionLog).filter(CorrectionLog.id == correction_id).first()


def get_by_session(db: Session, session_id: str) -> list[CorrectionLog]:
    return (
        db.query(CorrectionLog)
        .filter(CorrectionLog.session_id == session_id)
        .order_by(CorrectionLog.created_at.desc())
        .all()
    )


def create_or_get(
    db: Session,
    correction_id: str,
    session_id: str,
    sample_id: str,
    evaluator_id: str,
    original_asv_score: int,
    corrected_asv_score: int,
    correction_remark: str,
    confirmed_score_id: str | None,
    deviation_remark: str | None,
) -> tuple[CorrectionLog, bool]:
    existing = get_by_correction_id(db, correction_id)
    if existing:
        return existing, False

    now = datetime.utcnow()
    record = CorrectionLog(
        id=correction_id,
        session_id=session_id,
        sample_id=sample_id,
        evaluator_id=evaluator_id,
        original_asv_score=original_asv_score,
        corrected_asv_score=corrected_asv_score,
        correction_remark=correction_remark,
        confirmed_score_id=confirmed_score_id,
        deviation_remark=deviation_remark,
        synced_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, True
