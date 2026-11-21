# Adherence domain

Owner: **UI-Safety**.

Files:
- `AdherenceWeek.tsx` — 7-day strip; each day shows taken/late/missed as icon + text.
- `StreakCard.tsx` — current streak, best streak.
- `MostMissed.tsx` — “Most missed: 20:00 (4 times)”.
- `PerMedBreakdown.tsx` — per medication adherence.

Use `AdherenceSummary` only. No raw event math in components.
Acceptance: readable at 200% zoom; no colour-only encoding.
