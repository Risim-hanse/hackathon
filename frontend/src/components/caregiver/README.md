# Caregiver domain

Owner: **UI-Safety**.

Files:
- `CaregiverModal.tsx` — copy summary, WhatsApp (`wa.me/?text=...`), call (`tel:`), print.
- `DoctorSummary.tsx` — one-page print view (`@media print`), profile + meds + adherence + alerts.

Rules:
- No backend. All sharing is user-initiated.
- The summary must be plain text (works when pasted into WhatsApp).
- Never include data the user did not choose to share.
- Print view hides navigation, toggles, and buttons.
