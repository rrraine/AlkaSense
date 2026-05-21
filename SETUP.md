# AlkaSense — Local Development Setup Guide

> Follow this guide exactly to set up your local development environment.
> Contact the full-stack lead if you encounter any issues.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Frontend Setup](#3-frontend-setup)
4. [Backend Setup](#4-backend-setup)
5. [Service Configuration](#5-service-configuration)
6. [Running & Testing](#6-running--testing)
7. [Security](#7-security)
7. [Keeping Dependencies Updated](#8-keeping-dependencies-updated)

---

## 1. Prerequisites

Install these tools before anything else.

### Node.js
1. Download from [nodejs.org](https://nodejs.org/en/download) — choose **LTS**.
2. Verify installation:
   ```powershell
   node -v
   ```

### Expo CLI
```powershell
npm install -g expo-cli
```

### Expo Go (on your phone)
- Download **Expo Go** from the **Play Store** (Android) or **App Store** (iOS).
- You will use this to test the frontend on your physical device.

### Python 3.11
1. Download [Python 3.11.9 — Windows installer (64-bit)](https://www.python.org/downloads/release/python-3119/).
2. During installation:
   - **Uncheck** "Add python.exe to PATH"
   - Click **Customize installation** → Next → Install
3. Verify after venv setup (see Section 4):
   ```powershell
   python --version
   # Expected: Python 3.11.9
   ```

---

## 2. Clone the Repository

```powershell
git clone https://github.com/rrraine/AlkaSense.git
cd alkasense
```


---

## 3. Frontend Setup

```powershell
cd mobile
```

### Install dependencies
```powershell
  npm install
```

### Pin Expo SDK version
```powershell
npx expo install expo@sdk-54
```

### Create `mobile/.env`
Create a file named `.env` inside the `mobile/` folder and paste:
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
EXPO_PUBLIC_APP_ENV=development
```

> ⚠️ **Never commit `.env` to GitHub.** It is already listed in `mobile/.gitignore`.

---

## 4. Backend Setup

```powershell
cd ..
cd backend
```

### Create the virtual environment
```powershell
py -3.11 -m venv venv
```

### Activate the virtual environment

**Windows:**
```powershell
venv\Scripts\activate
```

**macOS / Linux:**
```bash
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
pip install -r requirements.txt
```

### Deactivate venv when done
```powershell
deactivate
```

---

## 5. Service Configuration

### A. Firebase (each teammate must do this individually)

#### Backend — Service Account Key
1. Go to [firebase.google.com](https://firebase.google.com) → **AlkaSense project**.
2. Click **gear icon** → **Project Settings** → **Service accounts** tab.
3. Click **Generate new private key** → **Generate key**.
4. A `.json` file will download — open it.
5. Create `backend/.env` and fill in the values from the `.json` file:

```env
FIREBASE_PROJECT_ID=alkasense
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"  # fill in
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@alkasense.iam.gserviceaccount.com                # fill in
DATABASE_URL=
APP_ENV=development
SECRET_KEY=alkasense-secret-change-this-later
```

> ⚠️ **WARNING: NEVER share your service account key publicly.**
> Only place it in `backend/.env`. If you suspect your credentials are
> exposed, contact the full-stack lead immediately so the key can be
> revoked and regenerated.

#### Frontend — google-services.json
1. Go to [firebase.google.com](https://firebase.google.com) → **AlkaSense project**.
2. Click **gear icon** → **Project Settings** → **General** tab.
3. Scroll to **Your apps** → click **AlkaSense Mobile (Android)**.
4. Click **Download google-services.json**.
5. Place the file inside your `mobile/` folder:

```
mobile/
└── google-services.json   ← here
```

> ⚠️ **Never commit `google-services.json` to GitHub.**
> It is already listed in `mobile/.gitignore`.

---

### B. PostgreSQL (Neon)

1. Go to [neon.tech](https://neon.tech) — ask the full-stack lead for access.
2. Open the **AlkaSense** project dashboard.
3. Click **Connection string** and copy it.
4. Paste it into `backend/.env` as `DATABASE_URL`:


---

## 6. Running & Testing

### Frontend
```powershell
cd mobile
npx expo start
```
Scan the QR code with **Expo Go** on your phone.

### Backend
```powershell
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```
Visit `http://localhost:8000/docs` to confirm the backend is running.

---

## 7. Security

### Verify `.gitignore` contains:
```
# Frontend
mobile/node_modules/
mobile/.env
mobile/.expo/
mobile/google-services.json

# Backend
backend/venv/
backend/.env
backend/__pycache__/
```

## 8. Keeping Dependencies Updated

After installing / removing dependencies, it may break other's local repos.
It is important to keep everyone's dependencies updated by:

### Frontend:
1. Commit the `package.json`.
2. Pull the updated .json:
```
cd mobile
npm install --legacy-peer-deps
```

### Backend:
1. Run `pip freeze > requirements.txt` to update list of requirements.
2. Commit.
2. Pull the updated .txt:
```
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

---