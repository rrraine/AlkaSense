# AlkaSense — System Architecture

> **Purpose of this document:** Provide a complete architectural reference for the AlkaSense system. Intended as a persistent context file for Claude Code — read this before modifying any module. Keep this file in sync with the SDD and SRS when scope changes.

---

## 1. System Overview

AlkaSense is a mobile-first, offline-capable field evaluation tool for assessing the **Alkali Spreading Value (ASV)** of rice grain samples using the KOH spreading test, developed for PhilRice (Philippine Rice Research Institute). It supports the full evaluation workflow from session setup through AI-assisted scoring, report generation, and institutional data submission.

### Core Actors

| Actor | Description |
|---|---|
| **Field Evaluator** | Registers sessions/samples, captures grain images, enters five-dimension observations, requests AI draft, confirms final ASV score |
| **Certified Evaluator** | All Field Evaluator capabilities; additionally authorized to submit post-confirmation score corrections |
| **PhilRice Admin** | Web-only; authenticates via Jinja2 server-rendered interface; retrieves and downloads uploaded session report packages |

### Key Capabilities

- **Offline-first operation** — 100% of core evaluation functions (session creation, sample registration, image capture, on-device inference, observation entry, score confirmation, report generation, CSV export) operate without any network connection. SQLite persists all data locally.
- **On-device AI inference** — EfficientNet-B1 TFLite model bundled in the app classifies grain images into ASV 1–7 entirely on-device. No server call is made for inference. Model integrity verified at startup via SHA-256 (expo-crypto).
- **Calibrated certainty display** — After inference, a certainty percentage is computed from the model's raw softmax confidence score using temperature scaling. A **Low-Certainty Warning** banner is shown when confidence falls below threshold. This warning is labeled as a "Model Confidence Warning" so evaluators understand the source.
- **Expert-in-the-loop scoring** — The AI draft score is advisory only. The evaluator always performs final confirmation. If the confirmed score differs from the AI draft, a **Score Deviation Remark** is mandatory before confirmation is accepted.
- **Structured correction trail** — Post-confirmation corrections are restricted to Certified Evaluators. Correction records are independent of and never overwrite the original `ConfirmedScore` record — full audit trail is preserved.
- **PhilRice report pipeline** — Closed sessions are exported as PDF + CSV on-device. The report package is uploaded to the FastAPI backend; exponential backoff (2 s → doubles → 60 s ceiling) handles transient failures.

> ⚠️ **Dropped features (do not implement):**
> - **Grad-CAM / visual evidence overlay** — removed from scope. No heatmap generation, no `gradcam.py`, no `/gradcam` endpoint, no overlay viewer component.
> - **Observation-score conflict detection** — removed from scope. No `ObservationConflictDetector`, no conflict warning banner, no `ConflictResolutionRemarkField`, no conflict flags in any table.

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile | React Native (Expo), TypeScript | Cross-platform Android app |
| On-device DB | expo-sqlite 14.x | Offline-first persistence for all evaluation data |
| On-device ML | TensorFlow Lite (EfficientNet-B1) | ASV classification 1–7, fully offline |
| Auth | Firebase Authentication (JWT) | Role-based access; JWT attached to all backend requests |
| Backend API | FastAPI 0.110.x, Python | Report upload, admin retrieval, correction logging |
| Backend DB | PostgreSQL 16.x (asyncpg) | Server-side storage for uploaded reports and corrections |
| Admin UI | Jinja2 server-rendered HTML | Minimal web interface for PhilRice admins |
| HTTP client | Axios + interceptors | Bearer JWT injection, TLS cert pinning, retry backoff |
| ML Training | Keras / TensorFlow → TFLite export | Offline training pipeline; no runtime connection to app |

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo RN)                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Module 1 │  │ Module 2 │  │ Module 3 │  │  Module 4  │  │
│  │ Session/ │  │ Image    │  │ Eval &   │  │  Report /  │  │
│  │ Sample   │  │ Submit / │  │ AI Score │  │  Upload /  │  │
│  │ Register │  │ Validate │  │ Confirm  │  │ Correction │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │              │               │         │
│  ┌────▼──────────────▼──────────────▼───────────────▼──────┐ │
│  │              SQLite Repositories (offline-first)         │ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                             │                                 │
│  ┌──────────────────────────▼───────────────────────────────┐ │
│  │         TFLite Inference Engine (on-device)              │ │
│  │   OnDeviceClassifier → CertaintyComputor (confidence)   │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS + TLS 1.2+ / Bearer JWT
                         │ Axios + exponential backoff
                         │ (report upload, corrections, admin only)
