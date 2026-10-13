# 🌍 AI Disaster Operations & Intelligent Incident Management Platform
## Comprehensive Technical Architecture & Engineering Documentation

---

## 📑 Table of Contents
1. [Executive Overview](#1-executive-overview)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Phased Feature Implementations (Phases 1 – 8.1)](#3-phased-feature-implementations-phases-1--81)
   - [3.1 Phase 1 & 2: Core Platform, RBAC, GIS Mapping & Geocoding](#31-phase-1--2-core-platform-rbac-gis-mapping--geocoding)
   - [3.2 Phase 3: AI Triage, Voice SOS Extraction & Damage NLP](#32-phase-3-ai-triage-voice-sos-extraction--damage-nlp)
   - [3.3 Phase 4: Automated GDACS Global Disaster Feed Collector](#33-phase-4-automated-gdacs-global-disaster-feed-collector)
   - [3.4 Phase 5: Citizen Community Reports & Verification Workflow](#34-phase-5-citizen-community-reports--verification-workflow)
   - [3.5 Phase 6: Live Meteorological Telemetry & Explainable Risk Engine](#35-phase-6-live-meteorological-telemetry--explainable-risk-engine)
   - [3.6 Phase 7: Safe-Route Guidance Corridor & Hazard Intersect Engine](#36-phase-7-safe-route-guidance-corridor--hazard-intersect-engine)
   - [3.7 Phase 8 & 8.1: RakshaBot Real-Time AI Assistant & Grounded Fallback Engine](#37-phase-8--81-rakshabot-real-time-ai-assistant--grounded-fallback-engine)
4. [Database Architecture & Entity Models](#4-database-architecture--entity-models)
5. [Complete REST API Reference](#5-complete-rest-api-reference)
6. [Security, Authentication & Authorization](#6-security-authentication--authorization)
7. [Render Cloud Deployment Architecture](#7-render-cloud-deployment-architecture)
8. [Database Migration & Persistence Strategy](#8-database-migration--persistence-strategy)
9. [Verification, Health Checks & Testing](#9-verification-health-checks--testing)

---

## 1. Executive Overview

The **AI Disaster Operations & Intelligent Incident Management Platform** is a full-stack, enterprise-grade incident coordination and civil defense platform. Engineered to operate under high-stress conditions, it bridges the gap between chaotic on-the-ground disaster reporting, automated meteorological telemetry, algorithmic risk evaluation, and citizen emergency assistance.

### Core Capabilities:
- **Spatial GIS Command Center**: Real-time crisis tracking on an interactive Leaflet map with multi-tier threat buffers and relief center pins.
- **Automated Data Ingestion**: Background polling of global alerts from the Global Disaster Alert and Coordination System (GDACS).
- **Explainable Risk Assessment**: Heuristic, physics-grounded risk scoring (`PROVISIONAL_RULE_BASED_v1.0`) powered by Open-Meteo real-time atmospheric data.
- **Evacuation Route Guidance**: Safe-route corridor calculation with active hazard proximity alerts.
- **RakshaBot (रक्षाBot)**: An intelligent conversational safety assistant powered by Google Gemini, equipped with multi-intent classification and a data-grounded fallback engine.

### Live Cloud Deployments (Render):
- **Frontend Web App**: [https://disaster-frontend-92h2.onrender.com](https://disaster-frontend-92h2.onrender.com)
- **Backend API Engine**: [https://disaster-backend-9ygl.onrender.com](https://disaster-backend-9ygl.onrender.com)
- **Interactive OpenAPI Console**: [https://disaster-backend-9ygl.onrender.com/docs](https://disaster-backend-9ygl.onrender.com/docs)
- **Production Healthcheck**: [https://disaster-backend-9ygl.onrender.com/health](https://disaster-backend-9ygl.onrender.com/health)

---

## 2. High-Level System Architecture

The platform uses a decoupled, asynchronous client-server architecture:

```mermaid
graph TD
    subgraph Client ["Frontend: React 19 + Vite (Port 5173)"]
        UI[Command Center Dashboard]
        GIS[Leaflet GIS Spatial Map]
        RakshaUI[RakshaBot Floating Panel]
        RouteUI[Safe-Route Corridor Finder]
        Axios[Axios Client with JWT Interceptor]
    end

    subgraph Backend ["Backend: FastAPI Asynchronous ASGI (Port 8080)"]
        FastAPI[FastAPI Gateway]
        Security[JWT Verification & RBAC Guards]
        
        subgraph Services ["Platform Intelligence Services"]
            RakshaSvc[RakshaBot Service & Gemini Client]
            RiskSvc[Provisional Risk Engine v1.0]
            WeatherSvc[Open-Meteo Weather Service]
            RouteSvc[OSRM Route & Buffer Scanner]
            GeoSvc[District GeoResolver & Haversine]
            GDACSSvc[GDACS Ingestion Collector]
        end
        
        subgraph Routers ["FastAPI API Routers"]
            AuthR["/api/auth"]
            DisasterR["/api/disasters"]
            ReportR["/api/community-reports"]
            RouteR["/api/routes"]
            AIR["/api/ai (Chat & Copilot)"]
            CenterR["/api/training-centers"]
            ProgR["/api/training-programs"]
            SafetyR["/api/safety"]
            NotifR["/api/notifications"]
        end
        
        ORM[SQLAlchemy 2.0 ORM]
    end

    subgraph DataLayer ["Data & External Providers"]
        DB[(SQLite Local / PostgreSQL Neon)]
        GeminiAPI[Google Gemini 2.5 Flash]
        OpenMeteo[Open-Meteo API]
        GDACSFeed[GDACS Global RSS/JSON Feed]
        OSRMAPI[OSRM Project Driving API]
    end

    UI --> Axios
    RakshaUI --> Axios
    RouteUI --> Axios
    GIS --> Axios
    
    Axios -->|Bearer JWT HTTP Requests| FastAPI
    FastAPI --> Security
    Security --> Routers
    
    Routers --> Services
    Services --> ORM
    ORM --> DB
    
    RakshaSvc --> GeminiAPI
    WeatherSvc --> OpenMeteo
    GDACSSvc --> GDACSFeed
    RouteSvc --> OSRMAPI
```

---

## 3. Phased Feature Implementations (Phases 1 – 8.1)

### 3.1 Phase 1 & 2: Core Platform, RBAC, GIS Mapping & Geocoding
- **Entity Management**: CRUD operations for Disasters, Training Centers, and Training Programs.
- **Role-Based Access Control (RBAC)**: Enforced via JWT tokens and bcrypt salted hashes:
  - `ADMIN`: Full administrative privileges, user role assignment, report moderation.
  - `TRAINER`: Operational incident logging, course creation, responder verification.
  - `PARTICIPANT`: Citizen incident submission, interactive checklists, RakshaBot assistance.
- **Autonomous Geocoding (`geo_resolver`)**: Built-in 300+ district coordinate lookup covering all Indian states and Union Territories, with manual latitude/longitude override support.
- **Interactive Leaflet Map**: Severity buffers (LOW: 8 km, MEDIUM: 14 km, HIGH: 22 km) rendered around active incidents.

### 3.2 Phase 3: AI Triage, Voice SOS Extraction & Damage NLP
- **Multimodal Damage Assessment**: Heuristic and NLP analysis of incident descriptions and images, suggesting severity, hazards, and recommended rescue teams (USAR, Swiftwater, Hazmat).
- **Voice SOS Incident Extractor**: Extracts structured incident parameters (disaster type, district, severity, urgency) from raw distress audio transcripts.
- **24/7 Command Copilot**: Automated responses providing first-aid instructions and shelter capacity lookups.

### 3.3 Phase 4: Automated GDACS Global Disaster Feed Collector
- **Asynchronous Background Ingestion**: [backend/gdacs_collector.py](file:///d:/disaster-management-system-main/disaster-management-system-main/backend/gdacs_collector.py) polls the Global Disaster Alert and Coordination System feed at configurable intervals (`GDACS_POLL_INTERVAL_SECONDS=300`).
- **Idempotent Upserting**: [backend/disaster_upsert.py](file:///d:/disaster-management-system-main/disaster-management-system-main/backend/disaster_upsert.py) identifies existing records by GDACS event ID or coordinate/date hashes, updating severity and metrics without creating duplicate entries.

### 3.4 Phase 5: Citizen Community Reports & Verification Workflow
- **Crowdsourced Intelligence**: Endpoints at `/api/community-reports` allow citizens to submit field observations (e.g., local waterlogging, blocked roads).
- **Verification Workflow**: Submitted reports enter `PENDING` status. Only authenticated `TRAINER` (Responders) or `ADMIN` users can inspect, attach verification notes, and mark reports as `VERIFIED` or `REJECTED`.
- **Feed Integration**: Verified community reports automatically feed into spatial map layers and RakshaBot proximity scans.

### 3.5 Phase 6: Live Meteorological Telemetry & Explainable Risk Engine
- **Open-Meteo Integration**: [backend/weather_service.py](file:///d:/disaster-management-system-main/disaster-management-system-main/backend/weather_service.py) fetches live physical observations (temperature, relative humidity, precipitation rate, wind speed, gusts) using exact coordinates.
- **Explainable Provisional Risk Engine**: [backend/risk_service.py](file:///d:/disaster-management-system-main/disaster-management-system-main/backend/risk_service.py) evaluates `PROVISIONAL_RULE_BASED_v1.0`:
  - Deterministically evaluates atmospheric thresholds against specific disaster hazards (e.g., precipitation > 25 mm/h or sustained winds > 50 km/h).
  - Produces a risk score (0–100) and category (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - **Regulatory Safety Notice**: Explicitly states that statistical probability is `NULL` and that heuristic scores do not guarantee route safety or replace official civil defense evacuation orders.

### 3.6 Phase 7: Safe-Route Guidance Corridor & Hazard Intersect Engine
- **OSRM Road Network Routing**: [backend/routing_service.py](file:///d:/disaster-management-system-main/disaster-management-system-main/backend/routing_service.py) computes driving trajectories between origin and destination coordinates via the OSRM public routing API (with straight-line geodesic fallback if OSRM is unreachable).
- **Corridor Hazard Scanner**: Downsamples the polyline route into equidistant checkpoint samples and scans for active disaster records and verified citizen reports within a configurable buffer radius (5–50 km).
- **Safety Advisory Classification**: Marks corridors as `CLEAR`, `ADVISORY`, `MODERATE_PROXIMITY`, or `CRITICAL_PROXIMITY` depending on hazard distance.

### 3.7 Phase 8 & 8.1: RakshaBot Real-Time AI Assistant & Grounded Fallback Engine
- **Primary AI Provider**: Google Gemini API (`gemini-2.5-flash-lite` and `gemini-2.5-flash`).
- **Prompt Grounding**: Every prompt is dynamically augmented with live database records, GDACS feeds, Open-Meteo telemetry, and NDMA guidelines.
- **Intent Discrimination**: Categorizes user questions into 6 distinct intents:
  1. `SAFETY_GUIDANCE`: Action steps, evacuation protocols, 72-hour survival kit items.
  2. `TRAINING_AND_RELIEF`: Active courses, trainer details, relief shelter capacities.
  3. `WEATHER_AND_RISK`: Open-Meteo current observations and provisional risk metrics.
  4. `LOCATION_INCIDENTS`: Proximity search for disasters near a specific city/district.
  5. `GLOBAL_INCIDENTS_OVERVIEW`: Overall counts of active crises monitored worldwide.
  6. `GENERAL`: Standard civil defense and emergency helpline directory.
- **Quota & Rate-Limiting Protection (HTTP 429)**:
  - In-memory sliding-window limiter (15 requests/minute per user).
  - 7.0-second bounded request timeout per Gemini model.
  - Active 60-second cooldown on HTTP 429 to prevent stalled sequential retries.
- **Grounded Direct Telemetry Fallback**: If Gemini is rate-limited, unavailable, or times out, the backend generates an intent-specific, data-grounded response directly from active database records and NDMA guidelines.
- **Frontend Architecture**:
  - Minimizable floating panel with custom launcher chip.
  - Functional state updaters (`setMessages(prev => [...prev, ...])`) preventing closure race conditions.
  - Synchronized session history via `sessionStorage`.

---

## 4. Database Architecture & Entity Models

The schema is defined in [backend/models.py](file:///d:/disaster-management-system-main/disaster-management-system-main/backend/models.py) using SQLAlchemy 2.0 ORM:

### 1. `users`
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment |
| `name` | String(100) | Full user name |
| `email` | String(120) | Unique, Indexed, Required |
| `password` | String(255) | Salted Bcrypt password hash |
| `role` | String(20) | Enum: `ADMIN`, `TRAINER`, `PARTICIPANT` (default: `PARTICIPANT`) |
| `phone` | String(20) | Optional contact phone number |
| `alertLocationName` | String(100) | Saved alert zone label (e.g., "Kochi") |
| `alertLatitude` | Float | Saved alert zone latitude |
| `alertLongitude` | Float | Saved alert zone longitude |
| `alertRadiusKm` | Float | Alert proximity radius in km (default: 25.0) |

### 2. `disasters`
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment |
| `disasterName` | String(150) | Incident title / event descriptor |
| `disasterType` | String(50) | `Flood`, `Cyclone`, `Earthquake`, `Fire`, `Landslide`, `Tsunami` |
| `severity` | String(20) | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `district` | String(100) | Administrative district |
| `location` | String(200) | Detailed sector / landmark description |
| `latitude` | Float | Geographic latitude |
| `longitude` | Float | Geographic longitude |
| `status` | String(20) | `ACTIVE`, `MONITORING`, `RESOLVED` |
| `source` | String(50) | `MANUAL`, `GDACS`, `CITIZEN` |
| `description` | Text | Situation remarks |
| `reportedDate` | DateTime | Initial reporting timestamp |

### 3. `community_reports`
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment |
| `reporterId` | Integer | Foreign Key -> `users.id` |
| `disasterType` | String(50) | Type of observed incident |
| `locationName` | String(150) | Location description |
| `district` | String(100) | District name |
| `latitude` | Float | Observation latitude |
| `longitude` | Float | Observation longitude |
| `severity` | String(20) | `LOW`, `MEDIUM`, `HIGH` |
| `status` | String(20) | `PENDING`, `VERIFIED`, `REJECTED` |
| `verificationNotes` | Text | Notes added by inspecting responder |
| `verifiedByUserId`| Integer | Foreign Key -> `users.id` |
| `createdAt` | DateTime | Submission timestamp |

### 4. `training_centers`
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment |
| `centerName` | String(150) | Facility title |
| `district` | String(100) | District location |
| `address` | Text | Full street address |
| `latitude` | Float | Geocoded latitude |
| `longitude` | Float | Geocoded longitude |
| `capacity` | Integer | Shelter occupant capacity |
| `contactNumber` | String(50) | Station desk emergency contact |
| `status` | String(20) | `ACTIVE`, `INACTIVE` |

### 5. `training_programs`
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment |
| `programName` | String(150) | Course title |
| `description` | Text | Syllabus & preparation overview |
| `trainerName` | String(100) | Certified instructor name |
| `durationDays` | Integer | Course duration in days |
| `maxParticipants`| Integer | Enrollment limit |
| `trainingCenterId`| Integer | Foreign Key -> `training_centers.id` |
| `status` | String(20) | `ACTIVE`, `COMPLETED`, `CANCELLED` |

### 6. `notifications`
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary Key, Auto-increment |
| `userId` | Integer | Target user ID (or NULL for system-wide broadcast) |
| `title` | String(150) | Notification title |
| `message` | Text | Detailed alert advisory |
| `severity` | String(20) | `INFO`, `WARNING`, `CRITICAL` |
| `isRead` | Boolean | Read state indicator |
| `createdAt` | DateTime | Alert timestamp |

---

## 5. Complete REST API Reference

All API routes are served under the `/api` prefix. Interactive Swagger documentation is available at `/docs`.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user (`PARTICIPANT`).
- `POST /api/auth/login` — Authenticate credentials; returns signed JWT bearer token.
- `GET /api/auth/profile` — Fetch authenticated user profile details.
- `PUT /api/auth/alert-preferences` — Update user GPS alert zone coordinates and radius.

### Disaster Operations (`/api/disasters`)
- `GET /api/disasters` — List incidents (supports filtering by `severity`, `status`, `disaster_type`, `district`).
- `POST /api/disasters` — Log a new disaster (`ADMIN` or `TRAINER`).
- `GET /api/disasters/{id}` — Get single incident details.
- `PUT /api/disasters/{id}` — Update incident attributes (`ADMIN` or `TRAINER`).
- `DELETE /api/disasters/{id}` — Remove an incident (`ADMIN` only).
- `GET /api/disasters/{id}/weather` — Fetch live Open-Meteo weather for incident coordinates.
- `GET /api/disasters/{id}/risk-assessment` — Calculate explainable provisional risk for incident coordinates.
- `GET /api/disasters/gdacs/status` — Get GDACS background feed collector synchronization status.

### Community Reports (`/api/community-reports`)
- `GET /api/community-reports` — List community citizen reports.
- `POST /api/community-reports` — Submit crowdsourced distress report (`PARTICIPANT`).
- `PUT /api/community-reports/{id}/status` — Verify or reject report (`TRAINER` or `ADMIN`).

### Safe Routes (`/api/routes`)
- `POST /api/routes/safe-route` — Compute driving route, scan active hazards in corridor buffer, and return safety advisory.

### AI Operations & RakshaBot (`/api/ai`)
- `POST /api/ai/chat` — Primary RakshaBot conversational endpoint (authenticated, rate-limited, grounded in live telemetry).
- `POST /api/ai/rakshabot` — Direct alias for `/api/ai/chat`.
- `POST /api/ai/analyze-damage` — Multimodal damage classification and rescue team dispatch suggestion.
- `POST /api/ai/voice-report` — Structured incident parameter extraction from distress speech transcripts.
- `POST /api/ai/copilot` — 24/7 incident copilot triage assistant.
- `POST /api/ai/risk-assessment` — On-demand explainable risk assessment for coordinates.

### Training Centers & Shelters (`/api/training-centers`)
- `GET /api/training-centers` — List registered relief shelters and centers.
- `POST /api/training-centers` — Register a new shelter center (`ADMIN`).
- `PUT /api/training-centers/{id}` — Update shelter details (`ADMIN`).
- `DELETE /api/training-centers/{id}` — Delete shelter record (`ADMIN`).

### Training Programs (`/api/training-programs`)
- `GET /api/training-programs` — List preparedness training programs.
- `POST /api/training-programs` — Create a training course (`ADMIN` or `TRAINER`).
- `PUT /api/training-programs/{id}` — Update course attributes (`ADMIN` or `TRAINER`).
- `DELETE /api/training-programs/{id}` — Delete course record (`ADMIN`).

### Safety & Emergency Preparedness (`/api/safety`)
- `GET /api/safety/types` — Catalog of supported disaster safety categories.
- `GET /api/safety/{disaster_type}` — Comprehensive action checklist (Before, During, After) and emergency kit guide.
- `GET /api/safety/recommendations` — Intelligent location-specific preparedness recommendations.
- `GET /api/safety/contacts` — Official national emergency helplines directory.

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Retrieve user alert notifications and unread counter.
- `PUT /api/notifications/{id}/read` — Mark notification as read.
- `PUT /api/notifications/read-all` — Mark all notifications as read.

---

## 6. Security, Authentication & Authorization

1. **Password Hashing**: User passwords are encrypted using Bcrypt with salted rounds via `passlib[bcrypt]`.
2. **JWT Authorization**: Requests must provide `Authorization: Bearer <token>`. Signed using `HS256` with expiration windows configured in `ACCESS_TOKEN_EXPIRE_MINUTES`.
3. **Role Guards**: FastAPI dependencies verify role claims (`security.require_role("ADMIN")`). Unauthorized actions return `HTTP 403 Forbidden`.
4. **Credential Protection**:
   - Secrets are loaded exclusively through environment variables.
   - `.env` is ignored by `.gitignore`.
   - API keys and tokens are never returned in error responses or client payloads.
5. **Rate Limiting**: Sliding-window rate limiter prevents request flooding (15 queries per 60 seconds per user on RakshaBot).

---

## 7. Render Cloud Deployment Architecture

The repository contains an automated blueprint definition in [render.yaml](file:///d:/disaster-management-system-main/disaster-management-system-main/render.yaml):

### Backend Web Service Configuration:
- **Service Type**: Web Service
- **Runtime**: `Python 3.11`
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT`
- **Environment Variables**:
  - `ENVIRONMENT`: `production`
  - `DEBUG`: `false`
  - `DATABASE_URL`: Managed PostgreSQL connection string (Neon or Render Postgres)
  - `JWT_SECRET_KEY`: Long random secret string
  - `JWT_ALGORITHM`: `HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440`
  - `GEMINI_API_KEY`: Google AI Studio API key
  - `FRONTEND_URL`: URL of the deployed frontend static site
  - `OPEN_METEO_BASE_URL`: `https://api.open-meteo.com/v1/forecast`
  - `GDACS_FEED_URL`: `https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP`
  - `GDACS_POLL_INTERVAL_SECONDS`: `300`

### Frontend Static Site Configuration:
- **Service Type**: Static Site
- **Runtime**: `Node 20`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: URL of the deployed backend Web Service + `/api`
- **SPA Routing**: Single-page application route rewrite handled via `frontend/public/_redirects`.

---

## 8. Database Migration & Persistence Strategy

1. **Local Development (SQLite)**:
   - Uses `sqlite:///./data/disaster_db.sqlite3`.
   - Auto-creates tables and seeds default test users and records on startup.
2. **Production Hosting (PostgreSQL)**:
   - Render Web Services run on ephemeral disks. Storing SQLite files directly on Render causes data loss upon service restart.
   - In production, set `DATABASE_URL` to a PostgreSQL connection URI (e.g., `postgresql+psycopg2://USER:PASS@HOST:5432/DB_NAME`).
   - `psycopg2-binary>=2.9.9` is included in `backend/requirements.txt`.
   - `models.Base.metadata.create_all(bind=engine)` runs on application startup, creating tables automatically.

---

## 9. Verification, Health Checks & Testing

The platform includes dedicated automated verification suites in `backend/`:

1. **System Health Check**:
   - `GET /health` returns `{ "status": "HEALTHY", "database": "CONNECTED", "timestamp": ... }`.
2. **RakshaBot Multi-Intent Test (`backend/test_rakshabot_verification.py`)**:
   - Verifies that queries for live disasters, location proximity, weather/risk, training programs, and safety checklists produce distinct, evidence-grounded answers.
3. **Fallback Resiliency Test (`backend/test_fallback_verification.py`)**:
   - Simulates Gemini HTTP 429 quota exhaustion and verifies that all 5 benchmark questions receive question-specific direct telemetry answers.
4. **Dynamic Database Visibility Test (`backend/test_database_grounded_dynamic.py`)**:
   - Confirms that newly added database records are immediately retrievable and synthesized by the chatbot without restarting or retraining.
5. **Critical Services Verification (`backend/test_critical_features_check.py`)**:
   - Confirms database model integrity, Haversine geo-math, Open-Meteo observations, Risk Engine scoring, and Safe-Route corridor calculations.

---

*This technical documentation serves as the complete operational and architectural manual for the platform.*
