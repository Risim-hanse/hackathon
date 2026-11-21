"""
Pydantic mirrors of `frontend/src/shared/contracts.ts`.

The frontend contract is the source of truth. The backend validates the envelope
and stores the payloads; it never recomputes scheduling or safety logic.
"""

from typing import Any

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


class SyncResponse(BaseModel):
    ok: bool
    syncedAt: str
