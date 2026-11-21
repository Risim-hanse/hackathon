# Contracts

The contract is the seam that lets frontend, engine, data, and backend agents work in parallel.

## Source of truth

| Artifact | File | Owner | Status |
|---|---|---|---|
| Domain types | `frontend/src/shared/contracts.ts` | Lead | **FROZEN after T+30** |
| Constants | `frontend/src/shared/constants.ts` | Lead | frozen |
| Data packs | `frontend/src/data/*.json` | Data & QA | schema frozen, content may grow |
| Backend mirror | `backend/app/schemas.py` | Backend | mirrors the contract |
| This document | `docs/CONTRACTS.md` | Lead | updated with any change |

## Type summary

```ts
ActiveIngredient { generic, mgPerUnit, drugClass? }

Medication {
  id, brandName, genericName, form, strength,
  activeIngredients?: ActiveIngredient[],
  doseAmount, doseUnit, foodRelation,
  schedule: { type: 'fixedTimes'|'everyHours'|'asNeeded', times: string[], intervalHours?: number },
  status: 'active'|'paused'|'stopped',
  prescriberName?, reason?, notes?, startDate?, endDate?, inventory?, drugClass?,
  prescriptionId?, directionsRaw?, durationDays?, quantityDispensed?,
  refillsAuthorized?, route?, sourceDetail?, confidence?, verification?
}

DocumentProvenance {
  imageRef, fileName, mimeType, sha256, scannedAt,
  kind: 'prescription'|'pharmacy_bill'|'medicine_box'|'discharge_summary'|'other',
  capturedAt?, ocrText?, thumbnailDataUrl?
}

Prescription {
  id, status: 'draft'|'active'|'archived', source: DocumentProvenance,
  issuedDate?, documentDate?, prescriberName?, prescriberSpecialty?, clinicName?,
  prescriberPhone?, pharmacyName?, pharmacyPhone?, pharmacyBillDate?, billNumber?,
  directionsText?, durationDays?, refillsAuthorized?, confidence?, notes?, createdAt
}

DoseEvent {
  id, doseId, medicationId, scheduledFor, actionAt,
  action: 'taken'|'late'|'skipped'|'missed'|'snoozed'|'undone'|'edited',
  skipReason?, notes?
}

DoseInstance { id, medicationId, scheduledFor, status }

SafetyFinding {
  id, category: 'duplicate'|'ceiling'|'interaction'|'beers'|'missed_dose'|'refill',
  severity: 'major'|'moderate'|'minor'|'info',
  title, plainLanguage, mechanism?, action, source?, relatedMedicationIds
}

SafetyReport { score: 0-100, band: 'safe'|'review'|'high_risk', findings, checkedAt }
AdherenceSummary { totalDoses, taken, late, skipped, missed, adherencePercent, streakDays, mostMissedSlot? }
Profile { id, name, age?, caregiverName?, caregiverPhone?, pharmacistPhone?, preferences }
AppState { profile, medications, prescriptions, events, isDemo?, onboardingCompleted?, version, updatedAt }
ScannedPrescription { issuedDate?, documentDate?, prescriberName?, pharmacyName?, ... confidence?, ocrText?, kind? }
ScannedMedication { brandName, genericName?, strength?, doseAmount?, times?, scheduleType?, ... }
ScanResponse { prescription, medications, warnings, model, sha256 }
```

## API contract

Base URL: `VITE_API_BASE_URL` (empty in local dev; Vite proxies `/api` to `:8000`).

### `GET /api/health`

```json
{ "data": { "ok": true, "service": "meditrack-api", "version": "0.2.0", "geminiConfigured": false } }
```

### `GET /api/scan/status`

```json
{ "data": { "configured": true, "model": "gemini-2.5-flash" } }
```

### `POST /api/scan` (multipart/form-data)

Request: `file` (image), optional `hints` (text), max 10 MB, PNG/JPEG/WEBP.

Response:

```json
{
  "data": {
    "prescription": {
      "issuedDate": "2026-11-20",
      "prescriberName": "Dr Rao",
      "pharmacyName": "City Pharmacy",
      "confidence": 0.92,
      "kind": "prescription",
      "ocrText": "…"
    },
    "medications": [
      { "brandName": "Dolo 650", "strength": "650mg", "times": ["08:00"], "scheduleType": "fixedTimes" }
    ],
    "warnings": ["No prescription date was found. Add it before saving."],
    "model": "gemini-2.5-flash",
    "sha256": "…"
  }
}
```

Semantics:
- Requires `GEMINI_API_KEY` on the API service; otherwise `503`.
- The model returns a **draft only**. The user confirms/edits every field before it
  becomes a `Medication` / `Prescription` in local state.
- The image is uploaded to the API for reading, then stored **only in IndexedDB**
  on the device (`imageRef`). It is never served from a public URL.
- `sha256` de-duplicates repeat scans of the same file.

### `POST /api/profiles/{profileId}/sync`

Request:

```json
{
  "profile": { "id": "demo-meera", "name": "Meera", "age": 68, "preferences": { "...": "..." } },
  "medications": [{ "id": "med-dolo", "brandName": "Dolo 650", "...": "..." }],
  "prescriptions": [{ "id": "rx-1", "source": { "...": "..." }, "...": "..." }],
  "events": [{ "id": "evt-1", "doseId": "med-dolo_2026-11-21_08:00", "...": "..." }]
}
```

Response:

```json
{ "data": { "ok": true, "syncedAt": "2026-11-21T10:00:00+00:00" } }
```

Semantics:
- Profile: last-write-wins upsert.
- Events: append-only, idempotent by `id`.
- Never deletes. A correction is a new `undone`/`edited` event.
- If the backend is down: `apiClient` returns `null`; the UI continues.

### `GET /api/profiles/{profileId}`

```json
{ "data": { "profile": { "...": "..." }, "events": [{ "...": "..." }] } }
```

### `GET /api/profiles/{profileId}/export`

```json
{ "data": { "exportedAt": "...", "profile": { "...": "..." }, "events": [{ "...": "..." }] } }
```

## Conventions

- Storage version is `2`. v1 states are migrated on load by adding `prescriptions: []`.
- First run uses `createEmptyState()` and shows onboarding; `onboardingCompleted` is set once a
  path is chosen. `isDemo` is true only for the seeded sample profile and clears on user edits.
- Document images live in IndexedDB via `storage/imageStore.ts`; only `imageRef` and a
  small `thumbnailDataUrl` are stored in `AppState`.
- `issuedDate` = date written on the prescription; `documentDate` = printed document/bill
  date; `pharmacyBillDate` = bill date. Keep them distinct.
- A scanned medicine starts as `verification: 'draft'` and becomes `'confirmed'` when the
  user saves it from the review screen.
- Timestamps: ISO 8601 UTC (`2026-11-21T10:00:00.000Z`).
- `strength` is display-only (`"650mg"`). `activeIngredients` is the source of truth for mg math.
- `mgPerUnit` is mg per tablet / capsule / ml. Combination products use multiple entries.
- If `activeIngredients` is missing, the engine may parse a single `strength` like `650mg`;
  otherwise it skips the ceiling check with an info finding (never a “safe” claim).
- Local calendar dates: `YYYY-MM-DD`.
- Wall-clock times: `HH:mm` (24h).
- Dose id: `${medicationId}_${YYYY-MM-DD}_${HH:mm}`.
- Generic names: lowercase, combinations separated by ` + `.
- Errors: HTTP status + `{ "detail": "..." }`; success envelopes always `{ "data": ... }`.

## Change process

1. Stop. Announce the proposed change.
2. Edit `contracts.ts`.
3. Update `docs/CONTRACTS.md` and `backend/app/schemas.py`.
4. Update fixtures and tests.
5. Re-run `npm run typecheck`, `npm test`, `pytest`.
6. Merge only with the lead's approval.

**Never** add a UI-only field to a domain type. **Never** change a field name silently.
