# Phase 8 — Log History / Groups View

## Context
New /history page: browse all entries by type with date filtering, grouped by date, collapsible.

## Files to Create
| File | Purpose |
|---|---|
| `app/(dashboard)/history/page.tsx` | Server component |
| `components/logging/HistoryView.tsx` | Client — type filter + date filter + grouped list |

## Files to Change
| File | Change |
|---|---|
| `components/layout/Sidebar.tsx` | Add "History" nav link |

## Completion Criteria
- [ ] /history accessible via sidebar
- [ ] All entries shown by default, grouped by date
- [ ] Type filter pills work
- [ ] Date range inputs filter correctly
- [ ] Each date group is collapsible
- [ ] E2E test `tests/history.spec.ts`
