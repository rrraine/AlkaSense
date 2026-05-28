from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.features.session.router import router as session_router
from src.features.auth.router import router as auth_router
from src.features.ai.predict import router as ai_router
from src.features.ai.explain_router import router as explain_router
from src.features.reports.router import router as reports_router
from src.features.corrections.router import router as corrections_router
from src.core.firebase import initialize_firebase

app = FastAPI(title="AlkaSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    initialize_firebase()

app.include_router(session_router, prefix="/sessions", tags=["Sessions"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(explain_router, prefix="/ai", tags=["AI"])
app.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(corrections_router, prefix="/corrections", tags=["Corrections"])

@app.get("/health")
def health():
    return {"status": "ok", "project": "AlkaSense"}
