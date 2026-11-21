# Project TODOs — MediTrack SafetyNet

## Architecture stance (locked)

- **Frontend is the product and the source of truth.** Local-first, works offline, deterministic.
- **Backend is optional persistence/audit.** It must never sit on the critical path. If the backend is down, the demo still works.
- **The domain engine lives in the frontend** (scheduler, safety, adherence). Reason: instant feedback, offline, no cold-start risk, no API failure during judging.
- **Backend owns only:** durable backup/sync, append-only event mirror, export, and optional share snapshots.
- **Contract-first:** define TypeScript types + sample JSON before writing UI or API code.
- **Ship a deployable slice every 60–90 minutes.**

### The boundary, explicitly

| Concern | Frontend (React/TS) | Backend (FastAPI/SQLite) |
|---|---|---|
| Scheduling & dose generation | ✅ owns | ❌ never computes |
| Safety engine (duplicates, interactions, Beers, score) | ✅ owns | ❌ never computes |
| Adherence calculations | ✅ computes for UI | ✅ mirrors for export/analytics |
| Primary persistence | ✅ localStorage/IndexedDB | ⬜ optional mirror |
| Append-only event log | ✅ local log | ✅ durable copy + idempotency |
| Caregiver summary / WhatsApp / print | ✅ generates | ⬜ optional short share token |
| Accounts/auth | ❌ none in v1 | ❌ none in v1 |
| Drug data packs | ✅ bundled JSON | ⬜ optional versioning endpoint |
| Health check / deploy proof | — | ✅ `/api/health` |

**Rule of thumb:** if the UI needs it in under 50ms, it belongs in the frontend. If it needs to survive a cleared browser or move across devices, it belongs in the backend.

---

## Shared / Foundation

- [ ] **S1 [P0]** Freeze the contract: `types.ts` + sample JSON for `Profile`, `Medication`, `DoseEvent`, `SafetyFinding`. *(30m)*
- [ ] **S2 [P0]** Seed demo profile: **Meera, 68** — Dolo 650, Crocin 500, Ecosprin 75, Warf 2mg, Alprax 0.25mg. *(20m)*
- [ ] **S3 [P0]** Data packs skeleton: `brands.json`, `interactions.json`, `beers.json`, `missedDose.json`. *(45m, parallel)*
- [ ] **S4 [P0]** Repo scaffold: Vite + React + TS + Tailwind; `Dockerfile`; deploy "hello world". *(20m)*
- [ ] **S5 [P0]** Design tokens: font scale (18/24px), contrast pairs, spacing, status colors (text + icon). *(15m)*
- [ ] **S6 [P0]** Codify decisions: late = 2h, missed = 4h; local-only default. *(10m)*

---

## Frontend — screens & UI

- [ ] **F1 [P0]** App shell: header (logo, text-size, contrast, read-aloud, caregiver), main, skip-link, footer disclaimer. *(30m)*
- [ ] **F2 [P0]** Welcome/onboarding: "Load demo (Meera)" / "Start blank"; reset demo. *(20m)*
- [ ] **F3 [P0]** Medication form: add/edit/stop; brand field with autocomplete; generic auto-resolve; validation. *(45m)*
- [ ] **F4 [P0]** Schedule builder: fixed times, every-N-hours, as-needed (PRN); food relation; start/end. *(30m)*
- [ ] **F5 [P0]** Today view: next-dose hero card + chronological timeline + empty state. *(40m)*
- [ ] **F6 [P0]** Dose actions: Taken / Late / Skip (reason) / Snooze (15/30/60); undo toast. *(40m)*
- [ ] **F7 [P0]** Local persistence: localStorage schema + version + "last saved". *(20m)*
- [ ] **F8 [P0]** Safety panel: score gauge + finding cards (title, plain language, mechanism, action, source); collapse/expand. *(45m)*
- [ ] **F9 [P0]** Duplicate + daily-ceiling UI: "Crocin + Dolo = same drug"; total mg vs max. *(30m)*
- [ ] **F10 [P0]** Interaction + Beers UI with severity tiers and "ask pharmacist" line. *(30m)*
- [ ] **F11 [P1]** Adherence screen: 7-day %, streak, per-med breakdown, "most missed slot". *(40m)*
- [ ] **F12 [P1]** Refill/inventory: "4 days left" + refill threshold. *(25m)*
- [ ] **F13 [P1]** Missed-dose triage card + rescue guidance by drug class + `tel:` caregiver. *(30m)*
- [ ] **F14 [P1]** Caregiver modal: copy summary, WhatsApp `wa.me`, print. *(35m)*
- [ ] **F15 [P1]** Doctor summary: print stylesheet, one page. *(30m)*
- [ ] **F16 [P1]** Settings: text size, contrast, grace periods, export/import JSON, delete all. *(35m)*
- [ ] **F17 [P1]** Read-aloud + notification permission + in-app fallback banner. *(25m)*
- [ ] **F18 [P1]** Accessibility pass: keyboard, focus, ARIA live regions, 200% zoom, reduced motion. *(40m)*
- [ ] **F19 [P2]** PWA manifest + service worker (offline cache). *(20m)*
- [ ] **F20 [P2]** Voice input for adding meds. *(30m)*
- [ ] **F21 [P2]** Multi-profile, QR emergency card, local-language labels. *(60m)*
- [ ] **F22 [P1]** Empty/error/loading states + "backend offline" indicator. *(20m)*