┌────────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend (Render)                    │
│                                                              │
│  POST /reports/upload     POST /corrections                  │
│  GET  /admin/sessions     GET  /admin/reports/{id}           │
│                                                              │
│  ┌──────────────────────┐  ┌───────────────────────────────┐ │
│  │  Firebase JWT verify  │  │  PostgreSQL 16 (asyncpg)     │ │
│  └──────────────────────┘  └───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

Firebase Authentication (external)
  └─▶ Issues JWT on login → attached as Bearer to all FastAPI requests
  └─▶ Role: evaluator | certified_evaluator | admin
```

### What lives where

| Concern | On-device (SQLite) | Server (PostgreSQL via FastAPI) |
|---|---|---|
| Sessions, samples | ✅ | ❌ |
| Grain images, validation results | ✅ | ❌ |
| Observation profiles | ✅ | ❌ |
| Draft scores, confirmed scores | ✅ | ❌ |
| Reference cases | ✅ | ❌ |
| Rejection logs | ✅ | ❌ |
| ASV classification (inference) | ✅ TFLite | ❌ |
| Correction log | ✅ (local) | ✅ (also synced on upload) |
| Session report package (PDF + CSV) | ✅ (generated locally) | ✅ (uploaded copy) |
| Admin report retrieval | ❌ | ✅ |

---

## 3. Module Map

| Module | Screens | Responsibility |
|---|---|---|
| **Module 1** — Session & Sample | SessionHistory, SessionCreation, SampleRegistration | Create evaluation sessions with batch metadata; register grain samples |
| **Module 2** — Image | ImageCapture, ValidationResult | Capture/upload grain images; two-layer protocol + quality validation |
| **Module 3** — Evaluation & Scoring | ObservationEntry, AIDraftScore, ScoreConfirmation, ReferenceLibrary | Five-dimension observations; optional on-device AI draft with certainty display; evaluator confirms final ASV; reference library |
| **Module 4** — Reporting | SessionDashboard, BatchReport, ReportUpload, ScoreCorrection | Real-time progress dashboard; PDF + CSV export; PhilRice upload; certified-evaluator correction |

---

## 4. Data Flow — Happy Path

```
Evaluator authenticates (Firebase JWT)
  └─▶ [Module 1] Creates Session
  │     └─▶ Batch metadata stored in SQLite: sessions table
  │           └─▶ Registers Samples
  │                 └─▶ Stored in SQLite: samples table (linked to session)
  │
  └─▶ [Module 2] Image Capture
  │     └─▶ Evaluator confirms Protocol Compliance Checklist
  │           └─▶ Image captured/selected → preview
  │                 └─▶ Submit Image
  │                       └─▶ Layer 1: Protocol compliance check
  │                             ├─▶ FAIL → show rejection reason + corrective guidance → Resubmit
  │                             └─▶ PASS → Layer 2: Quality screening (blur, exposure, grain visibility)
  │                                         ├─▶ FAIL → show quality failure reason → Resubmit
  │                                         └─▶ ACCEPTED → stored in grain_images table
  │
  └─▶ [Module 3] Expert Observation Entry
  │     └─▶ Evaluator selects all 5 dimensions
  │           └─▶ Path A: Save and Request AI Draft
  │           │     └─▶ OnDeviceClassifier runs TFLite → ASV score (1–7) + raw confidence
  │           │           └─▶ CertaintyComputor calibrates confidence → certainty %
  │           │                 └─▶ If below threshold: show Low-Certainty Warning banner
  │           │                       └─▶ AIDraftScoreScreen displays score + certainty
  │           │                             └─▶ Evaluator proceeds to ScoreConfirmation
  │           │                                   └─▶ If final score ≠ draft: ScoreDeviationRemark (mandatory)
  │           │                                         └─▶ Confirm → write confirmed_scores + reference_cases
  │           │
  │           └─▶ Path B: Save and Score Manually
  │                 └─▶ Navigate directly to ScoreConfirmation (no draft pre-loaded)
  │                       └─▶ Evaluator selects score → Confirm → write confirmed_scores + reference_cases
  │
  └─▶ [Module 4] Session Dashboard
        └─▶ Real-time progress: completion counts, score distribution, flagged samples
              └─▶ Session Closure → BatchReportGenerator + CSVExportGenerator (on-device, <10s / <5s)
                    └─▶ ReportUploadScreen → POST /reports/upload to FastAPI
                          └─▶ On success: server receipt recorded, SessionReportRecord → UPLOADED
                          └─▶ On failure: retained locally, exponential backoff retry available
