import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database Configuration
# Defaults to SQLite for instant local execution without installing PostgreSQL
# When you install PostgreSQL/pgAdmin, set DATABASE_URL=postgresql://postgres:password@localhost:5432/disaster_management
DEFAULT_SQLITE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "data", "disaster_db.sqlite3")
).replace("\\", "/")

os.makedirs(os.path.dirname(DEFAULT_SQLITE_PATH), exist_ok=True)

raw_db_url = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# Fix postgres:// legacy dialect prefix if present
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_db_url

# Connect arguments & engine parameters
connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
        "timeout": 30,  # Prevent database locked errors under parallel requests
    }
else:
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

