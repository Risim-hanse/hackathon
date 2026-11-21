# Architecture

## Goal

A medication safety net for elderly users and their caregivers that is **fast, local-first,
accessible, and demo-safe**. The engine is the product; the UI is one screen; the backend is
an optional mirror.

## Why this shape

1. **The risky work is domain logic, not UI.** Scheduling, duplicates, interactions, Beers,
   adherence. Keep it pure and unit-tested.
2. **The demo must survive bad Wi-Fi.** All clinical checks run in the browser. No API key,
   no cold start, no network on the critical path.
3. **Parallel work needs hard boundaries.** Frozen contracts + folder ownership + one public
   engine API means six agents can build without merge pain.
4. **Privacy is a feature.** Health data stays in the browser unless the user explicitly shares.
5. **The backend is a rubric/persistence layer, not a dependency.** If it is down, every screen
   still works.

## System context

```
┌──────────────────────────── Browser (React SPA) ────────────────────────────┐
│                                                                             │
│  components/ ──► hooks/ ──► engine/ (pure TS) ──► data/*.json                │
│       │                        │                                            │
│       │                        └── scheduler, safety, score, adherence      │
│       │                                                                     │
│  integration (App.tsx) ──► storage/localStore (source of truth)             │
│       │                                                                     │
│       └──► services/apiClient ── best-effort, never blocks ──┐              │
└───────────────────────────────────────────────────────────────┼─────────────┘
                                                                │ HTTPS
                                                   ┌────────────▼────────────┐
                                                   │ FastAPI + SQLite mirror │
                                                   │ (optional, ephemeral)   │
                                                   └─────────────────────────┘
```

## Dependency rule (one direction only)

```
shared/  ◄──  data/  ◄──  engine/  ◄──  hooks/  ◄──  components/
   ▲                                                    ▲
   └──────────── integration (App, storage, services) ──┘
```

| Layer | Path | May import | Must not import |
|---|---|---|---|
| L0 Contract | `src/shared/` | nothing | everything else |
| L1 Data | `src/data/` | `shared` | engine, UI, storage, services |
| L2 Engine | `src/engine/` | `shared`, `data` | React, DOM, storage, services, UI |
| L3 Hooks | `src/hooks/` | `shared`, `engine` | storage, services, components |
| L4 UI | `src/components/` | `shared`, `engine`, `data`, `hooks`, primitives | storage, services, other domains' internals |
| L5 Integration | `App.tsx`, `storage/`, `services/` | everything | — |

**No reverse imports. No cross-domain imports. No exceptions.**

## Domain ownership

| Domain | Path | Owner | Deliverable |
|---|---|---|---|
| Contract | `src/shared/` | Lead | frozen types, constants |
| Data | `src/data/`, `src/fixtures/` | Data & QA | brand map, interaction/Beers packs, demo profile, fixtures |
| Engine | `src/engine/` | Engine | scheduler, safety, score, adherence + tests |
| Core UI | `components/{primitives,layout,onboarding,meds,today}` | UI-Core | shell, onboarding, med form, today view |
| Safety UI | `components/{safety,adherence,caregiver,settings}` | UI-Safety | safety panel, adherence, caregiver/print, settings |
| Integration | `App.tsx`, `storage/`, `services/` | Lead | wiring, persistence, best-effort sync |
| Backend | `backend/` | Backend | health, sync, fetch, export |
| Platform | Dockerfiles, `render.yaml`, `scripts/` | Platform/Lead | deploy, checks, smoke |

## Runtime data flow

### Boot
1. `App.tsx` calls `loadState()`.
2. If empty, it calls `createDemoState()` (or shows onboarding).
3. Engine computes: `generateDoses(...)`, `analyzeRegimen(...)`, `summarizeAdherence(...)`.
4. UI renders Today view + Safety panel.

### Log a dose
1. `DoseActions` calls `useToday().logDose(doseId, 'taken')`.
2. Integration appends a `DoseEvent` (never mutates or deletes prior events).
3. Engine recomputes statuses/adherence.
4. `saveState()` writes to localStorage.
5. `syncState()` fires and is ignored on failure.
6. Undo appends a compensating `undone` event; it does not delete the original.

### Sync (optional)
- `POST /api/profiles/{id}/sync` upserts the profile and inserts events with
  `INSERT OR IGNORE` (idempotent by event id).
- The backend never computes safety or doses.
- The UI never waits for the backend.

## Backend scope

In scope:
- `/api/health` (deploy proof)
- profile upsert + fetch
- append-only event mirror
- JSON export

Out of scope:
- scheduling, safety, adherence calculations
- auth/accounts
- file uploads, OCR, LLM calls
- real-time collaboration

## Deployment topology

- **Frontend:** static site (Render static / CDN / Nginx Docker). Instant, no spin-down.
- **Backend:** Docker web service on Render. Optional; may cold-start.
- **Local:** `docker compose up --build` (web :8080, api :8000).

## Invariants

1. One dose, one current state; history is append-only.
2. The app never silently marks a dose taken.
3. Every action is undoable.
4. Status is text + icon, never colour alone.
5. The core loop works offline with no account.
6. Every safety finding has explanation + action + source; unknown fails safe.
7. The primary screen has one primary action.
8. Health data stays local unless the user explicitly shares/exports it.
9. No network call is required for the demo.
10. No domain shape is invented outside `shared/contracts.ts`.

## Testing strategy

| Layer | Tool | What |
|---|---|---|
| Engine | Vitest | scheduler, duplicates, interactions, Beers, score, adherence |
| Backend | Pytest | health, sync idempotency, fetch, export |
| UI | Manual + Playwright smoke | load demo → log dose → reload → persists |
| Accessibility | Manual checklist | keyboard, 200% zoom, screen reader, contrast |
| Deploy | `curl /api/health` + browser | both services reachable |

## Anti-goals

No router, no global state library, no ORM, no auth, no SSR, no ML, no OCR, no live drug API,
no third-party analytics, no cloud dependency for the primary flow.