```

---

## 5. Folder Structure

```
alkasense/
│
├── mobile/                          # React Native (Expo) Android application
│   ├── App.tsx                      # App entry point
│   ├── app.json                     # Expo config
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── assets/
│   │   ├── models/
│   │   │   └── efficientnet_b1.tflite   # Bundled TFLite model; SHA-256 verified at every boot
│   │   └── images/
│   │
│   └── src/
│       │
│       ├── app/                         # Navigation & entry screens (Expo Router)
│       │   ├── _layout.tsx              # Root navigator
│       │   ├── index.tsx                # Redirect: unauthenticated → Login, authenticated → Dashboard
│       │   ├── (auth)/
│       │   │   └── Login.tsx            # Firebase Authentication login screen
│       │   └── (main)/
│       │       └── _layout.tsx          # Bottom tab / stack navigator for authenticated users
│       │
│       ├── modules/                     # Feature modules — one per SDD module
│       │   │
│       │   ├── module1_session/         # Module 1: Session & Sample Registration
│       │   │   ├── screens/
│       │   │   │   ├── SessionHistoryScreen.tsx      # List of all past and active sessions
│       │   │   │   ├── SessionCreationScreen.tsx     # 1.1: Batch metadata form; enforces name uniqueness
│       │   │   │   └── SampleRegistrationScreen.tsx  # 1.2: Sample entry form; shows registered list
│       │   │   │
│       │   │   ├── components/
│       │   │   │   ├── session/
│       │   │   │   │   ├── SessionNameInput.tsx
│       │   │   │   │   ├── BatchIdentifierInput.tsx
│       │   │   │   │   ├── KOHConcentrationInput.tsx
│       │   │   │   │   ├── IncubationDurationInput.tsx
│       │   │   │   │   ├── EvaluationDateField.tsx        # Auto-populated; overridable for backdating
│       │   │   │   │   ├── EvaluatorIdentityDisplay.tsx   # Read-only; drawn from Firebase user record
│       │   │   │   │   └── SessionStartButton.tsx         # Disabled until all fields valid + unique name
│       │   │   │   │
│       │   │   │   └── sample/
│       │   │   │       ├── SessionContextBanner.tsx        # Shows inherited batch metadata (read-only)
│       │   │   │       ├── SampleIdentifierInput.tsx
│       │   │   │       ├── RiceVarietyInput.tsx
│       │   │   │       ├── GrainCountInput.tsx
│       │   │   │       ├── RegisterSampleButton.tsx        # Disabled until fields valid; resets form on success
│       │   │   │       ├── RegisteredSamplesList.tsx       # Live list of samples in this session
│       │   │   │       └── ProceedToImageSubmissionButton.tsx  # Active only when ≥1 sample registered
│       │   │   │
│       │   │   └── services/
│       │   │       ├── SessionService.ts   # submitSessionCreation(), checkNameUnique()
│       │   │       └── SampleService.ts    # submitSampleRegistration(), buildPayload()
│       │   │
│       │   ├── module2_image/           # Module 2: Image Submission & Validation
│       │   │   ├── screens/
│       │   │   │   ├── ImageCaptureScreen.tsx        # 2.1: Checklist + camera/gallery + preview
│       │   │   │   └── ValidationResultScreen.tsx    # 2.2: Accepted / Protocol Violation / Quality Failure
│       │   │   │
│       │   │   ├── components/
│       │   │   │   ├── capture/
│       │   │   │   │   ├── SampleContextBanner.tsx         # Sample ID, variety, grain count, session name
│       │   │   │   │   ├── ProtocolChecklistPanel.tsx      # 4-item gate; all must be checked before submit
│       │   │   │   │   ├── CameraCaptureButton.tsx
│       │   │   │   │   ├── AlignmentOverlay.tsx            # Petri-dish framing guide overlaid on viewfinder
│       │   │   │   │   ├── GalleryUploadButton.tsx
│       │   │   │   │   ├── ImagePreview.tsx
│       │   │   │   │   ├── SubmitImageButton.tsx           # Disabled until image present + checklist complete
│       │   │   │   │   └── RetakeButton.tsx               # Clears preview; returns to capture/gallery state
│       │   │   │   │
│       │   │   │   └── validation/
│       │   │   │       ├── ValidationStatusBanner.tsx      # Color-coded: ACCEPTED / PROTOCOL VIOLATION / QUALITY FAILURE
│       │   │   │       ├── RejectionReasonDisplay.tsx      # Layer ID + plain-language failure description
│       │   │   │       ├── ProtocolCorrectionGuidancePanel.tsx  # Corrective steps for protocol violations only
│       │   │   │       ├── AcceptedImageConfirmationPanel.tsx   # Thumbnail + proceed action on ACCEPTED
│       │   │   │       ├── ResubmitImageButton.tsx         # Visible on rejection only
│       │   │   │       └── ProceedToEvaluationButton.tsx   # Visible and active on ACCEPTED only
│       │   │   │
│       │   │   └── services/
│       │   │       ├── ImageSubmissionService.ts     # submitImage(), buildPayload()
│       │   │       └── ImageValidationService.ts     # fetchValidationResult(), buildResubmissionContext()
│       │   │
│       │   ├── module3_evaluation/      # Module 3: Expert Evaluation & AI-Assisted Scoring
│       │   │   ├── screens/
│       │   │   │   ├── ObservationEntryScreen.tsx    # 3.1: Five-dimension structured form
│       │   │   │   ├── AIDraftScoreScreen.tsx        # 3.2: AI draft score + certainty display
│       │   │   │   ├── ScoreConfirmationScreen.tsx   # 3.3: Final score selector + deviation remark
│       │   │   │   └── ReferenceLibraryScreen.tsx    # 3.4: Searchable confirmed-case library
│       │   │   │
│       │   │   ├── components/
│       │   │   │   ├── observation/                  # Five-dimension entry widgets (all single-select except anomaly flags)
│       │   │   │   │   ├── SampleImageContextBanner.tsx     # Sample ID + validated image thumbnail
│       │   │   │   │   ├── SpreadingPatternSelector.tsx     # Smooth/Ragged/Partial/No Spreading
│       │   │   │   │   ├── GrainTranslucencySelector.tsx    # Fully/Partially Translucent/Opaque
│       │   │   │   │   ├── WithinDishUniformitySelector.tsx # Uniform/Moderate/High Variation
│       │   │   │   │   ├── AnomalyFlagSelector.tsx          # Multi-select: Cracking/Unilateral/Floating/None
│       │   │   │   │   ├── KOHSolutionAppearanceSelector.tsx # Clear/Mildly/Heavily Clouded
│       │   │   │   │   ├── SaveAndRequestAIDraftButton.tsx  # Saves obs → navigates to AIDraftScoreScreen
│       │   │   │   │   └── SaveAndScoreManuallyButton.tsx   # Saves obs → navigates directly to ScoreConfirmation
│       │   │   │   │
│       │   │   │   ├── ai_draft/                     # AI score and certainty display
│       │   │   │   │   ├── SampleObservationSummaryPanel.tsx   # Read-only collapsed obs summary
│       │   │   │   │   ├── RequestAIDraftButton.tsx
│       │   │   │   │   ├── AIDraftScoreDisplay.tsx             # Color-coded ASV 1–7 + GT class + GT range
│       │   │   │   │   ├── CertaintyLevelIndicator.tsx         # Calibrated certainty % from CertaintyComputor
│       │   │   │   │   ├── LowCertaintyWarningBanner.tsx       # Labeled "Model Confidence Warning"; shown when below threshold
│       │   │   │   │   └── ProceedToConfirmScoreButton.tsx
│       │   │   │   │
│       │   │   │   ├── confirmation/                 # Score finalization
│       │   │   │   │   ├── AIDraftReferencePanel.tsx           # Read-only draft reference; hidden on manual path
│       │   │   │   │   ├── ObservationProfileSummaryPanel.tsx  # Read-only; always shown
│       │   │   │   │   ├── FinalASVScoreSelector.tsx           # 1–7 picker; pre-filled with draft if exists
│       │   │   │   │   ├── ScoreDeviationRemarkField.tsx       # Mandatory when final score ≠ AI draft
│       │   │   │   │   ├── ConfirmScoreButton.tsx              # Disabled until all mandatory conditions met
│       │   │   │   │   └── ConfirmedScoreSummaryDisplay.tsx    # Read-only post-confirmation summary
│       │   │   │   │
│       │   │   │   └── library/                      # Reference case browser
│       │   │   │       ├── LibrarySearchBar.tsx
│       │   │   │       ├── ASVScoreFilter.tsx               # Multi-select 1–7
│       │   │   │       ├── RiceVarietyFilter.tsx
│       │   │   │       ├── AnomalyFlagFilter.tsx
│       │   │   │       ├── ReferenceCaseList.tsx            # Scrollable cards: thumbnail, ASV, variety, date
│       │   │   │       └── CaseDetailView.tsx               # Full case: image, obs profile, score, GT class
│       │   │   │
│       │   │   └── services/
│       │   │       ├── ObservationService.ts         # submitObservationProfile(), buildPayload()
│       │   │       ├── AIScoringService.ts           # requestAIDraft(), ClassificationRequest
│       │   │       ├── ScoreConfirmationService.ts   # submitConfirmation(), buildPayload()
│       │   │       └── LibraryService.ts             # fetchFilteredCases(), fetchCaseDetail()
│       │   │
│       │   └── module4_reporting/       # Module 4: Reporting & Submission
│       │       ├── screens/
│       │       │   ├── SessionDashboardScreen.tsx    # 4.1: Real-time session progress view
│       │       │   ├── BatchReportScreen.tsx         # 4.2: PDF report + CSV export
│       │       │   ├── ReportUploadScreen.tsx        # 4.3: Upload report package to PhilRice
│       │       │   └── ScoreCorrectionScreen.tsx     # 4.5: Post-confirmation correction (Certified only)
│       │       │
│       │       ├── components/
│       │       │   ├── dashboard/
│       │       │   │   ├── SessionContextHeader.tsx
│       │       │   │   ├── OverallProgressIndicator.tsx         # Total / completed / pending / flagged counts
│       │       │   │   ├── ScoreDistributionChart.tsx           # ASV 1–7 distribution bar chart; live updates
│       │       │   │   ├── SampleStatusList.tsx                 # Per-sample status + confirmed score if available
│       │       │   │   ├── FlaggedSampleAlertsPanel.tsx         # Low-certainty + anomaly-flagged samples only
│       │       │   │   └── RefreshButton.tsx
│       │       │   │
│       │       │   ├── report/
│       │       │   │   ├── SessionSummaryPanel.tsx
│       │       │   │   ├── GenerateReportButton.tsx
│       │       │   │   ├── SessionClosureConfirmationDialog.tsx # Irreversible action — requires explicit confirm
│       │       │   │   ├── CSVExportDownloadButton.tsx
│       │       │   │   └── ExportGenerationStatusIndicator.tsx
│       │       │   │
│       │       │   ├── upload/
│       │       │   │   ├── ReportPackageSummaryPanel.tsx        # Session name, timestamps, PDF + CSV file sizes
│       │       │   │   ├── UploadReportButton.tsx               # Active only when NOT_UPLOADED record exists
│       │       │   │   ├── UploadProgressIndicator.tsx
│       │       │   │   ├── UploadSuccessConfirmationPanel.tsx   # Shows server receipt details
│       │       │   │   ├── UploadFailureAlertPanel.tsx
│       │       │   │   └── RetryUploadButton.tsx               # Re-triggers backoff without regenerating files
│       │       │   │
│       │       │   └── correction/
│       │       │       ├── CertifiedEvaluatorAccessGate.tsx     # Role check; non-certified sees denial message
│       │       │       ├── OriginalConfirmedScoreDisplay.tsx    # Read-only original score + confirming evaluator
│       │       │       ├── CorrectedASVScoreSelector.tsx        # Must differ from original score
│       │       │       ├── CorrectionRemarkField.tsx            # Mandatory justification text
│       │       │       ├── SubmitCorrectionButton.tsx           # Disabled until score differs + remark entered
│       │       │       └── CorrectionConfirmationSummary.tsx    # Read-only post-submission summary
│       │       │
│       │       └── services/
│       │           ├── SessionProgressService.ts     # fetchSessionProgress()
│       │           ├── ReportExportService.ts        # closeSession(), generateReport() — on-device PDF/CSV
│       │           ├── ReportUploadService.ts        # initiateUpload(), retry with exponential backoff
│       │           └── ScoreCorrectionService.ts     # submitCorrection()
│       │
│       ├── db/                          # Data Access Layer — offline-first SQLite
│       │   ├── database.ts              # expo-sqlite init; CREATE TABLE statements; SHA-256 model check
│       │   │
│       │   └── repositories/            # One typed repository per domain entity
│       │       ├── SessionRepository.ts            # sessions table
│       │       ├── SampleRepository.ts             # samples table
│       │       ├── GrainImageRepository.ts         # grain_images table
│       │       ├── EvaluationRecordRepository.ts   # evaluation_records table
│       │       ├── ObservationProfileRepository.ts # observation_profiles table
│       │       ├── DraftScoreRepository.ts         # draft_scores table
│       │       ├── ConfirmedScoreRepository.ts     # confirmed_scores table
│       │       ├── ReferenceCaseRepository.ts      # reference_cases table (local; populated on confirmation)
│       │       ├── CorrectionLogRepository.ts      # correction_log table
│       │       ├── RejectionLogRepository.ts       # rejection_log table
│       │       └── SessionReportRepository.ts      # session_reports table (upload tracking)
│       │
│       ├── inference/                   # On-device TFLite inference pipeline
│       │   ├── OnDeviceClassifier.ts     # Loads EfficientNet-B1; input: image tensor; output: ASV (1–7) + raw confidence
│       │   └── CertaintyComputor.ts      # Temperature-scaling calibration of raw confidence → certainty %; triggers low-certainty flag
│       │
│       ├── shared/                      # Cross-cutting concerns
│       │   ├── components/
│       │   │   └── ValidationErrorBanner.tsx   # Reusable inline error display
│       │   │
│       │   ├── types/                          # TypeScript interfaces mirroring SDD DTOs
│       │   │   ├── session.types.ts            # SessionRecord, SessionPayload, SessionResponse
│       │   │   ├── sample.types.ts             # SampleRecord, SamplePayload
│       │   │   ├── image.types.ts              # GrainImageRecord, ImageSubmissionPayload
│       │   │   ├── evaluation.types.ts         # EvaluationRecord, ObservationProfile
│       │   │   ├── scoring.types.ts            # DraftScore, ConfirmedScore, ClassificationRequest
│       │   │   ├── report.types.ts             # SessionReportRecord, ExportGenerationResult
│       │   │   └── correction.types.ts         # CorrectionLog, CorrectionPayload
│       │   │
│       │   ├── hooks/
│       │   │   └── useAuth.ts                  # Firebase JWT; exposes current evaluator identity + role
│       │   │
│       │   └── utils/
│       │       ├── modelIntegrityCheck.ts      # SHA-256 verify of bundled .tflite at every startup; blocks inference if mismatch
│       │       └── exponentialBackoff.ts       # Retry: initial 2 s, multiplier 2×, ceiling 60 s
│       │
│       └── api/                         # HTTP client — mobile → FastAPI (upload/corrections/admin only)
│           ├── client.ts                # Axios base: Bearer JWT + TLS 1.2+ certificate pinning
│           ├── endpoints/
│           │   ├── reportApi.ts         # POST /reports/upload
│           │   └── correctionApi.ts     # POST /corrections
│           └── interceptors.ts          # Auth header injection, silent token refresh
│
│
├── backend/                         # FastAPI Python backend (Render-hosted)
│   ├── main.py                      # App entry; registers feature routers
│   ├── requirements.txt
│   ├── .env                         # Never committed; loaded via config.py
│   │
│   └── src/
│       ├── core/
│       │   ├── database.py          # PostgreSQL async connection (SQLAlchemy + asyncpg)
│       │   ├── auth.py              # Firebase Admin SDK JWT verification middleware
│       │   └── config.py            # Pydantic BaseSettings; reads .env
│       │
│       └── features/                # Vertical slice — one folder per backend responsibility
│           │                        # NOTE: session/sample/image/observation/scoring are on-device only.
│           │                        # FastAPI handles only: report upload, corrections, admin retrieval.
│           │
│           ├── reports/             # Module 4.2 & 4.3 — Report upload from mobile + admin GET
│           │   ├── router.py        # POST /reports/upload, GET /reports (admin-facing)
│           │   ├── service.py       # ReportUploadHandler, ServerSyncService
│           │   ├── schema.py        # ReportUploadPayload, UploadTransmissionResult
│           │   └── model.py         # SessionReportRecord, UploadReceiptLog
│           │
│           ├── corrections/         # Module 4.5 — Post-confirmation score correction receipt
│           │   ├── router.py        # POST /corrections
│           │   ├── service.py       # ScoreCorrectionHandler, CorrectionAccessValidator
│           │   ├── schema.py        # CorrectionPayload
│           │   └── model.py         # CorrectionLog
│           │
│           └── admin/               # Module 4.4 — Jinja2 web interface for PhilRice admins
│               ├── router.py        # GET /admin/sessions, GET /admin/reports/{id}
│               ├── service.py       # UploadedSessionQueryHandler, ReportDeliveryService
│               └── auth.py          # AdminAuthenticationHandler; enforces admin role via Firebase JWT
│
│   └── templates/                   # Jinja2 HTML templates (admin UI only)
│       ├── base.html
│       ├── login.html
│       ├── sessions_list.html
│       └── session_detail.html
│
│
└── ml/                              # Model training & export pipeline (no runtime connection to app)
    ├── dataset/
    │   ├── asv_1/                   # ~200 labeled images per class (PhilRice dataset)
    │   ├── asv_2/
    │   ├── asv_3/
    │   ├── asv_4/
    │   ├── asv_5/
    │   ├── asv_6/
    │   └── asv_7/
    │
    └── training/
        ├── train.py                 # EfficientNet-B1 fine-tuning pipeline (Keras); 70/15/15 split
        ├── evaluate.py              # Accuracy, macro-F1, per-class F1 for ASV 3–5; Cohen's kappa
        └── export_tflite.py         # Keras → .tflite conversion; prints SHA-256 to stdout for modelIntegrityCheck.ts
