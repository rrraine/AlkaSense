# AlkaSense Backend

Backend service for the AlkaSense system.

The backend is responsible for:

- API handling
- Authentication verification
- Database communication
- AI inference integration
- Upload processing
- Administrative dashboards
- Synchronization services

---

# Tech Stack

## Core Backend

- FastAPI
- Uvicorn
- Python 3.11.9

## Database

- PostgreSQL (Neon)

## Authentication

- Firebase Admin SDK

## AI Integration

- TensorFlow
- tf-keras-vis

## Templating

- Jinja2

---

# Backend Architecture

The backend follows a **Vertical Slice Architecture** approach.

Each feature is self-contained and contains its own:

- routes
- business logic
- schemas
- models
- utilities

This improves:

- scalability
- maintainability
- feature isolation
- team collaboration

---

# Project Structure

```txt
backend/
│
├── main.py
├── requirements.txt
├── README.md
├── .env
│
├── src/
│   ├── core/
│   ├── db/
│   ├── features/
│   ├── services/
│   ├── templates/
│   └── utils/
│
└── tests/
```

---

# Folder Explanations

## `main.py`

Application entry point.

Initializes the FastAPI server and registers feature routers.

---

## `src/core/`

Contains core application configuration and shared backend setup.

Examples:

- environment configuration
- Firebase initialization
- security configuration
- shared middleware

---

## `src/db/`

Handles database-related logic.

Examples:

- database connection
- session management
- migrations
- database utilities

---

## `src/features/`

Contains all backend features using Vertical Slice Architecture.

Each feature should contain:

```txt
feature/
├── router.py
├── service.py
├── schema.py
├── model.py
└── utils.py
```

### Responsibilities

#### `router.py`

Defines API endpoints.

#### `service.py`

Contains business logic.

#### `schema.py`

Defines request/response validation models.

#### `model.py`

Defines database models.

#### `utils.py`

Contains feature-specific helper functions.

---

## `src/services/`

Contains reusable services shared across multiple features.

Examples:

- AI inference service
- upload service
- storage service

---

## `src/templates/`

Contains Jinja2 HTML templates for admin dashboards and server-rendered pages.

---

## `src/utils/`

Contains globally shared utility/helper functions.

---

## `tests/`

Contains backend tests.

---

# Environment Variables

Create a `.env` file inside `backend/`.

Example:

```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# PostgreSQL
DATABASE_URL=
```

⚠️ Never commit `.env` files or Firebase service account keys.

---

# Initial Backend Setup

## 1. Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS/Linux

```bash
python -m venv venv
source venv/bin/activate
```

---

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 3. Run Backend Server

```bash
uvicorn main:app --reload
```

---

## 4. Open Swagger Documentation

Visit:

```txt
http://localhost:8000/docs
```

---

# Feature Development Guide

## Creating a New Feature

Inside:

```txt
src/features/
```

Create a new folder:

```txt
example_feature/
├── router.py
├── service.py
├── schema.py
├── model.py
└── utils.py
```

---

# Development Rules

## Routes

- Keep routers thin
- Do not place heavy business logic inside routes

## Services

- All business logic belongs here

## Schemas

- Use Pydantic models for validation

## Models

- Keep database entities isolated

## Utils

- Only place feature-specific helpers here

---

# Git Workflow

## Main Branch

The `main` branch should always remain:

- stable
- runnable
- documented

---

## Feature Branches

Create separate branches for backend tasks.

Examples:

```txt
backend/auth
backend/database
backend/scan
backend/admin
```

---

# Running Backend Health Check

Endpoint:

```txt
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "project": "AlkaSense"
}
```

---

# AlkaSense Backend

Backend service for the AlkaSense system.

The backend is responsible for:

- API handling
- Authentication verification
- Database communication
- AI inference integration
- Upload processing
- Administrative dashboards
- Synchronization services

---

# Tech Stack

## Core Backend

- FastAPI
- Uvicorn
- Python 3.11.9

## Database

- PostgreSQL (Neon)

## Authentication

- Firebase Admin SDK

## AI Integration

- TensorFlow
- tf-keras-vis

## Templating

- Jinja2

---

# Backend Architecture

The backend follows a **Vertical Slice Architecture** approach.

Each feature is self-contained and contains its own:

- routes
- business logic
- schemas
- models
- utilities

This improves:

- scalability
- maintainability
- feature isolation
- team collaboration

---

# Project Structure

```txt
backend/
│
├── main.py
├── requirements.txt
├── README.md
├── .env
│
├── src/
│   ├── core/
│   ├── db/
│   ├── features/
│   ├── services/
│   ├── templates/
│   └── utils/
│
└── tests/
```

---

# Folder Explanations

## `main.py`

Application entry point.

Initializes the FastAPI server and registers feature routers.

---

## `src/core/`

Contains core application configuration and shared backend setup.

Examples:

- environment configuration
- Firebase initialization
- security configuration
- shared middleware

---

## `src/db/`

Handles database-related logic.

Examples:

- database connection
- session management
- migrations
- database utilities

---

## `src/features/`

Contains all backend features using Vertical Slice Architecture.

Each feature should contain:

```txt
feature/
├── router.py
├── service.py
├── schema.py
├── model.py
└── utils.py
```

### Responsibilities

#### `router.py`

Defines API endpoints.

#### `service.py`

Contains business logic.

#### `schema.py`

Defines request/response validation models.

#### `model.py`

Defines database models.

#### `utils.py`

Contains feature-specific helper functions.

---

## `src/services/`

Contains reusable services shared across multiple features.

Examples:

- AI inference service
- upload service
- storage service

---

## `src/templates/`

Contains Jinja2 HTML templates for admin dashboards and server-rendered pages.

---

## `src/utils/`

Contains globally shared utility/helper functions.

---

## `tests/`

Contains backend tests.

---

# Environment Variables

Create a `.env` file inside `backend/`.

Example:

```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# PostgreSQL
DATABASE_URL=
```

⚠️ Never commit `.env` files or Firebase service account keys.

---

# Initial Backend Setup

## 1. Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS/Linux

```bash
python -m venv venv
source venv/bin/activate
```

---

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 3. Run Backend Server

```bash
uvicorn main:app --reload
```

---

## 4. Open Swagger Documentation

Visit:

```txt
http://localhost:8000/docs
```

---

# Feature Development Guide

## Creating a New Feature

Inside:

```txt
src/features/
```

Create a new folder:

```txt
example_feature/
├── router.py
├── service.py
├── schema.py
├── model.py
└── utils.py
```

---

# Development Rules

## Routes

- Keep routers thin
- Do not place heavy business logic inside routes

## Services

- All business logic belongs here

## Schemas

- Use Pydantic models for validation

## Models

- Keep database entities isolated

## Utils

- Only place feature-specific helpers here

---

# Git Workflow

## Main Branch

The `main` branch should always remain:

- stable
- runnable
- documented

---

## Feature Branches

Create separate branches for backend tasks.

Examples:

```txt
backend/auth
backend/database
backend/scan
backend/admin
```

---

# Running Backend Health Check

Endpoint:

```txt
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "project": "AlkaSense"
}
```

---

# Notes

- Do not commit `.env`
- Do not commit model weights
- Do not commit datasets
- Keep AI training code isolated inside `/ml`
- Backend should only handle inference and API operations
