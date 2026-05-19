# AlkaSense MVP — Team Onboarding Guide

> **Project:** AlkaSense  
> **Role of this document:** Onboarding reference for all developers (Frontend, Backend, Full-Stack, AI)  
> **Last updated:** May 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Team Structure & Responsibilities](#2-team-structure--responsibilities)
3. [Official Tech Stack](#3-official-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Phase 1 — Prerequisites](#5-phase-1--prerequisites)
6. [Phase 2 — Frontend Setup](#6-phase-2--frontend-setup)
7. [Phase 3 — Backend Setup](#7-phase-3--backend-setup)
8. [Phase 4 — Service Configuration](#8-phase-4--service-configuration)
9. [Phase 5 — Linking Frontend & Backend](#9-phase-5--linking-frontend--backend)
10. [Running the Project](#10-running-the-project)
11. [Security Guidelines](#11-security-guidelines)
12. [Troubleshooting](#13-troubleshooting)


---

## 1. Project Overview

AlkaSense is a mobile-first, offline-capable application for on-device sensing and AI-powered analysis. The MVP is built with a **React Native / Expo** frontend and a **FastAPI / PostgreSQL** backend, with on-device TFLite inference for core AI features.

**Core design principles:**

- **Offline-first** — 100% of core functions must work without a network connection.
- **Privacy & security** — Firebase Auth for identity only; cert pinning; TLS 1.2+; model integrity checks.
- **Deterministic AI** — On-device inference via TFLite with temperature scaling and observation-score conflict logic.
- **Reporting** — PDF and CSV export within strict time budgets (PDF ≤10s, CSV ≤5s).

---

## 2. Team Structure & Responsibilities

| Role | Responsibilities |
|---|---|
| **Frontend Developer** | React Native / Expo UI, local SQLite persistence, on-device camera & ML inference |
| **Backend Developer** | FastAPI endpoints, PostgreSQL schema, Firebase Admin SDK, Grad-CAM heatmaps |
| **Full-Stack Developer** | Integration between frontend and backend at end of each increment; environment wiring; deployment to Render |
| **AI Developer** | Dataset collection, data analysis, model creation, training, validation, annotation |

> **Integration cadence:** Frontend and backend are developed **in parallel** per increment. The full-stack lead is responsible for linking them at increment close. Do **not** block your work waiting for the other team.

---

## 3. Official Tech Stack

### Frontend
| Library | Purpose |
|---|---|
| React Native + Expo (SDK 54) | Cross-platform mobile framework |
| Zustand | UI state management (not persistence) |
| expo-sqlite | Local database (sessions, samples, eval records, correction log, audit log) |
| expo-camera | Camera feed + overlay |
| expo-secure-store | Secure credential storage |
| expo-crypto | TFLite model hash verification |
| expo-file-system | Image and heatmap file storage |
| expo-sharing | Android share sheet / export |
| expo-print | PDF report generation |
| papaparse | CSV generation |
| react-native-reanimated | Animations |
| Victory Native | Charts |
| react-native-ssl-pinning | Certificate pinning |
| react-native-fast-tflite | On-device TFLite inference |

### Backend
| Library | Purpose |
|---|---|
| FastAPI | REST API framework |
| PostgreSQL (Neon) | Primary database |
| Firebase Auth | Identity / token verification only |
| Jinja2 | Admin interface templates |
| tf-keras-vis (Grad-CAM) | Server-side heatmap generation |
| LIME *(optional)* | Report-only explainability |

### AI / ML
| Component | Location | Purpose |
|---|---|---|
| TFLite model | On-device | Primary inference |
| Keras | Training only (offline) | Model training pipeline |
| Temperature scaling | On-device | Confidence calibration |
| Grad-CAM | Server-side | Visual explanation heatmaps |

### Infrastructure
| Service | Purpose |
|---|---|
| Render (paid tier) | Backend hosting |
| Neon.tech | Managed PostgreSQL |
| Firebase | Auth only |

---

## 4. Repository Structure

```
alkasense/
|
├── mobile/                       
│   ├── App.tsx                   # Entry point
│   ├── app.json                  # Main Expo config file (app name, icons, versions)
│   ├── package.json              # Project dependencies
|   | 
│   ├── assets/                   # Images, assets, resources
│   │    └── models/   
|   | 
│   ├── src/                      # Main source codes
|   │    ├── app/                 # Screens
│   │    ├── Dashboard.tsx
│   │    └── Login.tsx
|   |
│   ├── components/               # Reusable components
│   │    └── camera.tsx
|   |
│   └── db/                                   # Data Access Layer
│        ├── repositories/                    # The "Middlemen" between UI and raw SQLite queries
│        │    ├── SessionRepository.ts        # Manages evaluation event lifecycles (start, complete, sync)
│        │    └── SampleRepository.ts         # Manages individual grain data entries & human score overrides
|        |
│        └── database.ts                      # Handles SQLite database connection & initial table creation
|   
│
│
├── backend/    
│    ├── main.py                    # Entry point
│    ├── package.json               # Project dependencies    
|    |
│    └── src/                       # Main source codes
│         ├── features/             # Vertical Slice Architecture
│         |    ├── feature1/
│         │    |    ├── router.py
│         │    |    ├── service.py
│         │    |    ├── schema.py
│         │    |    ├── model.py
│         │    |    └── utils.py
│         │    |
│         |    └── feature2/
│         |         ├── router.py
│         |         ├── service.py
│         |         ├── schema.py
│         |         ├── model.py
│         |         └── utils.py
│         |    
│         └── templates/            # Jinja2 admin views
│
│
│
└── ml/                 
    ├── dataset             # Rice samples
    │    ├── asv_1/
    │    ├── asv_2/
    │    ├── asv_3/
    │    ├── asv_4/
    │    ├── asv_5/
    │    ├── asv_6/
    │    └── asv_7/
    |
    └── placeholder.py      # Actual structure is up to the AI developers 
```

> Both `mobile/.env` and `backend/.env` are **gitignored**. Never push credentials.

---

## 5. Phase 1 — Prerequisites

Install these tools before anything else.

### Node.js
1. Download from [nodejs.org](https://nodejs.org/en/download) (LTS recommended).
2. Verify: `node -v`

### Expo CLI
```powershell
npm install -g expo-cli
```

### Expo Go (on your phone)
- Download **Expo Go** from the Play Store or App Store.
- You will use this to test the frontend on your physical device.

### Python 3.11
1. Download [Python 3.11.9 — Windows installer (64-bit)](https://www.python.org/downloads/release/python-3119/).
2. During installation:
   - **Uncheck** "Add python.exe to PATH"
   - Click **Custom Installation** → Next → Install
3. Verify inside venv (see Phase 3): `python --version` → must print `3.11.9`

---

## 6. Phase 2 — Frontend Setup

```powershell
cd mobile
```

### Install Expo-managed packages
```powershell
npx expo install `
  expo-sqlite `
  expo-camera `
  expo-secure-store `
  expo-crypto `
  expo-file-system `
  expo-sharing `
  react-native-reanimated `
  papaparse `
  expo-print
```

### Install npm packages
```powershell
npm install `
  zustand `
  victory-native `
  react-native-ssl-pinning `
  react-native-fast-tflite `
  papaparse
```

### Pin Expo SDK version
```powershell
npx expo install expo@sdk-54
```

### Run the frontend (test on phone)
```powershell
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

---

## 7. Phase 3 — Backend Setup

```powershell
cd backend
```

### Activate the virtual environment
```powershell
# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

Your terminal prompt should now show `(venv)`.

### Verify Python version
```powershell
python --version
# Expected: Python 3.11.9
```

### Install Python dependencies
```powershell
pip install `
  fastapi `
  uvicorn `
  python-dotenv `
  pydantic-settings `
  firebase-admin `
  psycopg2-binary `
  jinja2 `
  tensorflow `
  tf-keras-vis `
  Pillow
```

### Fill up .env
Fill up `backend/.env` with the following keys (values provided by full-stack lead or generated by you per Phase 4):

```env
# Firebase
FIREBASE_PROJECT_ID="alkasense"
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL=your_client_email

# PostgreSQL
DATABASE_URL=your_neon_connection_string
```

### Run the backend locally
```powershell
uvicorn main:app --reload
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to confirm the API is running.

### Deactivate when done
```powershell
deactivate
```

---

## 8. Phase 4 — Service Configuration

### I. Firebase

1. Install Firebase SDK:
   ```powershell
   npm install firebase
   ```
2. Go to [firebase.google.com](https://firebase.google.com) → AlkaSense project → **Settings → Service Accounts → Generate new private key**.
3. Copy the credentials into `backend/.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

> ⚠️ **WARNING: NEVER share your service account key.** Only ever place it in `backend/.env`. If you suspect your credentials are exposed, contact the full-stack lead immediately so the key can be revoked and regenerated.

### II. PostgreSQL (Neon)

1. Go to [neon.tech](https://neon.tech).
2. Open project AlkaSense dashboard → **Connection string**.
3. Copy the connection string and paste it into `backend/.env` as `DATABASE_URL`.

### III. Render (Deployment — End of Increment Only)

> **Skip this during local development.** This is only done at deployment time.

1. Push your backend to GitHub.
2. Connect the GitHub repo at [render.com](https://render.com).
3. Set environment variables on Render (same values as `backend/.env`).
4. Deploy.

---

## 9. Phase 5 — Linking Frontend & Backend

> **This phase is handled by the full-stack lead at the end of each increment.**  
> Frontend and backend developers do not need to do this during parallel development.

Once the backend is deployed to Render, create a `.env` file in the `mobile/` directory:

```env
EXPO_PUBLIC_API_URL=https://your-render-app.onrender.com
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
```

All API calls in the frontend should point to:
```javascript
process.env.EXPO_PUBLIC_API_URL
```

---

## 10. Running the Project

### Frontend
```powershell
cd mobile
npx expo start
# Scan QR with Expo Go on your phone
```

### Backend
```powershell
cd backend
venv\Scripts\activate       # Windows
# or: source venv/bin/activate  # macOS/Linux
uvicorn main:app --reload
# Visit: http://localhost:8000/docs
```

---

## 11. Security Guidelines

| Rule | Details |
|---|---|
| Never commit `.env` files | Both `mobile/.env` and `backend/.env` are gitignored. |

---

## 12. Troubleshooting

### Expo Go won't connect
- Ensure your phone and development machine are on the **same Wi-Fi network**.
- SDK mismatch

### `python --version` shows wrong version inside venv
- Make sure you activated the venv **before** running any Python commands.

### `uvicorn` command not found
- You likely forgot to activate the venv. Run `venv\Scripts\activate` first.

### Firebase credentials error on backend start
- Double-check `backend/.env` has the correct `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL`.
- The private key must include the full `-----BEGIN PRIVATE KEY-----` header and footer, wrapped in double quotes in the `.env` file.

### Neon DB connection refused
- Verify the `DATABASE_URL` in `backend/.env` is the full connection string from Neon (including `postgresql://`).

---

> This document is maintained by the full-stack lead. If you find outdated information, raise it immediately so it can be corrected before it causes issues for others.