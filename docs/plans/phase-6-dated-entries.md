# Phase 6 — Date-Aware Entry Creation

## Context
`logged_at` exists in the DB schema but the form always defaults to `now()`. Users should be able to backdate entries and log for tomorrow.

## Files to Change
| File | Change |
|---|---|
| `components/logging/LogEntryForm.tsx` | Add date/time picker; include `logged_at` in POST body |

## Implementation
Add `<input type="datetime-local">` above the type tabs. Default: current local datetime (`YYYY-MM-DDTHH:mm`). Max: tomorrow at 23:59. Pass `logged_at` (ISO string) in POST body — API already accepts it.

## Completion Criteria
- [ ] Date/time picker visible, defaults to current time
- [ ] Submitting with a past date saves correct `logged_at`
- [ ] Max is tomorrow; min is reasonable past date
- [ ] Voice-confirmed entries still default to now
- [ ] E2E test `tests/dated-entries.spec.ts`
