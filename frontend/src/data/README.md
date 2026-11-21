# Data domain

Owner: **Data & QA agent**.

Files:
- `brands.json` — Indian brand → generic + drug class. Lowercase keys.
- `interactions.json` — curated high-confidence pairs, severity, mechanism, action, source.
- `beers.json` — curated AGS Beers Criteria subset for age ≥65.
- `missedDose.json` — general rescue guidance by drug class.
- `demoProfile.ts` — **Meera, 68** and a deterministic 7-day event history.

Rules:
- Every clinical claim needs `source`. Keep the subset small and defensible.
- Never claim completeness. The UI must show: “not a complete check; confirm with your pharmacist.”
- `generic` may be a combination separated by ` + ` (e.g. `ibuprofen + paracetamol`).
- `activeIngredients` on a Medication carries per-unit mg; the brand map only resolves identity.
- Do not edit `demoProfile.ts` after the UI agents start relying on the IDs; add new fixtures instead.
