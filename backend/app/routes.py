import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from .db import get_connection
from .scan import payload_for_client, scan_document
from .schemas import ScanStatus, SyncRequest, SyncResponse
from .settings import GEMINI_API_KEY, GEMINI_MODEL, MAX_SCAN_BYTES

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {
        "data": {
            "ok": True,
            "service": "meditrack-api",
            "version": "0.2.0",
            "geminiConfigured": bool(GEMINI_API_KEY),
        }
    }


@router.get("/scan/status")
def scan_status() -> dict:
    return {
        "data": ScanStatus(configured=bool(GEMINI_API_KEY), model=GEMINI_MODEL).model_dump()
    }


@router.post("/scan")
async def scan_document_endpoint(
    file: UploadFile = File(...),
    hints: str = Form(""),
) -> dict:
    """Read a prescription image and return a reviewable medication draft."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini scanning is not configured. Add GEMINI_API_KEY to the API service.",
        )
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload a PNG, JPEG, or WEBP image.")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The image is empty.")
    if len(image_bytes) > MAX_SCAN_BYTES:
        raise HTTPException(status_code=413, detail="The image is too large (10 MB limit).")

    try:
        result = await asyncio.to_thread(
            scan_document,
            image_bytes,
            content_type,
            file.filename or "prescription",
            hints,
        )
    except Exception as exc:  # noqa: BLE001 - surface a safe message to the UI
        raise HTTPException(status_code=502, detail=f"Scanning failed: {exc}") from exc

    return {"data": payload_for_client(result)}


@router.post("/profiles/{profile_id}/sync")
def sync_profile(profile_id: str, payload: SyncRequest) -> dict:
    if payload.profile.id != profile_id:
        raise HTTPException(status_code=400, detail="profile id mismatch")

    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO profiles (id, payload, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = excluded.updated_at
            """,
            (profile_id, payload.profile.model_dump_json(), now),
        )

        # Append-only + idempotent: re-syncing the same event is a no-op.
        for event in payload.events:
            event_id = event.get("id")
            if not event_id:
                continue
            connection.execute(
                """
                INSERT OR IGNORE INTO dose_events (id, profile_id, payload, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (event_id, profile_id, json.dumps(event), now),
            )

        # Documents are also append-only snapshots of the scanned metadata.
        for document in payload.prescriptions:
            document_id = document.get("id")
            if not document_id:
                continue
            connection.execute(
                """
                INSERT OR REPLACE INTO prescriptions (id, profile_id, payload, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (document_id, profile_id, json.dumps(document), now),
            )

    return {"data": SyncResponse(ok=True, syncedAt=now).model_dump()}


@router.get("/profiles/{profile_id}")
def get_profile(profile_id: str) -> dict:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT payload FROM profiles WHERE id = ?", (profile_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="profile not found")

        events = [
            json.loads(event_row["payload"])
            for event_row in connection.execute(
                "SELECT payload FROM dose_events WHERE profile_id = ? ORDER BY created_at",
                (profile_id,),
            )
        ]

    return {
        "data": {
            "profile": json.loads(row["payload"]),
            "events": events,
        }
    }


@router.get("/profiles/{profile_id}/export")
def export_profile(profile_id: str) -> dict:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT payload FROM profiles WHERE id = ?", (profile_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="profile not found")

        events = [
            json.loads(event_row["payload"])
            for event_row in connection.execute(
                "SELECT payload FROM dose_events WHERE profile_id = ? ORDER BY created_at",
                (profile_id,),
            )
        ]

    return {
        "data": {
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "profile": json.loads(row["payload"]),
            "events": events,
        }
    }
