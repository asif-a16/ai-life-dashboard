# Phase 7b — Calendar Day View (Grouped, Collapsible Log Entries)

## Context
When a day is selected in the month grid (Phase 7a), show that day's log entries grouped by type, each group collapsible.

## Files to Create
| File | Purpose |
|---|---|
| `components/calendar/DayLogView.tsx` | Client — grouped collapsible log entries for selected date |

## Completion Criteria
- [ ] Selecting a day loads that day's entries
- [ ] Entries grouped by type with count badge
- [ ] Each group is collapsible/expandable
- [ ] Empty days show "No entries for this day"
- [ ] Same summary format as RecentLogList
- [ ] E2E test `tests/calendar-day-view.spec.ts`
