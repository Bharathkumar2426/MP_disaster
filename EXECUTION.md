# 🚀 Disaster Operations Platform — Local Execution & Deployment Guide

This document provides complete, step-by-step instructions to clone, configure, and execute the **AI Disaster Preparedness & Intelligent Incident Management Platform** on any local system (Windows, macOS, Linux), along with official live cloud deployment URLs.

---

## 🌐 Official Live Cloud Deployments

The platform is deployed and live on Render:

| Service | Live Deployment URL | Description | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | [https://disaster-frontend-92h2.onrender.com](https://disaster-frontend-92h2.onrender.com) | Live Command Center & GIS Tactical UI | 🟢 **ONLINE** |
| **Backend REST API** | [https://disaster-backend-9ygl.onrender.com](https://disaster-backend-9ygl.onrender.com) | Live FastAPI Production Service | 🟢 **ONLINE** |
| **Interactive API Docs**| [https://disaster-backend-9ygl.onrender.com/docs](https://disaster-backend-9ygl.onrender.com/docs) | Live Swagger / OpenAPI Console | 🟢 **ONLINE** |
| **System Health Check** | [https://disaster-backend-9ygl.onrender.com/health](https://disaster-backend-9ygl.onrender.com/health) | Real-time System & Database Status | 🟢 **ONLINE** |

---

## 📋 System Prerequisites

Ensure the following tools are installed on your machine before running locally:

| Requirement | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Python** | `3.10.x` | `3.11.x` | `python --version` (or `python3 --version`) |
| **Node.js** | `18.x` | `20.x LTS` | `node -v` |
| **npm** | `9.x` | `10.x` | `npm -v` |
| **Git** | `2.x` | Latest | `git --version` |

---

## 🔑 Default Test Credentials

The database auto-seeds test accounts on its initial startup:

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@disaster.com` | `admin123` | Full access: Incident logging, centers, courses, RBAC, verification |
| **Responder / Trainer** | `trainer@disaster.com` | `trainer123` | Operational access: Report incidents, verify community reports, manage courses |
| **Citizen / Participant**| `user@disaster.com` | `user123` | Public access: Map feeds, submit reports, RakshaBot AI, emergency SOS |

---

## 💻 Step-by-Step Local Setup

### Step 1: Clone the Repository
Open a terminal and clone the repository:

```bash
git clone https://github.com/Bharathkumar2426/MP_disaster.git
cd MP_disaster
```
*(Or navigate into your extracted project root folder).*

---

### Step 2: Configure & Start the Backend (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:

   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
     .\venv\Scripts\Activate.ps1
     ```

   - **Windows (Command Prompt - cmd)**:
     ```cmd
     python -m venv venv
     venv\Scripts\activate.bat
     ```

   - **macOS / Linux (Bash/Zsh)**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables**:
   Copy the example environment file:

   - **Windows**:
     ```cmd
     copy .env.example .env
     ```
   - **macOS / Linux**:
     ```bash
     cp .env.example .env
     ```

   Open `backend/.env` in a text editor. By default, it runs with local SQLite (`disaster_db.sqlite3`) automatically. Add your Google Gemini API key to enable RakshaBot AI synthesis:
   ```env
   # Mandatory for RakshaBot AI (Get free key from https://aistudio.google.com/)
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY

   # Standard security defaults (already pre-configured)
   JWT_SECRET_KEY=76ace89050e70486f9df57364f6da9ab626a5b1ebaab39bdee8deeb852b4a878
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Database (Defaults to local SQLite)
   DATABASE_URL=sqlite:///./data/disaster_db.sqlite3
   ```

5. **Start the FastAPI Backend server**:
   ```bash
   python run.py
   ```
   *The backend will start on **http://localhost:8080**.*

6. **Verify Backend Health**:
   Open a browser and navigate to:
   - Status check: [http://localhost:8080/health](http://localhost:8080/health) (returns `{"status":"HEALTHY", ...}`)
   - Interactive Swagger console: [http://localhost:8080/docs](http://localhost:8080/docs)

---

### Step 3: Configure & Start the Frontend (React / Vite)

1. Open a **new, separate terminal window** and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** *(Optional for local dev)*:
   Create or verify `frontend/.env` (by default, it automatically proxies to `http://localhost:8080/api`):
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   *The frontend will launch on **http://localhost:5173**.*

5. **Open the application**:
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Verifying Core Platform Features Locally

Once both servers are running:

1. **User Authentication**:
   - Navigate to [http://localhost:5173/login](http://localhost:5173/login).
   - Sign in using `admin@disaster.com` / `admin123`.
2. **Interactive Spatial Map**:
   - Go to **Dashboard** or **Disaster Incidents**.
   - Verify that active incidents appear with colored threat buffer radii (LOW: 8 km, MEDIUM: 14 km, HIGH: 22 km).
   - Check relief center pins displaying capacity and contact details.
3. **RakshaBot AI Disaster Assistant**:
   - Click the floating **RakshaBot** launcher button in the bottom-right corner.
   - Test these benchmark queries:
     - *"What disasters are happening right now?"*
     - *"Are there active floods near Kochi?"*
     - *"What is the weather and flood risk in Kochi?"*
     - *"What training programs are available for floods?"*
     - *"What should I do during an earthquake?"*
   - Verify that responses are distinct, grounded in the database, and display source metadata badges.
4. **Safe-Route Evacuation Guidance**:
   - Go to **Evacuation Routes**.
   - Input an origin and destination (e.g., Kochi to Kakkanad).
   - Verify the computed OSRM driving route, corridor hazard scanning, and safety advisory output.
5. **Community Citizen Reports**:
   - Switch to citizen view, submit a report for localized flooding.
   - Log in as `trainer@disaster.com` or `admin@disaster.com` to inspect and verify the report.

---

## 🛠️ Common Troubleshooting

### 1. `Port 8080 or 5173 is already in use`
- **Windows**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process -Force
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
  ```
- **macOS / Linux**:
  ```bash
  lsof -ti:8080 | xargs kill -9
  lsof -ti:5173 | xargs kill -9
  ```

### 2. `Execution of scripts is disabled on this system` (PowerShell)
Run PowerShell as Administrator or execute in your current session:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 3. `RakshaBot returns rate-limit or quota error`
- Google Gemini free tier allows 15 requests per minute.
- RakshaBot includes a built-in 60-second cooldown on HTTP 429 and automatically switches to **direct-telemetry fallback mode**, continuing to answer queries accurately from database records and NDMA guidelines.

### 4. `CORS Error on Localhost`
- Verify that `frontend/.env` points to `http://localhost:8080/api`.
- Ensure `backend/.env` has `FRONTEND_URL=http://localhost:5173`.

---

## 📁 Quick Reference Commands Summary

| Action | Terminal 1 (Backend) | Terminal 2 (Frontend) |
| :--- | :--- | :--- |
| **Navigate** | `cd backend` | `cd frontend` |
| **Activate Env** | `.\venv\Scripts\Activate.ps1` (or `source venv/bin/activate`) | — |
| **Install** | `pip install -r requirements.txt` | `npm install` |
| **Start** | `python run.py` | `npm run dev` |
| **URL** | [http://localhost:8080](http://localhost:8080) | [http://localhost:5173](http://localhost:5173) |

---

*This guide ensures full local reproducibility on Windows, macOS, and Linux.*
