import os
import sys
# pyrefly: ignore [missing-import]
import uvicorn

# Ensure the backend directory is in sys.path and set as app_dir
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("Starting Disaster Management FastAPI Backend on http://localhost:8080...")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, app_dir=backend_dir)

