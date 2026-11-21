from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["data"]["ok"] is True


def test_sync_then_fetch_and_export():
    profile = {
        "id": "test-profile",
        "name": "Meera",
        "age": 68,
        "preferences": {
            "largeText": False,
            "highContrast": False,
            "lateGraceMinutes": 120,
            "missedGraceMinutes": 240,
            "notificationsEnabled": False,
        },
    }
    payload = {
        "profile": profile,
        "medications": [{"id": "med-1", "brandName": "Dolo 650"}],
        "events": [
            {
                "id": "evt-1",
                "doseId": "med-1_2026-11-21_08:00",
                "medicationId": "med-1",
                "scheduledFor": "2026-11-21T08:00:00.000Z",
                "actionAt": "2026-11-21T08:05:00.000Z",
                "action": "taken",
            }
        ],
    }

    sync = client.post("/api/profiles/test-profile/sync", json=payload)
    assert sync.status_code == 200
    assert sync.json()["data"]["ok"] is True

    # Idempotent re-sync.
    assert client.post("/api/profiles/test-profile/sync", json=payload).status_code == 200

    fetched = client.get("/api/profiles/test-profile")
    assert fetched.status_code == 200
    assert fetched.json()["data"]["profile"]["name"] == "Meera"
    assert len(fetched.json()["data"]["events"]) == 1

    exported = client.get("/api/profiles/test-profile/export")
    assert exported.status_code == 200
    assert exported.json()["data"]["profile"]["id"] == "test-profile"
