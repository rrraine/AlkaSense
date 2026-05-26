from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.dependencies.auth import verify_firebase_user

from src.features.auth.schema import (
    UserCreate,
    UserResponse
)

from src.features.auth.service import (
    register_user_service,
    get_me_service,
)

router = APIRouter(tags=["Auth"])


@router.post(
    "/register",
    response_model=UserResponse
)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_user),
):
    return register_user_service(db, user)


@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_user),
):
    return get_me_service(db, token_data["uid"])