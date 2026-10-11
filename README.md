# 🌍 AI Disaster Operations & Response Management System

A mission-critical full-stack emergency response and tactical operations platform built using **FastAPI (Python)**, **React 19 (Vite)**, **Leaflet GIS Spatial Engine**, and **AI Automation**. Engineered to monitor real-time crises, assess damage, coordinate relief centers, automate triage, and provide life-saving situational awareness.

---

## ⚡ Current Status & Live Localhost URLs

Both frontend and backend microservices are fully configured, seeded, and active in the local development environment:

| Service | Localhost URL | Description | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Reactive Command Center & Tactical GIS UI | 🟢 **ACTIVE** |
| **Backend REST API** | [http://localhost:8080](http://localhost:8080) | Asynchronous FastAPI ASGI Engine | 🟢 **ACTIVE** |
| **Swagger API Docs** | [http://localhost:8080/docs](http://localhost:8080/docs) | Interactive OpenAPI / Swagger UI Test Console | 🟢 **ACTIVE** |
| **ReDoc API Reference** | [http://localhost:8080/redoc](http://localhost:8080/redoc) | Alternative Clean API Specifications | 🟢 **ACTIVE** |

---

## 📖 About the Project

The AI Disaster Operations & Response Management System bridges the gap between chaotic on-the-ground disaster reporting, tactical emergency dispatch, and citizen safety. It delivers automated damage severity assessment, structured voice SOS parsing, interactive spatial threat mapping, situation report (SitRep) generation, and role-based incident tracking.

---

## ✨ Features Implemented

- 🗺️ **Interactive GIS Spatial Map**: High-contrast Leaflet & OpenStreetMap tactical map featuring dynamic threat buffers (8 km LOW, 14 km MEDIUM, 22 km HIGH severity radiuses), shelter capacity pins, and auto-centering.
- 📍 **Autonomous Geocoding Engine**: Built-in 300+ district coordinate registry (`backend/geo_resolver.py` and `frontend/src/utils/geoResolver.js`) that auto-resolves latitude and longitude from location and district names across Indian states, with optional manual GIS precision override.
- 🤖 **AI Operations Grid**: 
  - **Multimodal Damage Assessment**: Evaluates damage text and incident imagery to classify disaster type, damage level, confidence score, and recommended rescue teams.
  - **Voice SOS Incident Extractor**: Converts citizen distress audio/transcripts into structured incident JSON.
  - **24/7 AI Triage Copilot**: Tactical assistant providing emergency first aid protocols and searching nearby relief shelters.
- 📄 **Official SitRep Exporter**: One-click generation of timestamped PDF Situation Reports conforming to emergency command standards (`jsPDF` + `AutoTable`) and instant CSV dataset downloads.
- 🚨 **Real-Time Notification System**: Live ticker alerting personnel of active high-severity incidents, coupled with an interactive alert drawer.
- 🆘 **Emergency SOS Directory & GPS Dispatch**: One-click device GPS coordinate grabber and clipboard copier, alongside instant-dial national emergency hotlines.
- 📋 **Safety Preparedness & Checklist Engine**: Comprehensive hazard action guides (Before, During, After) for Floods, Cyclones, Earthquakes, Fires, Landslides, and Heatwaves with persisted local emergency kit checklist items.
- 📊 **Dynamic Analytics Dashboard**: Live visual breakdown of incident severity, district risk distributions, operational status, and active relief hubs.
- 👥 **Full Entity Management (CRUD)**: Disasters, Relief/Training Centers, Preparedness Programs (with relational center dropdown selection), and User RBAC.
- 🔐 **Secure Role-Based Authentication**: Salted Bcrypt password hashing and signed JWT bearer tokens (`ADMIN`, `TRAINER`, `PARTICIPANT`).
- 🎨 **Modern Non-blocking UI**: Elegant command-center dark mode and glassmorphism styling with inline validation and error banners replacing intrusive browser alerts.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React.js 19 (Vite)
- **Spatial Mapping**: Leaflet & React-Leaflet
- **Reporting Engine**: jsPDF & jsPDF-AutoTable
- **UI & Icons**: Lucide React, Bootstrap 5, Recharts
- **Networking**: Axios with automatic Bearer JWT injection
- **Routing**: React Router DOM (with protected route guards)

### Backend
- **Engine**: Python 3.10+ / FastAPI (Asynchronous ASGI)
- **Database**: SQLite (local default) / PostgreSQL ready with SQLAlchemy 2.0 ORM
- **Security**: JWT Authentication (`python-jose`) & Bcrypt password hashing (`passlib`)
- **Server**: Uvicorn ASGI Web Server & Gunicorn
- **Validation**: Pydantic v2 schemas

---

## 🔑 Default Test Accounts

The local database auto-seeds test accounts on startup:

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@disaster.com` | `admin123` | Full access: Manage disasters, centers, programs, and edit user roles |
| **Trainer** | `trainer@disaster.com` | `trainer123` | Operational access: Report incidents, schedule training programs, view maps |
| **Participant** | `user@disaster.com` | `user123` | Citizen access: View maps, checklists, AI Copilot, emergency SOS |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ (LTS)**
- **Git**

---

### 1. ⚙️ Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Activate the Python virtual environment:
   ```powershell
   # Windows
   .\venv\Scripts\activate

   # Linux / macOS
   source venv/bin/activate
   ```

3. Install required Python packages (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```powershell
   python run.py
   # Runs on http://localhost:8080
   ```

---

### 2. 💻 Frontend Setup (React Vite)

1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

---

## 📂 Project Structure

```text
disaster-management-system/
├── backend/
│   ├── data/
│   │   └── disaster.db               # Local SQLite database
│   ├── routers/
│   │   ├── ai.py                     # AI Multimodal damage, Voice SOS, and Copilot
│   │   ├── auth.py                   # User registration and JWT login
│   │   ├── dashboard.py              # Aggregated metrics and live counters
│   │   ├── disasters.py              # Incident lifecycle, CRUD, filtering & search
│   │   ├── safety.py                 # Emergency directory, checklists, guidelines
│   │   ├── training_centers.py       # Relief shelter hubs & coordinator contact
│   │   ├── training_programs.py      # Community preparedness training sessions
│   │   └── users.py                  # User management and role modification
│   ├── database.py                   # SQLAlchemy engine, session maker, base model
│   ├── geo_resolver.py               # 300+ Indian district coordinates resolver
│   ├── main.py                       # FastAPI entrypoint, CORS configuration, lifecycle
│   ├── models.py                     # SQLAlchemy ORM entity models
│   ├── requirements.txt              # Backend Python dependencies
│   ├── run.py                        # Uvicorn launcher (Port 8080)
│   ├── schemas.py                    # Pydantic validation schemas
│   ├── security.py                   # Password hashing, JWT token verification, RBAC guard
│   ├── seed.py                       # Auto-seeding initial dataset
│   └── .env                          # Local environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertBanner.jsx       # Real-time incident banner ticker
│   │   │   ├── Counter.jsx           # Animated numerical statistics
│   │   │   ├── DashboardCard.jsx     # Overview analytical metric cards
│   │   │   ├── DashboardCharts.jsx   # Severity and district distribution charts
│   │   │   ├── DisasterMap.jsx       # Leaflet interactive GIS spatial map
│   │   │   ├── LoadingSpinner.jsx    # Accessible loading indicators
│   │   │   ├── Navbar.jsx            # Navigation bar with SOS trigger
│   │   │   ├── NotificationDropdown.jsx # Real-time alerts notification popover
│   │   │   ├── ProtectedRoute.jsx    # Role-based route authorization guard
│   │   │   ├── Sidebar.jsx           # Command center navigation drawer
│   │   │   └── SOSModal.jsx          # Emergency hotline & GPS location copier
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx        # Shell layout integrating Navbar, Sidebar, and Ticker
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Executive command dashboard with live feeds
│   │   │   ├── Disasters.jsx         # Incident grid, filter engine, modal form, export
│   │   │   ├── Login.jsx             # Secure authentication portal
│   │   │   ├── NotFound.jsx          # Custom 404 error page
│   │   │   ├── Register.jsx          # New user registration portal
│   │   │   ├── SafetyPreparedness.jsx# Interactive checklists, guidelines, protocols
│   │   │   ├── TrainingCenters.jsx   # Relief shelter & center management
│   │   │   ├── TrainingPrograms.jsx  # Preparedness courses & relational enrollment
│   │   │   └── Users.jsx             # Admin user administration table
│   │   ├── services/                 # Axios API services
│   │   ├── utils/
│   │   │   ├── geoResolver.js        # Frontend district coordinate mapper
│   │   │   └── reportGenerator.js    # jsPDF SitRep and CSV exporter
│   │   ├── App.jsx                   # Application routing definitions
│   │   └── index.css                 # Global styling and CSS tokens
│   ├── package.json                  # Node dependencies & scripts
│   └── vite.config.js                # Vite build configuration
├── PROJECT_DOCUMENTATION.md          # Comprehensive architecture & API documentation
├── render.yaml                       # Cloud infrastructure deployment blueprint
└── README.md                         # Project documentation
```

---

## 📈 Recent Progress & Milestones Achieved

1. **Autonomous Geographic Resolution (`geo_resolver`)**:
   - Integrated a 300+ district coordinate registry for India covering states including Himachal Pradesh, Uttarakhand, Tamil Nadu, Kerala, Karnataka, Maharashtra, Delhi, and more.
   - Disasters and relief centers now automatically resolve GIS coordinates upon entry without requiring manual latitude/longitude input.
   - Added manual GIS coordinate fields and interactive target coordinate badges on incident creation/update dialogs.
2. **Relational Form Integration**:
   - Upgraded Training Programs form to include a live dropdown selector linking directly to available Relief Centers instead of requiring manual numeric ID input.
   - Implemented persistent enrollment tracking via `localStorage`.
3. **Enhanced User Experience & Error Handling**:
   - Replaced browser `alert()` popups across Login, Register, Users, Disasters, Training Centers, and Training Programs with inline glassmorphic error/status banners displaying backend validation details directly.
4. **Verified Full-Stack Health**:
   - Backend successfully verified on port 8080 (`/health` returning 200 OK).
   - Frontend development server successfully verified on port 5173.
   - Auto-seeding confirmed functional with default test credentials.

---

## 🔮 Next Steps & Continuation Roadmap

Here are recommended next steps to build upon current progress:

- [ ] **Live WebSocket Alert Broadcasts**: Implement WebSocket channel (`/ws/alerts`) in FastAPI so when new disasters are logged, all active client map screens update in real time without refreshing.
- [ ] **External Weather & Storm API Integration**: Connect backend to NOAA Climate or OpenWeather API to overlay real-time precipitation, cyclone warnings, and wind vectors on Leaflet GIS.
- [ ] **SMS / WhatsApp Emergency Webhook**: Integrate Twilio or WhatsApp Business API to allow citizens without internet access to send SOS text messages that auto-populate into the incident grid.
- [ ] **Offline PWA Support**: Add service workers and manifest for progressive web app functionality, allowing offline access to safety checklists and emergency hotlines during grid failures.
- [ ] **Cloud Deployment**: Finalize Neon PostgreSQL database connection and deploy using the existing `render.yaml` blueprint.

---

## 📜 License

This project is developed for educational and disaster response operational purposes.