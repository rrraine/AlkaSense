from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.features.user.model import User
from src.features.auth.schema import UserCreate, UserResponse

router = APIRouter(tags=["Auth"])


@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        firebase_uid=user.firebase_uid,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        institution=user.institution,
        is_approved=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user