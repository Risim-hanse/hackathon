# Today domain

Owner: **UI-Core**.

Files to build:
- `NextDoseCard.tsx` — one primary action (“Taken”), time, med name, food instruction.
- `DoseTimeline.tsx` — chronological list with status icon + text; past/future split.
- `DoseActions.tsx` — Taken / Snooze (15/30/60) / Skip (reason sheet).
- `UndoToast.tsx` — 5s undo, `role="status"`.

Props come from `DoseInstance` (shared contract) + callbacks. Do not compute status here —
the engine returns it. Empty state: “No doses left today.”

Acceptance: keyboard-only logging, 48px targets, “Taken” is 56px, undo restores.
