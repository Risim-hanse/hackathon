# Setup

## Prerequisites

- Node 20+
- Python 3.11+
- Docker Desktop (optional, for the container path)
- A free Render account

## Frontend

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run test
npm run build      # outputs frontend/dist
```

## Backend (optional)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
py -m pytest
```

> On this Windows machine, the `python` on PATH is an MSYS build without pip.
> Use the `py` launcher (it points at the Python install that has pip).

API docs: http://localhost:8000/docs

## Docker (local full stack)

```powershell
docker compose up --build
# web: http://localhost:8080
# api: http://localhost:8000/api/health
```

## Render deployment

Two services (see `render.yaml`):

1. **Static web** — `frontend`, build `npm install && npm run build`, publish `frontend/dist`,
   rewrite `/*` → `/index.html`. This is the demo URL; it never cold-starts.
2. **Docker API** — `backend/Dockerfile`, health check `/api/health`. Optional.

Set `VITE_API_BASE_URL` on the static service to the API URL **before** building.
If you skip the backend, leave it empty and the app stays fully local.

### One-click blueprint (minimal)

Push the repo, then open:

```
https://render.com/deploy?repo=https://github.com/Risim-hanse/hackathon
```

Render reads `render.yaml`, creates both services, and gives you:
- `https://meditrack-web.onrender.com` — instant static app, no cold start
- `https://meditrack-api.onrender.com/api/health` — optional mirror, may cold-start

The frontend works with the API asleep or absent. The current preview does not call the API yet.

### Render gotchas

- Free web services spin down; static sites do not.
- The free filesystem is ephemeral. SQLite is a mirror, not the source of truth.
- Keep a second browser tab open on the deployed app during judging.

## Health checks

```powershell
curl http://localhost:8000/api/health
.\scripts\check.ps1
```
