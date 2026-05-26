from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    firebase_uid: str
    email: Optional[EmailStr] = None
    full_name: str
    role: str
    institution: str


class UserResponse(BaseModel):
    id: int
    firebase_uid: str
    email: Optional[str] = None
    full_name: str
    role: str
    institution: str
    is_approved: bool

    class Config:
        from_attributes = True