"""
Pydantic mirrors of `frontend/src/shared/contracts.ts`.

The frontend contract is the source of truth. The backend validates the envelope
and stores the payloads; it never recomputes scheduling or safety logic. The
Gemini scan models mirror the `Scanned*` contracts exactly.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


class Preferences(BaseModel):
    largeText: bool = False
    highContrast: bool = False
    lateGraceMinutes: int = 120
    missedGraceMinutes: int = 240
    notificationsEnabled: bool = False


class Profile(BaseModel):
    id: str
    name: str
    age: int | None = None
    caregiverName: str | None = None
    caregiverPhone: str | None = None
    pharmacistPhone: str | None = None
    preferences: Preferences = Field(default_factory=Preferences)


class SyncRequest(BaseModel):
    profile: Profile
    medications: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
    prescriptions: list[dict[str, Any]] = Field(default_factory=list)


class SyncResponse(BaseModel):
    ok: bool
    syncedAt: str


class ScannedPrescription(BaseModel):
    issuedDate: str | None = None
    documentDate: str | None = None
    prescriberName: str | None = None
    prescriberSpecialty: str | None = None
    clinicName: str | None = None
    prescriberPhone: str | None = None
    pharmacyName: str | None = None
    pharmacyPhone: str | None = None
    pharmacyBillDate: str | None = None
    billNumber: str | None = None
    directionsText: str | None = None
    durationDays: int | None = None
    refillsAuthorized: int | None = None
    confidence: float | None = None
    ocrText: str | None = None
    kind: Literal["prescription", "pharmacy_bill", "medicine_box", "discharge_summary", "other"] | None = None


class ScannedMedication(BaseModel):
    brandName: str
    genericName: str | None = None
    strength: str | None = None
    doseAmount: float | None = None
    doseUnit: str | None = None
    form: Literal["tablet", "capsule", "syrup", "injection", "drops", "inhaler", "patch"] | None = None
    foodRelation: Literal[
        "before_meal", "with_meal", "after_meal", "empty_stomach", "bedtime", "anytime"
    ] | None = None
    scheduleType: Literal["fixedTimes", "everyHours", "asNeeded"] | None = None
    times: list[str] = Field(default_factory=list)
    intervalHours: int | None = None
    durationDays: int | None = None
    quantityDispensed: float | None = None
    refillsAuthorized: int | None = None
    reason: str | None = None
    directionsRaw: str | None = None
    sourceDetail: str | None = None
    confidence: float | None = None


class ScanResponse(BaseModel):
    prescription: ScannedPrescription = Field(default_factory=ScannedPrescription)
    medications: list[ScannedMedication] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    model: str = ""
    sha256: str = ""


class ScanStatus(BaseModel):
    configured: bool
    model: str
