# Shared contract (FROZEN)

Owner: **Lead / Integrator**.

- `contracts.ts` is the single source of truth for domain shapes.
- `constants.ts` holds only cross-cutting constants (grace periods, weights, disclaimer).
- After the first 30 minutes, treat both files as **read-only**. A change requires:
  1. Edit `contracts.ts`.
  2. Update `docs/CONTRACTS.md`.
  3. Post the diff in the integration channel and ping every agent.
- UI-only types belong in the component folder that owns them, not here.
- The backend mirrors these shapes in `backend/app/schemas.py`; keep them in sync.
