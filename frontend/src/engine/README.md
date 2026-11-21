# Engine domain

Owner: **Engine agent**. Pure TypeScript only — no React, no DOM, no network, no `localStorage`.

Public API: `engine/index.ts` (the only import surface for UI agents).

| Module | Responsibility |
|---|---|
| `scheduler.ts` | materialise doses for a day, derive late/missed (implemented) |
| `brands.ts` | brand → generic resolution (implemented) |
| `safety.ts` | duplicates, ceiling, interactions, Beers, refill, unknown (implemented) |
| `score.ts` | 0-100 heuristic + bands (implemented) |
| `adherence.ts` | 7-day %, streaks, most-missed slot (implemented) |
| `refill.ts` | days of stock left (implemented) |

See `docs/ENGINE_API.md` for the full semantics and worked examples.

Non-negotiables:
- Deterministic: no `Date.now()` inside pure logic; take `now`/`date` as arguments.
- Never say "safe". Use "no known interaction in our curated list".
- Every finding has a human-readable explanation, an action, and a source.
- Ceiling math uses `activeIngredients[].mgPerUnit`; `strength` is display-only.
- `adherencePercent = (taken + late) / total`; late counts as taken but is reported separately.
- Add tests under `__tests__/` for every public function.

## Signatures (frozen for UI agents)

```ts
generateDoses(medications, events, date, preferences, now): DoseInstance[]
analyzeRegimen(medications, profile, now): SafetyReport
summarizeAdherence(doses, events): AdherenceSummary
daysOfStockLeft(medication): number | null
```
