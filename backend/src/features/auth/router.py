from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.database import get_db

from src.features.auth.schema import (
    UserCreate,
    UserResponse
)

from src.features.auth.service import (
    register_user_service
)

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