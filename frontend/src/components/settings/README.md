# Settings domain

Owner: **UI-Safety**.

Files:
- `PreferencesPanel.tsx` — large text, high contrast, grace minutes, notifications.
- `DataManagement.tsx` — export JSON, import JSON, delete all (typed confirmation).
- `About.tsx` — sources, disclaimer, “not a medical device”.

Rules:
- Preferences persist through the integration layer, not directly.
- Destructive actions require explicit confirmation.
- Import validates `AppState.version` before replacing anything.
