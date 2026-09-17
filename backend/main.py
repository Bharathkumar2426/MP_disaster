from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
from seed import seed_database
from routers import (
    auth,
    dashboard,
    disasters,
    training_centers,
    training_programs,
    users,
    ai,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and auto-seed initial database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="Disaster Management System API",
    description="High-performance asynchronous emergency command & AI intelligence backend powered by FastAPI.",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS for React frontend (localhost:5173 and any dev port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        ],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "HEALTHY", "code": 200}
