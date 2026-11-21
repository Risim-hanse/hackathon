# Meds domain

Owner: **UI-Core**.

Files:
- `MedicationForm.tsx` — add/edit/stop. All `Medication` fields, with sensible defaults.
- `BrandField.tsx` — typeahead over `brands.json`; shows resolved generic; unknown = warn.
- `ScheduleBuilder.tsx` — fixed times / every N hours / as-needed.
- `MedicationList.tsx` — active, paused, stopped sections.

Rules:
- Live duplicate hint while typing (call `resolveBrand` from engine).
- Do not create a new domain shape; use `Medication`.
- Required: brand, generic, strength, dose amount, at least one time.
- Destructive actions need confirmation.
