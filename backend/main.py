import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load .env if present
env_file = os.path.join(backend_dir, ".env")
if os.path.exists(env_file):
    try:
        # pyrefly: ignore [missing-import]
        from dotenv import load_dotenv
        load_dotenv(env_file, override=True)
    except ImportError:
        pass

from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
import models
from seed import seed_database
from migrations import run_migrations
from gdacs_collector import get_gdacs_collector
from routers import (
    auth,
    dashboard,
    disasters,
    training_centers,
    training_programs,
    users,
    ai,
    safety,
    notifications,
    community_reports,
    routes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables, run safe schema migrations, and auto-seed initial database
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Start GDACS background collector (non-blocking, graceful)
    collector = get_gdacs_collector()
    collector.start()

    yield

    # Shutdown: Stop GDACS collector cleanly
    await collector.stop()


app = FastAPI(
    title="Disaster Management System API",
    description="High-performance asynchronous emergency command & AI intelligence backend powered by FastAPI.",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS: allow localhost dev ports + any *.onrender.com production domain
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$"
        r"|^https://[a-z0-9\-]+\.onrender\.com$"
    ),
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register All API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(disasters.router)
app.include_router(training_centers.router)
app.include_router(training_programs.router)
app.include_router(users.router)
app.include_router(ai.router)
app.include_router(safety.router)
app.include_router(notifications.router)
app.include_router(community_reports.router)
app.include_router(routes.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ONLINE",
        "system": "Disaster Management Operations Platform",
        "runtime": "Python FastAPI",
        "docs": "/docs",
        "endpoints": [
            "/api/auth",
            "/api/dashboard",
            "/api/disasters",
            "/api/training-centers",
            "/api/training-programs",
            "/api/users",
            "/api/ai",
            "/api/safety",
            "/api/notifications",
        ],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "HEALTHY", "code": 200}
