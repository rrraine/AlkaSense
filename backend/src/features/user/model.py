from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime

from src.db.database import Base



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    firebase_uid = Column(String, unique=True, index=True, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)

    full_name = Column(String, nullable=False)

    role = Column(String, nullable=False)

    institution = Column(String, nullable=False)

    is_approved = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)