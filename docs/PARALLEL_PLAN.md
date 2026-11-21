# Parallel Execution Plan

Goal: six independent workstreams, one frozen contract, zero merge chaos.

## 1. Agent roster

| Agent | Owns (write access) | Branch | First deliverable | First gate |
|---|---|---|---|---|
| **Lead / Integrator** | `src/shared/`, `src/App.tsx`, `src/storage/`, `src/services/`, root deploy files | `agent/lead` | contract + demo state + deploy | live URL |
| **Engine** | `src/engine/**` | `agent/engine` | `scheduler.ts` + `safety.ts` + tests | `npm test` green |
| **UI-Core** | `components/{primitives,layout,onboarding,meds,today}`, `hooks/useMedications.ts`, `hooks/useToday.ts` | `agent/ui-core` | Today view from demo state | log a dose |
| **UI-Safety** | `components/{safety,adherence,caregiver,settings}`, `hooks/useSafety.ts`, `hooks/useAdherence.ts`, `hooks/usePreferences.ts` | `agent/ui-safety` | Safety panel + score | 3 findings render |
| **Data & QA** | `src/data/**`, `src/fixtures/**`, test fixtures, demo script | `agent/data-qa` | validated data packs + scenarios | schema test green |
| **Backend** | `backend/**` | `agent/backend` | health + sync + pytest | `pytest` green |
| **Platform** (may be Lead) | `Dockerfile`s, `render.yaml`, `docker-compose.yml`, `scripts/` | `agent/platform` | static deploy + API deploy | both URLs live |

If a domain has no dedicated human, the Lead absorbs it in this order: Platform → Backend → UI-Safety.

## 2. Git strategy

- `main` = always deployable, demo-ready.
- `integration` = merge target for agents.
- Each agent works on its own branch **or** its own worktree.

```powershell
# one-time
git checkout -b integration
git push -u origin integration

# per agent
git worktree add ..\meditrack-engine  -b agent/engine
git worktree add ..\meditrack-ui-core -b agent/ui-core
git worktree add ..\meditrack-ui-safety -b agent/ui-safety
git worktree add ..\meditrack-data-qa -b agent/data-qa
git worktree add ..\meditrack-backend -b agent/backend
```

Merge cadence: **every 45–60 minutes**, or immediately when a gate passes.
After each merge, redeploy. Never let `main` stay red for more than 10 minutes.

## 3. Handoffs (the only allowed coupling)

### Engine → UI

Only `src/engine/index.ts`:

```ts
resolveBrand(name: string): BrandEntry | null
expandGeneric(generic: string): string[]
generateDoses(meds, events, date, preferences): DoseInstance[]
analyzeRegimen(meds, profile): SafetyReport
summarizeAdherence(doses, events): AdherenceSummary
scoreFromFindings(findings): { score: number; band: SafetyBand }
```

UI never computes safety or status. If a value is missing, request it from the engine agent;
do not duplicate the logic in a component.

### Integration → UI

The integration layer supplies data + callbacks:

```ts
state: AppState
todayDoses: DoseInstance[]
safety: SafetyReport
adherence: AdherenceSummary
onLogDose(doseId, action, reason?): void
onUndo(): void
onLoadDemo(): void
onReset(): void
onSaveProfile(profile): void
```

### Data → Engine / UI

JSON shapes are fixed by `src/shared/contracts.ts` (`BrandBook`, `InteractionBook`,
`BeersBook`, `MissedDoseBook`). Content may grow; keys may not change.

### Backend ↔ Frontend

Only `docs/CONTRACTS.md`. The frontend never imports backend code.

## 4. What each agent builds first

### Engine (critical path)

1. `scheduler.ts` — fixed times first, then everyHours; event overlay; late/missed.
2. `safety.ts` — duplicates → interactions → Beers → score.
3. `adherence.ts` — totals, %, streak, most-missed.
4. Tests for every public function. Use fixtures, never `Date.now()` inside logic.

Acceptance: `analyzeRegimen(demoMedications, demoProfile)` returns:
duplicate paracetamol, major warfarin+aspirin, Beers alprazolam, score < 60.

