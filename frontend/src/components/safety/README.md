# Safety domain

Owner: **UI-Safety**.

Files:
- `SafetyPanel.tsx` — score + findings, collapsed by default on mobile.
- `ScoreGauge.tsx` — 0-100 + band label (text, not colour alone).
- `FindingCard.tsx` — severity, title, plain language, action, source, disclaimer link.

Rules:
- Never render “You are safe.” Render “No known issues in our curated list.”
- Major findings are visually first; the panel still fits one screen.
- Every card has an action and (where applicable) a source.
- `+` and `-` expand details; mechanism is behind a disclosure.
