import json
from datetime import datetime
from sqlalchemy.orm import Session

from .model import SessionReport


def get_by_report_id(db: Session, report_id: str) -> SessionReport | None:
    return db.query(SessionReport).filter(SessionReport.id == report_id).first()


def get_by_session_id(db: Session, session_id: str) -> list[SessionReport]:
    return (
        db.query(SessionReport)
        .filter(SessionReport.session_id == session_id)
        .order_by(SessionReport.created_at.desc())
        .all()
    )


def create_or_get(
    db: Session,
    report_id: str,
    session_id: str,
    evaluator_id: str,
    total_samples: int,
    total_classified: int,
    total_corrections: int,
    asv_distribution: dict,
    gt_distribution: dict,
    csv_file_path: str | None = None,
) -> tuple[SessionReport, bool]:
    existing = get_by_report_id(db, report_id)
    if existing:
        return existing, False

    record = SessionReport(
        id=report_id,
        session_id=session_id,
        evaluator_id=evaluator_id,
        total_samples=total_samples,
        total_classified=total_classified,
        total_corrections=total_corrections,
        asv_distribution=json.dumps(asv_distribution),
        gt_distribution=json.dumps(gt_distribution),
        csv_file_path=csv_file_path,
        upload_status="UPLOADED",
        uploaded_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, True
