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

> **Integration cadence:** Frontend and backend are developed **in parallel** per increment. The full-stack lead is responsible for linking them at increment close.

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

---

> This document is maintained by the full-stack lead. If you find outdated information, raise it immediately so it can be corrected before it causes issues for others.