from sqlalchemy.orm import Session

from src.features.user.model import User


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_firebase_uid(db: Session, firebase_uid: str):
    return db.query(User).filter(User.firebase_uid == firebase_uid).first()


def create_user(db: Session, user: User):
    db.add(user)
    db.commit()
    db.refresh(user)

    return user