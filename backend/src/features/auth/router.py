from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db.database import get_db

from src.features.auth.schema import (
    UserCreate,
    UserResponse
)

from src.features.auth.service import (
    register_user_service
)

from src.dependencies.auth import verify_firebase_user

router = APIRouter(tags=["Auth"])


@router.post(
    "/register",
    response_model=UserResponse
)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    return register_user_service(db, user)


@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    db: Session = Depends(get_db),
    firebase_user: dict = Depends(verify_firebase_user)
):
    """
    Returns the backend profile for the currently authenticated Firebase user.
    Called by the mobile app when its local SQLite DB is wiped or reset,
    so it can re-seed the users table and avoid FK constraint failures.
    """
    from src.features.auth.repository import get_user_by_email

    user = get_user_by_email(db, firebase_user["email"])

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found. The account may not be fully registered."
        )

    return user