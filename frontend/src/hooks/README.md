# Hooks domain

Owner: **Integration/Lead** (wiring) + the UI agent named below (behaviour).

| Hook | Owner | Contract |
|---|---|---|
| `useMedications` | UI-Core | add/edit/stop, returns `Medication[]`, never touches storage |
| `useToday` | UI-Core | `DoseInstance[]` for a date + `logDose(doseId, action, reason?)` |
| `useSafety` | UI-Safety | `SafetyReport` from `analyzeRegimen(meds, profile)` |
| `useAdherence` | UI-Safety | `AdherenceSummary` from `summarizeAdherence(doses, events)` |
| `usePreferences` | UI-Safety | profile preferences + setters |

Rules:
- Hooks may call the engine and receive data via props/context; only the integration layer
  (`App.tsx` + `storage/localStore.ts` + `services/apiClient.ts`) may persist or sync.
- Keep hooks pure and synchronous where possible; effects only at the integration boundary.