---

## Frontend — client engine (pure TS, unit-tested)

- [x] **E1 [P0]** `scheduler.ts`: materialize today's doses, fixed/interval/PRN, grace → late/missed. *(45m)* — done, 9 tests
- [x] **E2 [P0]** `brands.ts`: resolve brand → generic, fuzzy match, show unknown state. *(20m)* — done (exact map; unknown fails safe)
- [x] **E3 [P0]** `safety.ts`: duplicate generics, daily ceiling, interactions, Beers, severity. *(60m)* — done, 11 tests
- [x] **E4 [P0]** `score.ts`: 0–100 formula + bands + reasons. *(20m)* — done
- [x] **E5 [P1]** `adherence.ts`: 7-day %, streaks, most-missed bucket. *(30m)* — done, 6 tests
- [x] **E6 [P1]** `storage.ts`: load/save/migrate/export/import/reset. *(25m)* — load/save/clear done; export/import UI pending
- [ ] **E7 [P1]** `share.ts`: WhatsApp text, print payload, copy. *(15m)*
- [ ] **E8 [P1]** `speech.ts`: read schedule. *(10m)*
- [x] **E9 [P0]** `vitest` suite: 15+ cases across scheduler/safety/score. *(30m)* — 38 tests green
- [x] **E10 [P1]** `refill.ts`: doses/day → days of stock left. *(10m)* — done, 5 tests

---

## Backend — optional, non-blocking (FastAPI + SQLite)

Build this **in parallel from hour 0** if you want it. It must not block frontend work.

- [x] **B1 [P1]** FastAPI skeleton + `/api/health` + Dockerfile. *(20m)* — done
- [x] **B2 [P1]** SQLite schema: `profiles`, `medications`, `dose_events`, `share_tokens`. *(20m)* — profiles + dose_events done; medications/share_tokens not needed
- [x] **B3 [P1]** `POST/GET /api/profiles/{id}` (device-scoped UUID, no auth in v1). *(30m)* — sync + fetch done
- [x] **B4 [P1]** `POST /api/events` append-only + idempotency key. *(30m)* — folded into `/sync`, `INSERT OR IGNORE`
- [ ] **B5 [P1]** `GET /api/profiles/{id}/export` (JSON/CSV). *(20m)*
- [ ] **B6 [P2]** `GET /api/profiles/{id}/adherence?days=7` (SQL aggregate). *(25m)*
- [ ] **B7 [P1]** Pydantic validation, CORS, error handling. *(20m)*
- [ ] **B8 [P1]** Frontend sync client: best-effort queue, retry, never blocks UI. *(35m)*
- [ ] **B9 [P2]** `POST /api/share` read-only snapshot token with TTL. *(30m)*
- [ ] **B10 [P1]** `pytest` for health + profile round-trip. *(20m)*
- [ ] **B11 [P1]** Render deploy + health check + logs. *(20m)*

> **Render gotchas:** free web services spin down (~30–60s cold start) and the filesystem is ephemeral. Therefore: (a) deploy the **frontend as a static site** so the demo URL is always instant; (b) treat SQLite as a mirror, not the source of truth; (c) keep the app fully functional with the backend asleep.

---

## QA / Demo / Delivery

- [ ] **D1 [P0]** Demo fixtures: 4 scenarios (duplicate, major interaction, Beers, missed dose). *(20m)*
- [ ] **D2 [P1]** Playwright smoke: load → demo profile → mark taken → reload. *(20m)*
- [ ] **D3 [P0]** 3-minute demo script + rehearsal. *(20m)*
- [ ] **D4 [P0]** Accessibility spot-check: keyboard-only, 200% zoom, screen reader labels. *(15m)*
- [ ] **D5 [P0]** Final deploy, mobile link check, freeze. *(15m)*

---

## What to build first (strict order)

1. **S1 + S2** — the contract and the seed profile. This unblocks everything and prevents rework.
2. **S4** — scaffold + deploy a live hello-world. Never demo without a URL.
3. **F5 + F6 + F7** — the vertical slice: *see today's doses → mark taken → reload persists.* This validates the whole data model.
4. **E1 + E2** — scheduler and brand resolution.
5. **E3 + E4** — safety engine and score.
6. **F8 + F9 + F10** — the safety panel. This is the "we win" moment.
7. Then F11–F15 (adherence, refills, caregiver), then the accessibility pass, then backend.

**If you only get three things done:** seed profile + today view + duplicate warning.

---

## Definition of Done per phase

| Phase | Gate |
|---|---|
| P0 Contract & deploy | Live URL; types compile; demo profile loads |
| P1 Vertical slice | Add med → today view → mark taken → reload keeps it |
| P2 Safety | Crocin+Dolo, Warfarin+Ecosprin, Beers all fire with reasons |
| P3 Tracking | 7-day adherence + refill countdown visible |
| P4 Caregiver | WhatsApp/print summary works on a phone |
| P5 Accessibility | Keyboard-only + 200% zoom + live regions pass |
| P6 Backend | `/api/health` up; profile round-trip; UI works with backend down |
| P7 Demo | Rehearsed twice; frozen; final deploy |
