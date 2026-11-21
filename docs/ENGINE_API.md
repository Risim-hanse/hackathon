# Engine API — the med part, implemented

Owner: **Engine agent**. Pure TypeScript. No React, no DOM, no network, no storage.
UI agents import **only** from `frontend/src/engine/index.ts`.

Run: `cd frontend && npm run test` — 38 tests across scheduler, safety, adherence, refill, score.

---

## 1. Public functions

### `generateDoses(medications, events, date, preferences, now): DoseInstance[]`

Materialises one local calendar day.

- `date`: `YYYY-MM-DD`; `now`: explicit `Date` for deterministic tests.
- Only `status === 'active'` medications, inside `startDate`/`endDate` (inclusive).
- `fixedTimes` → one dose per `HH:mm`.
- `everyHours` → anchored at `startDate` (or `date`) + `times[0]` (default `08:00`), stepping by `intervalHours`.
- `asNeeded` → no scheduled doses (never counted in adherence or ceilings).
- Output is sorted by `scheduledFor`, deduplicated by dose id.

Also exported: `timesForDate`, `scheduledDosesPerDay`, `localDateFor`, `localTimeFor`,
`localInstant`, `parseHm`, `formatHm`, `doseStatusAt`.

### `analyzeRegimen(medications, profile, now): SafetyReport`

Deterministic safety pipeline over **active** medications:

1. Resolve identity: `activeIngredients` if present, else split `genericName` on `+`.
2. **Duplicate** — the same generic component in ≥2 medications.
3. **Ceiling** — scheduled daily mg per component vs `MAX_DAILY_MG`.
4. **Interaction** — curated pairs, expanded across combination products, never self-paired.
5. **Beers** — `profile.age >= rule.minAge` and a matching generic.
6. **Refill** — stock lasts ≤ `refillThresholdDays`.
7. **Unknown** — generics outside the curated set produce an `info` finding.
8. Score via `scoreFromFindings`; findings sorted major → info.

Every finding has `title`, `plainLanguage`, `action`, `relatedMedicationIds`, and (where
applicable) `mechanism` + `source`. The engine never claims a regimen is safe.

### `summarizeAdherence(doses, events): AdherenceSummary`

- Effective status = latest event per `doseId`; `snoozed`/`undone`/`edited` fall back to the
  scheduler-derived status.
- Excludes `scheduled` (future/not yet due).
- `totalDoses = taken + late + skipped + missed`.
- `adherencePercent = round((taken + late) / totalDoses * 100)` — late counts as taken.
- `streakDays` = consecutive days (walking back from the most recent completed day) with zero missed.
- `mostMissedSlot` = local `HH:mm` bucket with the most missed doses.

### `daysOfStockLeft(medication): number | null`

```
dosesPerDay = fixedTimes ? times.length : floor(24 / intervalHours)
dailyUnits  = dosesPerDay * doseAmount
daysLeft    = floor(currentCount / dailyUnits)
```

`null` for `asNeeded`, missing inventory, or zero daily use. Clamped at 0.

### `resolveBrand(name)` / `expandGeneric(generic)` / `scoreFromFindings(findings)`

- Brand map: `Crocin`, `Dolo 650` → `paracetamol`; `Combiflam` → `ibuprofen + paracetamol`.
- Unknown brand → `null`; callers must show an “unknown, check with pharmacist” state.
- Score weights: duplicate −20, major −35, moderate −15, minor −5, Beers −10 (see `shared/constants.ts`).

---

## 2. Status derivation

| Condition | Status |
|---|---|
| `now < scheduledFor` | `scheduled` |
| `now - scheduledFor < lateGraceMinutes` | `scheduled` (UI may label “due”) |
| `>= lateGraceMinutes` and `< missedGraceMinutes` | `late` |
| `>= missedGraceMinutes`, no event | `missed` |
| Latest event `taken` within grace | `taken` |
| Latest event `taken` after grace | `late` |
| Latest event `skipped` / `missed` / `late` | matching status |
| Latest event `snoozed` / `undone` / `edited` | clock-derived |

The event log is append-only. Undo appends `undone`; it never deletes the original row.

---

## 3. IDs and time

```
doseId = `${medicationId}_${YYYY-MM-DD}_${HH:mm}`
// med-dolo_2026-11-21_08:00
```

- Wall-clock schedule times are local `HH:mm` (24h).
- `scheduledFor`, `actionAt`, `checkedAt` are ISO 8601 instants.
- Calendar grouping uses the **local** date of `scheduledFor`.

---

## 4. Demo expectations (Meera, 68)

`analyzeRegimen(demoMedications, demoProfile, now)` returns:

| Finding | Severity | Why |
|---|---|---|
| Two medicines contain paracetamol | moderate (duplicate) | Dolo 650 + Crocin 500 |
| Warfarin + Aspirin | major | Warf 2mg + Ecosprin 75 |
| Benzodiazepine in an older adult | major (Beers) | Alprax 0.25mg, age 68 |
| Dolo 650 is running low | minor (refill) | 4 tablets at 1/day |
| Score | **30 / 100** | high risk |

`generateDoses(demoMedications, createDemoEvents(now), today, demoProfile.preferences, now)`
returns five doses: 08:00 Dolo, 13:00 Ecosprin, 14:00 Crocin, 20:00 Warf, 21:00 Alprax.

---

## 5. Contracts with UI

```ts
// Today view
const doses = generateDoses(state.medications, state.events, today, state.profile.preferences, new Date())

// Safety panel
const report = analyzeRegimen(state.medications, state.profile, new Date())

// Adherence (pass 7 days of generated doses)
const summary = summarizeAdherence(dosesForSevenDays, state.events)

// Refill badge
const daysLeft = daysOfStockLeft(medication) // null => hide
```

Rules for UI agents:

- Never re-implement status, safety, or adherence maths in a component.
- Never import engine internals; use `engine/index.ts`.
- If a value is missing, request a contract/engine change — do not invent a shape.
- `activeIngredients[].mgPerUnit` is the only source of truth for mg math; `strength` is display-only.

---

## 6. Testing contract

| File | Covers |
|---|---|
| `__tests__/scheduler.test.ts` | fixed/interval/PRN, date range, status windows, skip/undo |
| `__tests__/safety.test.ts` | demo findings, ceiling, combinations, Beers age gate, unknown |
| `__tests__/adherence.test.ts` | counts, %, streak, most-missed, event overlay, undo |
| `__tests__/refill.test.ts` | days left, dose amount, interval, null cases, clamp |
| `__tests__/smoke.test.ts` | brand resolver + score bands |

A change to the engine is done only when `npm run typecheck`, `npm run test`, and
`npm run build` are green.
