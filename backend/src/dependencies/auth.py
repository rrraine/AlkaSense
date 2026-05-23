from fastapi import Header, HTTPException
from firebase_admin import auth

from src.core.firebase import initialize_firebase


def verify_firebase_user(
    authorization: str = Header(...)
):
    try:
        initialize_firebase()

        token = authorization.replace("Bearer ", "")
        decoded_token = auth.verify_id_token(token)

        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
        }

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )