# 🌍 AI Disaster Preparedness & Intelligent Incident Management Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19_Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-Live_Telemetry-FF6B6B.svg)](https://open-meteo.com/)
[![GDACS](https://img.shields.io/badge/GDACS-Live_Sync-2ECC71.svg)](https://www.gdacs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, mission-critical emergency operations, disaster preparedness, and incident management platform. Engineered with **FastAPI (Python)**, **React 19 (Vite)**, **Leaflet GIS Spatial Engine**, **Open-Meteo Telemetry**, **GDACS Global Feeds**, and **Google Gemini AI**.

Provides real-time crisis monitoring, explainable risk assessment, citizen distress reporting, safe evacuation corridor routing, authoritative preparedness training, and **RakshaBot (रक्षाBot)** — an intelligent AI disaster assistant.

---

## 🌐 Live Production Deployments (Render Cloud)

The full-stack platform is live and operational:

| Service | Live Deployment URL | Description | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | [https://disaster-frontend-92h2.onrender.com](https://disaster-frontend-92h2.onrender.com) | Live Command Center & GIS Tactical UI | 🟢 **ONLINE** |
| **Backend REST API** | [https://disaster-backend-9ygl.onrender.com](https://disaster-backend-9ygl.onrender.com) | Live FastAPI Production Service | 🟢 **ONLINE** |
| **Swagger API Docs** | [https://disaster-backend-9ygl.onrender.com/docs](https://disaster-backend-9ygl.onrender.com/docs) | Interactive OpenAPI Test Console | 🟢 **ONLINE** |
| **System Health Check** | [https://disaster-backend-9ygl.onrender.com/health](https://disaster-backend-9ygl.onrender.com/health) | Live System & Database Status | 🟢 **ONLINE** |

---

## ⚡ Localhost Development Services

| Service | Local URL | Description | Default Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Reactive Command Center & Tactical UI | 🟢 **ACTIVE** |
| **Backend REST API** | [http://localhost:8080](http://localhost:8080) | Asynchronous FastAPI Engine | 🟢 **ACTIVE** |
| **Swagger API Docs** | [http://localhost:8080/docs](http://localhost:8080/docs) | Interactive OpenAPI Test Console | 🟢 **ACTIVE** |
| **ReDoc Reference** | [http://localhost:8080/redoc](http://localhost:8080/redoc) | Clean API Specifications | 🟢 **ACTIVE** |
| **Health Check** | [http://localhost:8080/health](http://localhost:8080/health) | System & Database Health Endpoint | 🟢 **ACTIVE** |

---

## 🌟 Key Platform Capabilities

### 1. 🤖 RakshaBot (रक्षाBot) — AI Disaster Safety Assistant
- **Google Gemini Integration**: Context-aware natural language assistant powered by `gemini-2.5-flash-lite` and `gemini-2.5-flash`.
- **Grounded in Platform Telemetry**: Responses are strictly grounded in live database records, GDACS feeds, Open-Meteo observations, and NDMA guidelines.
- **Multi-Intent Architecture**: Independent processing for live disasters, location-specific queries, meteorological observations, training programs, and safety guidelines.
- **Fail-Safe Direct Telemetry Fallback**: If Gemini hits API rate limits (HTTP 429) or is offline, RakshaBot smoothly switches to an evidence-grounded fallback engine without failing or repeating templates.
- **Floating Command Panel**: Minimizable launcher, quick prompt chips, session history sync, and emergency contact banners.

### 2. 🗺️ Interactive GIS Tactical Spatial Map
- **Live Incident Visualization**: Dynamic Leaflet maps with severity threat radii (Low: 8 km, Medium: 14 km, High: 22 km).
- **GDACS Live Feed Overlay**: Global Disaster Alert and Coordination System feeds synced automatically in the background.
- **Shelter & Relief Pins**: Interactive relief hubs showing capacity, coordinator contacts, and distance calculations.

### 3. 🌤️ Real-Time Meteorological Telemetry & Provisional Risk Engine
- **Open-Meteo Integration**: Live temperature, humidity, precipitation, wind speed, and gust telemetry without requiring paid API keys.
- **Explainable Risk Assessment (`PROVISIONAL_RULE_BASED_v1.0`)**: Deterministic, physical trigger-based risk scores (0–100) and hazard categories (LOW, MEDIUM, HIGH, CRITICAL). Explicitly states statistical probability is NULL to avoid misleading route safety claims.

### 4. 🛣️ Safe-Route Evacuation Guidance
- **Corridor Hazard Scanning**: Calculates driving routes via OSRM (or geodesic fallback) and scans for active hazards within customizable buffer zones (5–50 km).
- **Proximity Categorization**: Highlights intersecting crisis zones and alerts responders to impassable corridors.

### 5. 👥 Citizen Community Reporting & Verification Workflow
- **Crowdsourced Intelligence**: Verified role-based reporting for localized waterlogging, tree falls, and roadblocks.
- **Verification RBAC**: Participants can submit reports; certified Responders and Admins verify reports before inclusion in official feeds.

### 6. 🎓 Preparedness Training & Relief Hub Directory
- **Course Management**: Training programs for flood rescue, fire escape, and earthquake survival with participant capacity tracking.
- **Relief Shelters**: Verified directory of safe relief centers, capacity tracking, and direct station desk helplines.

### 7. 📄 Official SitRep PDF & CSV Export Engine
- **Instant Documentation**: One-click generation of timestamped Situation Reports (SitRep) using `jsPDF` and `AutoTable` for emergency briefings.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Mapping & GIS**: Leaflet, React-Leaflet
- **Styling**: Vanilla CSS, Glassmorphism Design System, Lucide React
- **HTTP Client**: Axios (with automatic Bearer JWT injection & timeout protection)
- **State & Storage**: React Context, SessionStorage, LocalStorage

### Backend
- **Core Engine**: Python 3.11+ / FastAPI (Asynchronous ASGI)
- **Database**: SQLite (default local) / PostgreSQL (production ready via SQLAlchemy 2.0 ORM)
- **AI Engine**: Google Gemini API via REST
- **External Feeds**: GDACS (Global Disaster Alert & Coordination System), Open-Meteo
- **Routing**: Open Source Routing Machine (OSRM) + Geodesic Corridor Fallback
- **Security**: JWT Bearer Tokens (`python-jose`), Salted Bcrypt Hashing (`passlib`)
- **Server**: Uvicorn ASGI Server / Gunicorn for production

---

## 🔑 Default Test Accounts

The platform automatically seeds initial test credentials on first launch:

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@disaster.com` | `admin123` | Full access: Incident management, centers, programs, user RBAC, verification |
| **Trainer / Responder** | `trainer@disaster.com` | `trainer123` | Operational access: Report incidents, verify community reports, manage courses |
| **Participant / Citizen**| `user@disaster.com` | `user123` | Public access: Live map, report incidents, RakshaBot, emergency SOS |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** (Node 20 LTS recommended)
- **Git**

---

### 1. ⚙️ Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```powershell
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your `.env` file:
   ```bash
   # Copy example template
   copy .env.example .env     # Windows
   cp .env.example .env       # Linux/macOS
   ```
   Add your `GEMINI_API_KEY` to `.env` to enable RakshaBot AI synthesis.

5. Start the backend development server:
   ```bash
   python run.py
   # Runs on http://localhost:8080
   ```

---

### 2. 💻 Frontend Setup (React / Vite)

1. In a separate terminal, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Project Structure

```text
disaster-management-system/
├── backend/
│   ├── data/                         # Local database storage & safety catalogs
│   │   ├── safety_data.py            # Authoritative NDMA disaster safety guidelines
│   │   └── disaster_db.sqlite3       # Local development SQLite database
│   ├── routers/
│   │   ├── ai.py                     # RakshaBot endpoints, damage assessment, copilot
│   │   ├── auth.py                   # User registration, JWT login, and profile
│   │   ├── community_reports.py      # Crowdsourced incident reports & verification
│   │   ├── dashboard.py              # Aggregated metrics, incident counters
│   │   ├── disasters.py              # Incident CRUD, filters, GDACS status, weather
│   │   ├── notifications.py          # Alert notifications & polling
│   │   ├── routes.py                 # OSRM Safe-route calculation & hazard corridor scan
│   │   ├── safety.py                 # Emergency directory, checklists, recommendations
│   │   ├── training_centers.py       # Relief shelters & hubs management
│   │   ├── training_programs.py      # Community preparedness training sessions
│   │   └── users.py                  # User management and role modification
│   ├── database.py                   # SQLAlchemy engine, session maker, base model
│   ├── disaster_upsert.py            # Deduplicated incident upsert utility
│   ├── gdacs_collector.py            # Asynchronous GDACS feed polling collector
│   ├── location_service.py           # Indian district coordinate resolver & Haversine formula
│   ├── main.py                       # FastAPI entrypoint, CORS configuration, lifecycle
│   ├── models.py                     # SQLAlchemy ORM entity models
│   ├── rakshabot_service.py          # RakshaBot AI engine (Gemini + Grounded Fallback)
│   ├── recommendation_service.py     # Rule-based safety recommendation engine
│   ├── risk_service.py               # Explainable provisional risk assessment engine
│   ├── routing_service.py            # OSRM road routing & hazard buffer analysis
│   ├── schemas.py                    # Pydantic v2 request/response validation schemas
│   ├── security.py                   # JWT verification, password hashing, RBAC guards
│   ├── weather_service.py            # Open-Meteo physical meteorological API client
│   └── run.py                        # Uvicorn launcher (Port 8080)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DisasterMap.jsx       # Interactive Leaflet GIS spatial map
│   │   │   ├── LocationAlertWidget.jsx # User GPS alert zone status badge
│   │   │   ├── Navbar.jsx            # Command center top bar with SOS trigger
│   │   │   ├── NotificationDropdown.jsx # Real-time alerts popover
│   │   │   ├── RakshaBot.jsx         # Floating AI Disaster Assistant panel
│   │   │   ├── RiskAssessmentPanel.jsx# Live on-demand risk assessment widget
│   │   │   ├── Sidebar.jsx           # Command navigation drawer
│   │   │   └── SOSModal.jsx          # Emergency hotline & GPS location copier
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Executive command dashboard
│   │   │   ├── Disasters.jsx         # Incident grid, filter engine, modal form, export
│   │   │   ├── CommunityRoutes.jsx   # Safe-route evacuation guidance & corridor scan
│   │   │   ├── SafetyPreparedness.jsx# Hazard checklists and action guides
│   │   │   ├── TrainingCenters.jsx   # Relief shelter & center management
│   │   │   └── TrainingPrograms.jsx  # Preparedness courses & enrollment
│   │   ├── services/                 # Axios API services
│   │   ├── styles/                   # Modular CSS stylesheets
│   │   ├── App.jsx                   # Application routing definitions
│   │   └── index.css                 # Global styling and CSS design tokens
│   ├── package.json                  # Node dependencies & scripts
│   └── vite.config.js                # Vite build configuration
├── .env.example                      # Root environment variable template
├── render.yaml                       # Cloud infrastructure deployment blueprint
└── README.md                         # Project overview and instructions
```

---

## 🌐 Production Deployment (Render)

The project includes a ready-to-use [`render.yaml`](file:///d:/disaster-management-system-main/disaster-management-system-main/render.yaml) configuration for 1-click deployment on **Render**:

1. **Backend Web Service**:
   - Runtime: `Python 3.11`
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT`
   - Database: Connect to a managed PostgreSQL database (e.g., Neon or Render Postgres) via `DATABASE_URL`.
2. **Frontend Static Site**:
   - Runtime: `Node 20`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Routing: Single-page application rewrites via `frontend/public/_redirects`.

For full deployment instructions, see [PROJECT_DOCUMENTATION.md](file:///d:/disaster-management-system-main/disaster-management-system-main/PROJECT_DOCUMENTATION.md).

---

## 📜 Emergency Disclaimer

RakshaBot and this platform deliver situational awareness, civil defense guidance, and provisional heuristic risk scores based on real-time telemetry. They do not replace official emergency dispatchers, civil defense orders, or statutory evacuation mandates. In any life-threatening emergency, always contact national emergency services (**112** in India or your local equivalent) immediately.