# 🌍 AI Disaster Operations & Response Management System

A full-stack emergency operations platform developed using **FastAPI (Python), React (Vite), Leaflet GIS, and AI Automation** to monitor real-time crises, assess damage, coordinate relief centers, and provide AI triage.

---

## 📖 About the Project

The AI Disaster Management System is designed to improve emergency response through automated damage classification, interactive GIS spatial maps, situation report generation, and role-based incident operations.

---

## ✨ Features

- 🗺️ **Interactive GIS Map**: Live incident & relief hub mapping with Leaflet & OpenStreetMap.
- 🤖 **AI Operations Grid**: Multimodal damage assessment, Voice SOS extraction, and 24/7 AI Copilot triage.
- 📄 **Official SitRep Exporter**: One-click PDF Situation Reports and CSV dataset downloads.
- 🚨 **Real-Time Notification System**: Incident broadcast alerts and unread notification counter.
- 🆘 **Emergency SOS Directory**: 1-click GPS location copier and national emergency hotlines.
- 📊 **Dynamic Live Analytics**: Real-time computed charts for severity & district risk distribution.
- 🔐 **Secure Role-Based Authentication**: JWT authentication with Admin, Trainer, and Participant roles.
- 👥 **Full Entity Management (CRUD)**: Disasters, Training Centers, Training Programs, and Users.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React.js (Vite)
- **Mapping & GIS**: Leaflet & React-Leaflet
- **Reporting**: jsPDF & jsPDF-AutoTable
- **UI & Icons**: Lucide React, Recharts, Bootstrap 5
- **Networking**: Axios

### Backend
- **Engine**: Python 3.10+ / FastAPI (Asynchronous ASGI Engine)
- **Database**: SQLite (Zero-config local default) / PostgreSQL ready with SQLAlchemy ORM
- **Security**: JWT Authentication (python-jose) & Bcrypt password hashing
- **Server**: Uvicorn ASGI Web Server

---

# 🚀 Getting Started

## Prerequisites
- **Python 3.10+**
- **Node.js 18+ (LTS)**
- **Git**

---

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/disaster-management-system.git
cd disaster-management-system
```

---

## 2. ⚙️ Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. (Optional but recommended) Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Update API keys in `.env` if you plan to use Gemini AI or OpenCage Geocoding)*

5. Start the backend server:
   ```bash
   python run.py
   # OR: uvicorn main:app --reload --port 8080
   ```

   - **Backend API**: `http://localhost:8080`
   - **Interactive Swagger Docs**: `http://localhost:8080/docs`

---

## 3. 💻 Frontend Setup (React Vite)

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

   - **Frontend App**: `http://localhost:5173`

---

## 🔑 Default Seed Credentials

When starting the backend for the first time, the database is auto-seeded with test accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@disaster.com` | `admin123` |
| **Trainer** | `trainer@disaster.com` | `trainer123` |
| **Participant** | `user@disaster.com` | `user123` |

---

## 📂 Project Structure

```text
├── backend/
│   ├── data/                 # Local database storage (.gitkeep)
│   ├── routers/              # Modular FastAPI route handlers
│   │   ├── ai.py             # AI operations, multimodal & triage
│   │   ├── auth.py           # Authentication & token endpoints
│   │   ├── dashboard.py      # Aggregated metrics & analytics
│   │   ├── disasters.py      # Incident reporting & CRUD
│   │   ├── training_centers.py # Relief & training hubs
│   │   ├── training_programs.py# Preparedness courses
│   │   └── users.py          # User management
│   ├── .env.example          # Template environment config
│   ├── database.py           # SQLAlchemy database connection
│   ├── main.py               # FastAPI application entrypoint
│   ├── models.py             # SQLAlchemy ORM models
│   ├── requirements.txt      # Python dependencies
│   ├── run.py                # Server launcher script
│   ├── schemas.py            # Pydantic validation models
│   ├── security.py           # JWT & password hashing
│   └── seed.py               # Auto-seeding initial dataset
├── frontend/
│   ├── src/                  # React source files & components
│   ├── package.json          # Node dependencies & scripts
│   └── vite.config.js        # Vite build configuration
├── .gitignore                # Production git ignore configuration
└── README.md                 # Complete documentation
```

---

## 📜 License

This project is developed for educational and disaster response operational purposes.