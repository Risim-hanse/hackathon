import base64

from fastapi.testclient import TestClient

import app.routes as routes
from app.main import app
from app.schemas import ScanResponse, ScannedMedication, ScannedPrescription

client = TestClient(app)

# 1x1 transparent PNG
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+7QAAAABJRU5ErkJggg=="
)


def test_scan_status_reports_configuration(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "")
    response = client.get("/api/scan/status")
    assert response.status_code == 200
    assert response.json()["data"]["configured"] is False
    assert response.json()["data"]["model"]


def test_scan_without_key_is_not_a_crash(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "")
    response = client.post("/api/scan", files={"file": ("rx.png", PNG, "image/png")})
    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


def test_scan_rejects_non_images(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "test-key")
    response = client.post("/api/scan", files={"file": ("notes.txt", b"hello", "text/plain")})
    assert response.status_code == 400


def test_scan_returns_reviewable_draft(monkeypatch):
    monkeypatch.setattr(routes, "GEMINI_API_KEY", "test-key")
    fake = ScanResponse(
        prescription=ScannedPrescription(
            issuedDate="2026-11-20",
            prescriberName="Dr Rao",
            pharmacyName="City Pharmacy",
            confidence=0.92,
        ),
        medications=[
            ScannedMedication(
                brandName="Dolo 650",
                genericName="paracetamol",
                strength="650mg",
                times=["08:00"],
                scheduleType="fixedTimes",
            )
        ],
        warnings=[],
        model="gemini-2.5-flash",
        sha256="abc123",
    )
    monkeypatch.setattr(routes, "scan_document", lambda *args, **kwargs: fake)

    response = client.post(
        "/api/scan",
        files={"file": ("rx.png", PNG, "image/png")},
        data={"hints": "Meera, 68"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["prescription"]["prescriberName"] == "Dr Rao"
    assert data["medications"][0]["brandName"] == "Dolo 650"
    assert data["model"] == "gemini-2.5-flash"
    assert data["sha256"] == "abc123"
