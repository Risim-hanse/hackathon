# Backend (optional)

Owner: **Backend agent**.

FastAPI + SQLite. This is a **persistence/audit mirror**, not the product.
The React app must work with this service completely down.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | deploy/health proof |
| POST | `/api/profiles/{id}/sync` | upsert profile + append events (idempotent) |
| GET | `/api/profiles/{id}` | profile + events |
| GET | `/api/profiles/{id}/export` | JSON export |

## Run locally

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
py -m pytest
```

## Docker

```powershell
docker build -t meditrack-api .
docker run -p 8000:8000 -e CORS_ORIGINS="*" meditrack-api
```

## Render warning

Render's free filesystem is ephemeral and free web services spin down. That is
acceptable because the frontend is the source of truth: SQLite is only a mirror.
For real durability, attach a persistent disk or use Render Postgres.
