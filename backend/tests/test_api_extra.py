import base64

from fastapi.testclient import TestClient

import app.routes as routes
from app.main import app

client = TestClient(app)

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+7QAAAABJRU5ErkJggg=="
)


def profile(profile_id: str) -> dict:
    return {
        "id": profile_id,
        "name": "Meera",
        "age": 68,
        "caregiverName": "Anita",
        "caregiverPhone": "+919000000000",
        "pharmacistPhone": "+919000000001",
        "preferences": {
            "largeText": False,
            "highContrast": False,
            "lateGraceMinutes": 120,
            "missedGraceMinutes": 240,
            "notificationsEnabled": False,
        },
    }


def payload(profile_id: str) -> dict:
    return {
        "profile": profile(profile_id),
        "medications": [{"id": "med-1", "brandName": "Dolo 650"}],
        "prescriptions": [
            {
                "id": "rx-1",
                "status": "active",
                "source": {
                    "imageRef": "img-1",
                    "fileName": "rx.png",
                    "mimeType": "image/png",
                    "sha256": "abc",
                    "scannedAt": "2026-11-21T10:00:00Z",
                    "kind": "prescription",
                },
                "createdAt": "2026-11-21T10:00:00Z",
            }
        ],
        "events": [
            {
                "id": f"evt-{profile_id}-1",
                "doseId": f"med-1_2026-11-21_08:00_{profile_id}",
                "medicationId": "med-1",
                "scheduledFor": "2026-11-21T08:00:00.000Z",
                "actionAt": "2026-11-21T08:05:00.000Z",
                "action": "taken",
            }
        ],
    }


def test_health_has_version_and_gemini_flag(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "")
    response = client.get("/api/health")
    data = response.json()["data"]
    assert data["ok"] is True
    assert data["version"] == "0.2.0"
    assert data["geminiConfigured"] is False


def test_scan_status_returns_model_name(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "key")
    response = client.get("/api/scan/status")
    assert response.json()["data"]["configured"] is True
    assert response.json()["data"]["model"]


def test_sync_rejects_profile_id_mismatch():
    response = client.post("/api/profiles/other-id/sync", json=payload("real-id"))
    assert response.status_code == 400
    assert "mismatch" in response.json()["detail"]


def test_sync_stores_prescription_metadata():
    client.post("/api/profiles/extra-1/sync", json=payload("extra-1"))
    fetched = client.get("/api/profiles/extra-1").json()["data"]
    assert fetched["profile"]["name"] == "Meera"
    assert len(fetched["events"]) == 1


def test_sync_is_idempotent_for_events():
    body = payload("extra-2")
    client.post("/api/profiles/extra-2/sync", json=body)
    client.post("/api/profiles/extra-2/sync", json=body)
    fetched = client.get("/api/profiles/extra-2").json()["data"]
    assert len(fetched["events"]) == 1


def test_sync_skips_events_without_id():
    body = payload("extra-3")
    body["events"] = [{"action": "taken"}]
    response = client.post("/api/profiles/extra-3/sync", json=body)
    assert response.status_code == 200
    assert client.get("/api/profiles/extra-3").json()["data"]["events"] == []


def test_get_unknown_profile_returns_404():
    assert client.get("/api/profiles/does-not-exist").status_code == 404


def test_export_unknown_profile_returns_404():
    assert client.get("/api/profiles/does-not-exist/export").status_code == 404


def test_export_includes_timestamp_and_profile():
    client.post("/api/profiles/extra-4/sync", json=payload("extra-4"))
    data = client.get("/api/profiles/extra-4/export").json()["data"]
    assert data["exportedAt"]
    assert data["profile"]["id"] == "extra-4"
    assert len(data["events"]) == 1


def test_scan_rejects_empty_image(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "key")
    response = client.post("/api/scan", files={"file": ("empty.png", b"", "image/png")})
    assert response.status_code == 400


def test_scan_rejects_oversized_image(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "key")
    monkeypatch.setattr(routes, "MAX_SCAN_BYTES", 10)
    response = client.post("/api/scan", files={"file": ("big.png", PNG, "image/png")})
    assert response.status_code == 413


def test_scan_returns_502_when_gemini_fails(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "key")

    def explode(*args, **kwargs):
        raise RuntimeError("model offline")

    monkeypatch.setattr(routes, "scan_document", explode)
    response = client.post("/api/scan", files={"file": ("rx.png", PNG, "image/png")})
    assert response.status_code == 502
    assert "model offline" in response.json()["detail"]


def test_sync_accepts_empty_arrays():
    body = payload("extra-5")
    body["medications"] = []
    body["events"] = []
    body["prescriptions"] = []
    assert client.post("/api/profiles/extra-5/sync", json=body).status_code == 200
