# Storage domain

Owner: **Integration/Lead**.

- `localStore.ts` is the only module that touches `localStorage`.
- UI must go through `hooks/`; never import this file from a component.
- State is versioned (`STORAGE_VERSION`) and exportable as JSON.
- Backend sync is best-effort and must never block the UI.
