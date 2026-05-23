from fastapi import HTTPException
from sqlalchemy.orm import Session


from src.features.user.model import User
from src.features.auth.schema import UserCreate
from src.features.auth.repository import (
    get_user_by_email,
    create_user
)


def register_user_service(
    db: Session,
    payload: UserCreate
):

    existing_user = get_user_by_email(
        db,
        payload.email
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    new_user = User(
        firebase_uid=payload.firebase_uid,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        institution=payload.institution,
        is_approved=False
    )

    return create_user(db, new_user)