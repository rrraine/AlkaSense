# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AlkaSense is a mobile-first, offline-capable app for automated rice grain evaluation using Alkali Spreading Value (ASV) scoring (IRRI 1–7 scale). It consists of three independently developed sub-systems that integrate at increment close:

- **`mobile/`** — React Native / Expo (SDK 54) frontend with on-device TFLite inference and local SQLite persistence
- **`backend/`** — FastAPI / PostgreSQL REST API with Firebase Auth, Alembic migrations, and Grad-CAM heatmap generation
- **`ml/`** — Offline CNN training pipeline (EfficientNet-B1 → TFLite) for ASV classification

## Development Commands

### Frontend (mobile/)
```bash
cd mobile
npm install --legacy-peer-deps   # after pulling dependency changes
npx expo start                   # start dev server; scan QR with Expo Go
npx expo start --android         # target Android specifically
```

**Required `mobile/.env`:**
```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000   # use local IP, NOT localhost
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
EXPO_PUBLIC_APP_ENV=development
```
Also place `google-services.json` (from Firebase Console) in `mobile/`.

### Backend (backend/)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # macOS/Linux
# .venv\Scripts\activate           # Windows
pip install -r requirements.txt

uvicorn src.main:app --reload --host 0.0.0.0   # start server
# API docs: http://localhost:8000/docs
# Health check: GET /health

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
```

After adding/removing Python packages: `pip freeze > requirements.txt` then commit.

**Required `backend/.env`:**
```env
FIREBASE_PROJECT_ID=alkasense
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@alkasense.iam.gserviceaccount.com
DATABASE_URL=<neon.tech connection string>
APP_ENV=development
SECRET_KEY=alkasense-secret-change-this-later
```

### ML (ml/)
```bash
cd ml
pip install -r requirements.txt
# Create ml/.env with ANTHROPIC_API_KEY=sk-ant-...

python scripts/prepare_dataset.py   # ingest raw images, build train/val/test splits
python scripts/train.py             # two-phase EfficientNetB1 training
python scripts/export_tflite.py     # convert SavedModel → INT8 quantized .tflite

tensorboard --logdir logs/training/ # monitor at http://localhost:6006

# Auto-training watchers (run in background)
python scripts/watcher.py &         # watches data/upload_queue/ for new images
python scripts/sync_trigger.py &    # triggers retrain on reconnect if queue has ≥5 new images
```

## Architecture

### Backend: Vertical Slice + Layered

Strict layer order: **Router → Service → Repository → Database**

```
backend/src/
├── core/           # config.py, firebase.py, security.py, models.py
├── dependencies/   # auth.py (verify_firebase_user), database.py (get_db)
├── db/             # database.py (SQLAlchemy engine), base.py (import all models for Alembic)
├── features/       # one folder per feature, each with router/service/repository/schema/model
│   ├── auth/
│   ├── user/
│   ├── sample/
│   └── session/
├── services/       # shared services (AI inference, upload, storage)
├── templates/      # Jinja2 admin views
└── utils/          # global helpers
```

**Adding a new backend feature** — create `src/features/<name>/` with `router.py`, `service.py`, `repository.py`, `schema.py`, and `model.py` (if DB table needed). Then:
1. Import the model in `src/db/base.py` so Alembic detects it
2. Register the router in `main.py` via `app.include_router(...)`
3. Run `alembic revision --autogenerate` + `alembic upgrade head`

Key rules:
- Use `from src.dependencies.database import get_db` — never create DB sessions manually in routers
- Use `from src.dependencies.auth import verify_firebase_user` — never verify Firebase tokens manually
- Routers call services only; services call repositories only; repositories do SQLAlchemy only

### Frontend: Screen + Centralized API + Local DB

```
mobile/src/
├── app/            # screens (one file per screen)
├── components/     # reusable components (camera.tsx, etc.)
├── core/
│   ├── firebase.ts
│   └── api/        # client.ts (apiFetch), auth.ts, session.ts, sample.ts
├── db/
│   ├── database.ts                    # SQLite connection + table creation
│   └── repositories/                  # SessionRepository.ts, SampleRepository.ts
├── services/       # apiClient.ts
├── store/          # sessionStore.ts (Zustand — UI state only, not persistence)
└── validators/     # input validation
```

**Critical rule:** Never call `fetch()` directly inside screens. All API calls must go through `core/api/client.ts` → `apiFetch()`. Each backend feature needs a matching `core/api/<feature>.ts` file.

Physical device testing requires `EXPO_PUBLIC_API_URL` set to your machine's LAN IP (e.g., `192.168.3.13:8000`), not `localhost`.

**Expo note:** Always read versioned Expo docs at `https://docs.expo.dev/versions/v55.0.0/` before writing Expo-specific code.

### ML: EfficientNet-B1 → TFLite

- 7-class classification (ASV scores 1–7); GT class (HIGH/INTERMEDIATE/LOW) is derived post-inference via a deterministic IRRI lookup table — the CNN never predicts GT directly
- Two-phase training: Phase 1 freezes EfficientNet base, Phase 2 fine-tunes top 20 layers
- All hyperparameters live in `config/alkasense_config.yaml`
- Dataset images must follow `{index} - {asv_score}.jpg` naming; decimal sub-scores (e.g., `1.4`) are mapped to integer class (`asv_1`)
- The `.tflite` model is bundled inside the APK in `mobile/assets/models/`
- After export, append to `models/tflite/VERSION_LOG.txt`

## Git Workflow

Branch naming: `frontend/<name>`, `backend/<name>`, `ai-ml/<name>`

Before pushing: `git pull origin main && git merge main` to resolve conflicts first. For `package.json` or `requirements.txt` merge conflicts, accept both changes then re-run the install command.

Do not commit: `.venv/`, `__pycache__/`, `node_modules/`, `.env`, `google-services.json`, model weights, or datasets.
