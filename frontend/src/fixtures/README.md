# Fixtures

Owner: **Data & QA agent**.

- `scenarios.ts` — named end-to-end scenarios used by tests and the demo:
  - `duplicateParacetamol` (Crocin + Dolo)
  - `majorBleedRisk` (Warfarin + Ecosprin)
  - `beersElderly` (age 68 + Alprax)
  - `missedDose` (warfarin missed yesterday)
  - `cleanRegimen` (one med, no findings)
- Each scenario exports a complete `AppState` so tests never depend on `Date.now()`.
- Keep the demo profile separate from test fixtures.