### UI-Core

1. `TodayTimeline` + `NextDoseCard` with static `DoseInstance[]` fixture.
2. `DoseActions` + `UndoToast` wired to `onLogDose`.
3. `MedicationForm` + `BrandField` (duplicate hint while typing).
4. `Welcome` + demo load.

Acceptance: keyboard-only user can load demo → mark a dose taken → undo.

### UI-Safety

1. `SafetyPanel` + `ScoreGauge` + `FindingCard` from a `SafetyReport` fixture.
2. `AdherenceWeek` + `MostMissed`.
3. `CaregiverModal` (copy/WhatsApp/print) + `DoctorSummary`.
4. `PreferencesPanel` + `DataManagement`.

Acceptance: three seeded findings render in severity order, with sources and disclaimer,
at 200% zoom.

### Data & QA

1. Validate every JSON pack against its TypeScript shape (Vitest).
2. Build `fixtures/scenarios.ts` (5 scenarios).
3. Own the 3-minute demo script and the accessibility checklist.
4. Review all clinical copy for plain language and source attribution.

Acceptance: no unsourced clinical claim; every scenario has a deterministic expected report.

### Backend

1. Health endpoint + pytest.
2. Sync (idempotent) + fetch + export.
3. Dockerfile + Render service.
4. Keep it optional: no frontend call is allowed to block on it.

Acceptance: `pytest` green; `curl /api/health` returns ok; app works with backend stopped.

### Lead / Platform

1. Contract + demo state + deploy (T+0:30).
2. Wire storage + engine + UI (T+1:30).
3. Best-effort sync + offline indicator.
4. Final integration, accessibility pass, deploy, freeze.

## 5. Mocking rules (never wait)

| Consumer | Until ready | Then |
|---|---|---|
| UI-Core | static `DoseInstance[]` + `demoMedications` | `useToday` with engine |
| UI-Safety | `SafetyReport` fixture | `analyzeRegimen` |
| Backend | contract examples | real sync from `apiClient` |
| Integration | `createDemoState()` | localStorage load/save |

Mocks live in `src/fixtures/` and are owned by Data & QA. Do not put mocks in components.

## 6. Conflict protocol

1. **Write only inside your folder.** If you need a change elsewhere, request it.
2. **Shared files are read-only after T+30:** `contracts.ts`, `constants.ts`,
   `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vite.config.ts`, `App.tsx`.
3. A contract change requires: edit → doc update → backend schema update → announce →
   all agents re-run typecheck.
4. No new dependencies without Lead approval. (`react`, `react-dom`, `vite`, `vitest`,
   `tailwind` are enough.)
5. No repo-wide refactors, no formatting-only changes, no renaming shared types.
6. If two agents touch the same file, the owner implements; the other reviews.

## 7. Integration checkpoints

| Time | Checkpoint | Gate |
|---|---|---|
| T+0:30 | Contract frozen, scaffold builds, live URL | `npm run build` + URL 200 |
| T+1:30 | Vertical slice: demo → today → log → reload | manual + typecheck |
| T+2:30 | Safety engine + panel | 3 findings + tests |
| T+3:30 | Adherence + refill + caregiver/print | demo story complete |
| T+4:20 | Accessibility pass + backend health | keyboard/zoom + `pytest` |
| T+4:45 | Freeze | no code changes |
| T+5:00 | Submit | final URL checked on phone |

## 8. Definition of done (per domain)

- Typechecks with `strict`.
- Has at least one test or a documented manual check.
- Works at 320px width and 200% zoom.
- No console errors.
- No network call on the critical path.
- No clinical claim without a source and an action.
- The demo profile still works after the change.

## 9. Agent handoff template

When you finish a block, report:

```
Agent: <name>
Done: <files/features>
Contract changes: none | <details>
Checks: typecheck / test / build / pytest
Blocked by: none | <what + who>
Demo step: <how to verify in 10 seconds>
Next: <next task>
```

Keep it short. The Lead merges and redeploys.
