# Primitives

Owner: **UI-Core**. All other UI domains may import these.

Planned:
- `Button` (done)
- `Card`
- `Badge` (status with icon + text, never colour alone)
- `Toggle` (large touch target)
- `LiveRegion` (`aria-live="polite"`)
- `Modal` (focus trap, Escape to close)
- `Field` (label + hint + error, `aria-describedby`)
- `EmptyState`

Rules: no business logic, no data imports, no `fetch`. Every component must work
with keyboard only and at 200% zoom.
