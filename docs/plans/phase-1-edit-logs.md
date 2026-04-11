# Phase 1 — Edit Log Entries

## Context
Users can delete entries but not correct mistakes. Add a PATCH API + inline edit UI on the log page.

## Files to change
| File | Change |
|---|---|
| `lib/types.ts` | Add `LogEntryUpdateSchema` |
| `app/api/log/route.ts` | Add `PATCH` handler |
| `components/logging/RecentLogList.tsx` | Add edit button + inline expanded edit form |

## Completion criteria
- [ ] `PATCH /api/log` returns updated row on success; returns 403 if wrong user ID
- [ ] Edit pencil icon visible per entry on the log page
- [ ] Clicking edit expands inline form with correct pre-filled values for all types
- [ ] Save: entry updates, list reflects change via `router.refresh()`
- [ ] Cancel: form collapses, no change
- [ ] E2E test `tests/editing.spec.ts`: create meal → edit calories → save → assert new value visible
