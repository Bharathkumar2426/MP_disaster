import os
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env from backend directory if present
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_file = os.path.join(backend_dir, ".env")
if os.path.exists(env_file):
    try:
        # pyrefly: ignore [missing-import]
        from dotenv import load_dotenv
        load_dotenv(env_file)
    except ImportError:
        # Lightweight manual fallback if python-dotenv is not installed
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

# Database Configuration
# Defaults to SQLite for instant local execution without installing PostgreSQL
DEFAULT_SQLITE_PATH = os.path.abspath(
    os.path.join(backend_dir, "data", "disaster_db.sqlite3")
).replace("\\", "/")

os.makedirs(os.path.dirname(DEFAULT_SQLITE_PATH), exist_ok=True)

raw_db_url = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# Fix postgres:// legacy dialect prefix if present
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_db_url

# If SQLite URL has a relative path (e.g. sqlite:///./data/disaster_db.sqlite3),
# resolve it relative to backend directory so it never breaks regardless of working directory
if DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    rel_part = DATABASE_URL[len("sqlite:///"):]
    # Check if it is not an absolute path (Windows drive letter C: or root /)
    if not (len(rel_part) > 2 and rel_part[1] == ":" or rel_part.startswith("/")):
        abs_db_path = os.path.abspath(os.path.join(backend_dir, rel_part)).replace("\\", "/")
        os.makedirs(os.path.dirname(abs_db_path), exist_ok=True)
        DATABASE_URL = f"sqlite:///{abs_db_path}"

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


