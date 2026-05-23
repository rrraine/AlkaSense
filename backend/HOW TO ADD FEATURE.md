# AlkaSense — Feature Development Guide

This document standardizes how features are added to the AlkaSense system.

The goal is:

- consistent architecture
- easier collaboration
- scalable backend structure
- predictable frontend integration
- fewer merge conflicts
- easier debugging

---

# Project Architecture

## Backend Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Firebase Authentication

## Mobile Stack

- React Native (Expo)
- Firebase Auth
- centralized API client
- TypeScript

---

# Backend Architecture Pattern

We follow:

```txt
Router → Service → Repository → Database
```

Meaning:

- Router
  - handles HTTP requests/responses
  - validates request schemas
  - calls services

- Service
  - business logic
  - validations
  - orchestration

- Repository
  - database operations only

- Model
  - database table structure

- Schema
  - request/response validation

---

# Backend Folder Structure

```txt
backend/
└── src/
    ├── core/
    │   ├── config.py
    │   ├── firebase.py
    │   ├── models.py
    │   └── security.py
    │
    ├── dependencies/
    │   ├── auth.py
    │   └── database.py
    │
    ├── db/
    │   ├── database.py
    │   └── base.py
    │
    ├── features/
    │   ├── auth/
    │   │   ├── router.py
    │   │   ├── schema.py
    │   │   ├── service.py
    │   │   └── repository.py
    │   │
    │   ├── user/
    │   │   └── model.py
    │   │
    │   └── session/
    │
    └── main.py
```

---

# Mobile Architecture

We now use centralized API communication.

## Mobile Structure

```txt
mobile/
└── src/
    ├── app/
    │
    └── core/
        ├── firebase.ts
        │
        └── api/
            ├── client.ts
            └── auth.ts
```

---

# IMPORTANT — API RULES

## NEVER directly use fetch() inside screens

❌ BAD

```ts
fetch(...)
```

✅ GOOD

```ts
registerUser(...)
```

All API logic must go through: (currently tsx contains the api, we need to move them soon)

```txt
core/api/
```

---

# API CLIENT

## core/api/client.ts

Centralized API utility.

Responsibilities:

- API base URL
- headers
- authorization
- error handling
- JSON parsing

Example:

```ts
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail),
    );
  }

  return data;
}
```

---

# FEATURE API FILES

Each backend feature should have a matching mobile API file.

Example:

```txt
core/api/auth.ts
core/api/session.ts
core/api/sample.ts
```

---

# Example — auth.ts

```ts
import { apiFetch } from "./client";

interface RegisterPayload {
  firebase_uid: string;
  email: string | null;
  full_name: string;
  role: string;
  institution: string;
}

export async function registerUser(token: string, payload: RegisterPayload) {
  return apiFetch("/auth/register", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
```

---

# HOW TO ADD A NEW BACKEND FEATURE

Example:
We want to add:

```txt
sample
```

---

# STEP 1 — Create Feature Folder

Create:

```txt
src/features/sample/
```

---

# STEP 2 — Create Files

Inside feature:

```txt
sample/
├── router.py
├── schema.py
├── service.py
├── repository.py
└── model.py (optional)
```

---

# STEP 3 — Create Model

Example:

```python
from sqlalchemy import Column, Integer, String
from src.db.database import Base

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True)
    rice_type = Column(String)
```

---

# STEP 4 — Register Model

Inside:

```txt
db/base.py
```

import the model:

```python
from src.features.sample.model import Sample
```

This ensures Alembic detects tables.

---

# STEP 5 — Create Schema

Example:

```python
from pydantic import BaseModel

class SampleCreate(BaseModel):
    rice_type: str

class SampleResponse(BaseModel):
    id: int
    rice_type: str

    class Config:
        from_attributes = True
```

---

# STEP 6 — Repository Layer

ONLY database logic here.

```python
from sqlalchemy.orm import Session
from src.features.sample.model import Sample

def create_sample(db: Session, rice_type: str):
    sample = Sample(rice_type=rice_type)

    db.add(sample)
    db.commit()
    db.refresh(sample)

    return sample
```

