from fastapi import HTTPException
from sqlalchemy.orm import Session


from src.features.user.model import User
from src.features.auth.schema import UserCreate
from src.features.auth.repository import (
    get_user_by_email,
    get_user_by_firebase_uid,
    create_user
)


def register_user_service(
    db: Session,
    payload: UserCreate
):
    existing_user = get_user_by_firebase_uid(db, payload.firebase_uid)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    if payload.email:
        by_email = get_user_by_email(db, payload.email)
        if by_email:
            raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        firebase_uid=payload.firebase_uid,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        institution=payload.institution,
        is_approved=False
    )

    return create_user(db, new_user)


def get_me_service(db: Session, firebase_uid: str):
    user = get_user_by_firebase_uid(db, firebase_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user