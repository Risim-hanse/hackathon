# Component domains

Three parallel UI agents work here. **Stay inside your folder.**

| Folder | Owner | Responsibility |
|---|---|---|
| `primitives/` | UI-Core | Button, Card, Badge, Toggle, LiveRegion, Modal shell |
| `layout/` | UI-Core | AppShell, Header, SkipLink, footer disclaimer |
| `onboarding/` | UI-Core | Welcome screen, “Load demo (Meera)”, reset |
| `meds/` | UI-Core | Medication form, brand field, schedule builder |
| `today/` | UI-Core | Next-dose hero, timeline, dose actions, undo toast |
| `safety/` | UI-Safety | Score gauge, finding cards, explanations, sources |
| `adherence/` | UI-Safety | 7-day %, streak, per-med breakdown, most-missed |
| `caregiver/` | UI-Safety | WhatsApp/copy/print summary, doctor print |
| `settings/` | UI-Safety | Text size, contrast, grace periods, export/delete |

## Import rules

- ✅ May import: `shared/contracts`, `shared/constants`, `engine` (via `engine/index.ts`), `data/*`, `hooks/*`, and `primitives`/`layout`.
- ❌ May **not** import: `storage/*`, `services/*`, or another UI domain's internals.
- ❌ May **not** edit `shared/`, `engine/`, `storage/`, `services/`, or `App.tsx`.
- Every component takes typed props from `shared/contracts`; no ad-hoc domain shapes.
- All interactive elements: ≥48px, keyboard reachable, visible focus, text + icon for status.
