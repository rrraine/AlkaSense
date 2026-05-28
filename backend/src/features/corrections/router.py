from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.dependencies.auth import verify_firebase_user
from . import repository
from .schema import CorrectionSyncRequest, CorrectionSyncResponse

router = APIRouter()


@router.post("", response_model=CorrectionSyncResponse, status_code=200)
def sync_correction(
    payload: CorrectionSyncRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_firebase_user),
):
    """
    Accepts a score correction record from the mobile client.
    Idempotent: if correction_id already exists, returns the existing record.
    No FK dependency on sessions or samples — sync-only table.
    """
    if payload.corrected_asv_score == payload.original_asv_score:
        raise HTTPException(
            status_code=422,
            detail="corrected_asv_score must differ from original_asv_score",
        )

    record, created = repository.create_or_get(
        db=db,
        correction_id=payload.correction_id,
        session_id=payload.session_id,
        sample_id=payload.sample_id,
        evaluator_id=current_user["uid"],
        original_asv_score=payload.original_asv_score,
        corrected_asv_score=payload.corrected_asv_score,
        correction_remark=payload.correction_remark,
        confirmed_score_id=payload.confirmed_score_id,
        deviation_remark=payload.deviation_remark,
    )

    return CorrectionSyncResponse(
        id=record.id,
        session_id=record.session_id,
        sample_id=record.sample_id,
        original_asv_score=record.original_asv_score,
        corrected_asv_score=record.corrected_asv_score,
        synced_at=record.synced_at,
        created_at=record.created_at,
        already_existed=not created,
    )
