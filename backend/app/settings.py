import os
from pathlib import Path

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "meditrack.db"))
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
