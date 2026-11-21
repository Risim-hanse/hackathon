import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from .db import get_connection
from .schemas import SyncRequest, SyncResponse

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"data": {"ok": True, "service": "meditrack-api", "version": "0.1.0"}}


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
