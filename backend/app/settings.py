import os
from pathlib import Path

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "meditrack.db"))
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]

# Gemini is optional: the app stays fully functional without a key.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_SCAN_BYTES = int(os.getenv("MAX_SCAN_BYTES", str(10 * 1024 * 1024)))
