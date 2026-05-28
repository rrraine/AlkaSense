import json
import os
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.dependencies.auth import verify_firebase_user
from . import repository
from .schema import ReportUploadResponse

router = APIRouter()

UPLOAD_DIR = "uploads/reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=ReportUploadResponse, status_code=200)
async def upload_report(
    session_id: str = Form(...),
    report_id: str = Form(...),
    total_samples: int = Form(...),
    total_classified: int = Form(...),
    total_corrections: int = Form(...),
    asv_distribution: str = Form(...),
    gt_distribution: str = Form(...),
    csv_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_firebase_user),
):
    """
    Accepts a session report upload from the mobile client.
    Idempotent: if report_id already exists, returns the existing record.
    No FK dependency on sessions or samples — sync-only table.
    """
    try:
        asv_dist = json.loads(asv_distribution)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=422, detail="asv_distribution must be valid JSON")

    try:
        gt_dist = json.loads(gt_distribution)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=422, detail="gt_distribution must be valid JSON")

    csv_saved_path: str | None = None
    if csv_file and csv_file.filename:
        dest = os.path.join(UPLOAD_DIR, f"{report_id}.csv")
        try:
            with open(dest, "wb") as f:
                shutil.copyfileobj(csv_file.file, f)
            csv_saved_path = dest
        except Exception as exc:
            # CSV storage failure must not block the upload record
            print(f"[ReportRouter] CSV save failed: {exc}")
        finally:
            await csv_file.close()

    record, created = repository.create_or_get(
        db=db,
        report_id=report_id,
        session_id=session_id,
        evaluator_id=current_user["uid"],
        total_samples=total_samples,
        total_classified=total_classified,
        total_corrections=total_corrections,
        asv_distribution=asv_dist,
        gt_distribution=gt_dist,
        csv_file_path=csv_saved_path,
    )

    return ReportUploadResponse(
        id=record.id,
        session_id=record.session_id,
        total_samples=record.total_samples,
        total_classified=record.total_classified,
        total_corrections=record.total_corrections,
        upload_status=record.upload_status,
        uploaded_at=record.uploaded_at,
        created_at=record.created_at,
    )