---

# STEP 7 — Service Layer

Business logic here.

```python
from sqlalchemy.orm import Session

from src.features.sample.repository import create_sample

def create_sample_service(db: Session, rice_type: str):
    return create_sample(db, rice_type)
```

---

# STEP 8 — Router Layer

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.dependencies.database import get_db

from src.features.sample.schema import (
    SampleCreate,
    SampleResponse
)

from src.features.sample.service import (
    create_sample_service
)

router = APIRouter(tags=["Sample"])

@router.post("/", response_model=SampleResponse)
def create_sample(
    payload: SampleCreate,
    db: Session = Depends(get_db)
):
    return create_sample_service(
        db,
        payload.rice_type
    )
```

---

# STEP 9 — Register Router

Inside:

```txt
main.py
```

```python
from src.features.sample.router import router as sample_router

app.include_router(
    sample_router,
    prefix="/samples",
    tags=["Samples"]
)
```

---

# STEP 10 — Create Migration

Inside backend:

```bash
alembic revision --autogenerate -m "create sample table"
```

Then:

```bash
alembic upgrade head
```

---

# HOW TO ADD MOBILE INTEGRATION

---

# STEP 1 — Create API File

```txt
core/api/sample.ts
```

---

# STEP 2 — Add API Functions

```ts
import { apiFetch } from "./client";

export async function createSample(token: string, payload: any) {
  return apiFetch("/samples", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
```

---

# STEP 3 — Use in Screen

```ts
const result = await createSample(token, payload);
```

NOT direct fetch.

---

# DATABASE DEPENDENCY

Use:

```python
from src.dependencies.database import get_db
```

NOT directly from db/database.py

---

# AUTH DEPENDENCY

Use:

```python
from src.dependencies.auth import verify_firebase_user
```

Example:

```python
@router.get("/protected")
def protected_route(
    user=Depends(verify_firebase_user)
):
    return user
```

---

# VENV RULES

We use ONE backend virtual environment.

## Backend venv location

```txt
backend/.venv/
```

---

# IMPORTANT

You CAN use the SAME venv across multiple terminals.

Example:

Terminal 1:

```bash
cd backend
.venv\Scripts\activate
uvicorn src.main:app --reload
```

Terminal 2:

```bash
cd backend
.venv\Scripts\activate
alembic upgrade head
```

No need to create multiple venvs.

---

# MOBILE DOES NOT USE PYTHON VENV

React Native uses:

```txt
node_modules/
```

NOT Python virtual environments.

---

# STARTING THE PROJECT

---

# Backend

```bash
cd backend
.venv\Scripts\activate
uvicorn src.main:app --reload --host 0.0.0.0
```

---

# Mobile

```bash
cd mobile
npm install
npx expo start
```

---

# IMPORTANT NETWORK NOTE

For physical device testing:

Use:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
```

NOT localhost.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.3.13:8000
```

---

# GIT RULES

DO NOT COMMIT:

```txt
.venv/
__pycache__/
node_modules/
.env
```

---

# BEFORE PUSHING

Always:

```bash
git pull origin main
git merge main
```

Resolve conflicts BEFORE coding more.

---

# MERGE CONFLICT RULE

For dependencies:

- usually accept BOTH changes
- then run:

```bash
npm install
```

inside mobile.

---

# DEVELOPMENT PRINCIPLES

## DO

- keep routers thin
- put logic in services
- centralize API calls
- reuse dependencies
- use schemas
- use repositories

## DO NOT

- query DB inside router
- use fetch() inside screens
- duplicate auth logic
- duplicate API URLs
- hardcode tokens
- bypass service layer

---

# CURRENT SYSTEM STATUS

Implemented:

- Firebase Authentication
- backend registration
- centralized mobile API client
- service/repository architecture
- PostgreSQL integration
- Alembic migrations
- modular backend structure

Current Focus:

- backend architecture stabilization
- feature templates
- scalable development workflow
- team standardization
