from fastapi import FastAPI
from src.features.session.router import router as session_router
from src.features.auth.router import router as auth_router
from src.core.firebase import initialize_firebase

app = FastAPI(title="AlkaSense API", version="1.0.0")

@app.on_event("startup")
def startup():
    initialize_firebase()

app.include_router(
    session_router,
    prefix="/sessions",
    tags=["Sessions"]
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])

@app.get("/health")
def health():
    return {"status": "ok", "project": "AlkaSense"}