```

---

## 6. Key Design Decisions

### 6.1 Offline-First — Core Functions Require No Internet
Every step from session creation through score confirmation and PDF/CSV export runs entirely on-device using expo-sqlite and TFLite. Internet is required **only** for: Firebase auth token refresh, POST /reports/upload, POST /corrections. Design all core evaluation screens to function and persist data regardless of network state.

### 6.2 On-Device Inference Only
The TFLite EfficientNet-B1 model runs locally. There is no server-side inference endpoint. The full Keras model is used only in `ml/training/` — it has no runtime connection to the app. Do not create or reference any server-side scoring or classification endpoint.

### 6.3 Certainty = Model Confidence Only
`CertaintyComputor` takes the raw softmax confidence score from `OnDeviceClassifier` and applies temperature scaling to produce a calibrated certainty percentage. **There is no conflict detection component.** The certainty value is derived solely from image classification confidence.

### 6.4 Human-in-the-Loop Enforcement
The UI enforces these invariants:
- The AI draft score is **never auto-committed** — `ScoreConfirmationScreen` always requires an explicit evaluator action.
- If the confirmed score **differs from the AI draft**, `ScoreDeviationRemarkField` becomes mandatory and blocks confirmation until filled.
- The manual path (Save and Score Manually) skips the draft entirely — no draft panel is shown, no deviation remark is required.

### 6.5 Backend is Thin — Upload and Admin Only
`backend/src/features/` contains **only three slices**: `reports/`, `corrections/`, `admin/`. Do not add session, sample, image, evaluation, or scoring endpoints to the backend. All of that logic lives on-device. The backend's only jobs are: receive report packages, receive correction records, serve admin retrieval, and verify Firebase JWTs.

### 6.6 Vertical Slice Backend
Each feature slice in `backend/src/features/` is self-contained: `router.py → service.py → schema.py → model.py`. Do not import across slices. Access the database only through SQLAlchemy sessions injected via `core/database.py`.

### 6.7 Security Invariants
- Firebase JWT verified on **every** FastAPI request via `core/auth.py` middleware.
- Mobile Axios client uses TLS 1.2+ and certificate pinning via `api/client.ts`.
- TFLite model SHA-256 verified at app startup in `utils/modelIntegrityCheck.ts`; inference is blocked if hash does not match.
- Score correction access gated client-side by `CertifiedEvaluatorAccessGate.tsx` and server-side by `CorrectionAccessValidator` in `corrections/service.py`.
- Correction records never overwrite the original `ConfirmedScore` — `CorrectionLog` is a separate table with a FK to `confirmed_score_id`.

### 6.8 Retry Strategy
`utils/exponentialBackoff.ts` is used exclusively by `ReportUploadService.ts`. Initial delay: 2 s; multiplier: 2×; ceiling: 60 s. The report package is retained in local SQLite (`session_reports` table) until a server-confirmed receipt (status: `UPLOADED`) is received.

---

## 7. API Endpoint Reference

> FastAPI exposes **only** the following endpoints. Do not add classification, session, sample, or image endpoints.

| Method | Path | Feature Slice | Description |
|---|---|---|---|
| POST | `/reports/upload` | reports | Upload PDF + CSV report package from mobile; returns server receipt |
| GET | `/reports` | reports | List uploaded session reports (admin-facing; requires admin JWT) |
| POST | `/corrections` | corrections | Receive correction record from Certified Evaluator mobile client |
| GET | `/admin/sessions` | admin | Paginated list of uploaded sessions for admin UI |
| GET | `/admin/reports/{id}` | admin | Retrieve and stream specific session report files to admin |

---

## 8. SQLite Schema (Mobile — expo-sqlite)

> All evaluation data is stored here. This is the primary persistence layer.

| Table | Key Columns |
|---|---|
| `sessions` | id, name, batch_id, koh_concentration, incubation_duration, incubation_temperature, evaluation_date, evaluator_id, status (ACTIVE \| CLOSED) |
| `samples` | id, session_id, sample_identifier, rice_variety, grain_count, status (PENDING \| IMAGE_SUBMITTED \| CONFIRMED) |
| `grain_images` | id, sample_id, image_path, submission_status, validation_status (ACCEPTED \| PROTOCOL_VIOLATION \| QUALITY_FAILURE), rejection_layer, rejection_reason, validation_timestamp |
| `evaluation_records` | id, sample_id, grain_image_id, status (OBSERVATION_ENTERED \| DRAFT_GENERATED \| CONFIRMED) |
| `observation_profiles` | id, evaluation_id, spreading_pattern, grain_translucency, within_dish_uniformity, anomaly_flags, koh_solution_appearance |
| `draft_scores` | id, evaluation_id, asv_score, gt_class, gt_range, raw_confidence, certainty_score, low_certainty_flag, created_at |
| `confirmed_scores` | id, evaluation_id, final_asv_score, gt_class, gt_range, ai_draft_used, deviated_from_draft, deviation_remark, confirming_evaluator_id, confirmed_at |
| `reference_cases` | id, evaluation_id, asv_score, gt_class, rice_variety, image_path, spreading_pattern, grain_translucency, within_dish_uniformity, anomaly_flags, koh_solution_appearance, ai_draft_used, deviated_from_draft, session_id, confirmed_at |
| `correction_log` | id, confirmed_score_id, session_id, sample_id, original_asv_score, corrected_asv_score, correction_remark, submitting_evaluator_id, submitted_at |
| `rejection_log` | id, grain_image_id, sample_id, rejection_layer, rejection_reason, evaluator_id, rejected_at |
| `session_reports` | id, session_id, pdf_path, csv_path, generated_at, upload_status (NOT_UPLOADED \| UPLOADED \| FAILED), upload_attempts, last_attempted_at |

---

## 9. Development Notes for Claude Code

- **Adding a new screen:** Create under `modules/moduleN_*/screens/`. Register the route in the nearest `_layout.tsx`. Check Module Map (Section 3) before deciding which module it belongs to.
- **Adding a backend endpoint:** Only add to `backend/src/features/` if it is one of: report upload, correction receipt, or admin retrieval. Do not create backend endpoints for anything that already lives on-device.
- **Adding a new SQLite table:** Add the `CREATE TABLE` statement in `db/database.ts` and create a matching typed repository in `db/repositories/`.
- **Updating the TFLite model:** Retrain via `ml/training/train.py`, export with `export_tflite.py` (SHA-256 printed to stdout), copy `.tflite` to `mobile/assets/models/`, update the expected hash constant in `utils/modelIntegrityCheck.ts`.
- **Certainty display:** Only `CertaintyComputor.ts` is responsible for certainty. It reads raw confidence from `OnDeviceClassifier` — do not add any other inputs to certainty computation.
- **Score deviation remark:** `ScoreDeviationRemarkField` is revealed and becomes mandatory only when `final_asv_score ≠ draft_scores.asv_score`. This logic lives in `ScoreConfirmationScreen`. Do not add conflict-resolution remark logic.
- **Shared types:** Any interface used across more than one module belongs in `shared/types/`. Do not inline complex types in service files.
- **Never cross feature slice boundaries** in the backend. `features/reports/` must not import from `features/corrections/` or vice versa. Use `core/database.py` session injection for DB access.
- **Do not implement:** Grad-CAM, visual evidence overlays, `ObservationConflictDetector`, conflict warning banners, `ConflictResolutionRemarkField`, `/gradcam` endpoint. These were removed from scope.
