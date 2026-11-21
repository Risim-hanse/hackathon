# Services domain

Owner: **Integration/Lead**.

- `apiClient.ts` is the only place that calls `fetch`.
- Backend is optional. Every call returns `null` on failure; never throw into the UI.
- No secrets, no API keys, no third-party calls.
- Sync must be fire-and-forget (or queued) and never block a dose action.
