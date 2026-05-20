from fastapi import Header, HTTPException, Depends
from firebase_admin import auth as firebase_auth

from src.core.firebase import initialize_firebase


def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        initialize_firebase()

        token = authorization.replace("Bearer ", "")
        decoded = firebase_auth.verify_id_token(token)

        return {
            "uid": decoded["uid"],
            "email": decoded.get("email"),
        }

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")