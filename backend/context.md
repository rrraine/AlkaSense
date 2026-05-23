# AlkaSense AI Development Context

You are working on AlkaSense.

AlkaSense is a mobile + backend system for rice grain evaluation and analysis.

The architecture MUST follow the existing project structure and coding standards.

---

# TECH STACK

## Backend

- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Firebase Authentication
- Python 3.11+

## Mobile

- React Native
- Expo
- TypeScript
- Firebase Auth

---

# BACKEND ARCHITECTURE

STRICTLY follow:

Router → Service → Repository → Database

Meaning:

- router.py
  - handles HTTP requests only
  - no business logic
  - no raw SQLAlchemy queries

- service.py
  - business logic
  - validations
  - orchestration

- repository.py
  - database access only

- schema.py
  - Pydantic schemas

- model.py
  - SQLAlchemy ORM models

---

# BACKEND STRUCTURE

```txt
src/
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

# DATABASE RULES

Use:

```python
from src.dependencies.database import get_db
```

Never create database sessions manually inside routers.

---

# AUTH RULES

Use:

```python
from src.dependencies.auth import verify_firebase_user
```

Never duplicate Firebase verification logic.

Never verify tokens manually inside routers.

---

# ROUTER RULES

Routers must:

- stay thin
- call services
- return schemas
- use dependencies

Routers must NOT:

- contain business logic
- contain direct DB queries

---

# SERVICE RULES

Services:

- handle validations
- contain business logic
- call repositories

Services must NOT:

- contain FastAPI route decorators
- directly handle HTTP response formatting

---

# REPOSITORY RULES

Repositories:

- contain SQLAlchemy operations only
- communicate with database

Repositories must NOT:

- contain HTTP logic
- contain Firebase logic

---

# MOBILE ARCHITECTURE

Use centralized API communication.

Structure:

```txt
src/
└── core/
    ├── firebase.ts
    │
    └── api/
        ├── client.ts
        ├── auth.ts
        ├── session.ts
        └── sample.ts
```

---

# MOBILE RULES

NEVER use direct fetch() inside screens.

All API calls must go through:

```txt
core/api/
```

---

# API CLIENT RULES

Use:

```ts
apiFetch();
```

from:

```txt
core/api/client.ts
```

Responsibilities:

- API base URL
- authorization headers
- JSON parsing
- centralized error handling

---

# API FUNCTION RULES

Each backend feature must have:

- corresponding mobile API file

Example:

Backend:

```txt
features/session/
```

Mobile:

```txt
core/api/session.ts
```

---

# TYPESCRIPT RULES

Use:

- typed payloads
- interfaces
- async/await
- centralized API functions

Avoid:

- any
- duplicated fetch logic
- hardcoded URLs

---

# ENVIRONMENT RULES

Backend uses:

```txt
backend/.venv/
```

Mobile uses:

```txt
node_modules/
```

Do NOT mix them.

---

# IMPORTANT NETWORK RULE

Expo physical device testing requires local IP.

Correct:

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000
```

Wrong:

```env
localhost
127.0.0.1
```

---

# GIT RULES

Never commit:

- .venv/
- **pycache**/
- node_modules/
- .env

---

# CODING STYLE

Prefer:

- modular code
- reusable functions
- dependency injection
- typed schemas
- clean imports

Avoid:

- duplicated logic
- monolithic routers
- giant files
- inline business logic

---

# WHEN GENERATING NEW FEATURES

Always generate:

- router.py
- schema.py
- service.py
- repository.py

and:

- model.py if database table needed

Also:

- update db/base.py imports
- update main.py router registration

---

# RESPONSE STYLE

When generating code:

- generate production-style code
- keep consistency with existing structure
- avoid unnecessary abstractions
- prioritize maintainability
- follow existing naming conventions
