import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings

# Initialize Firebase Admin once at startup
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": settings.FIREBASE_PROJECT_ID,
    "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
    "client_email": settings.FIREBASE_CLIENT_EMAIL,
    "token_uri": "https://oauth2.googleapis.com/token",
})

firebase_admin.initialize_app(cred)
bearer = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
):
    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )