from fastapi import APIRouter, Depends
from src.core.auth import get_current_user

router = APIRouter()

@router.get("/me")
def get_me(user = Depends(get_current_user)):
    return {
        "message": "Authenticated user",
        "user": user
    }