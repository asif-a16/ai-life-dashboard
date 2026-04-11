# Phase 7a — Calendar Two-Tab Layout + Interactive Month Grid

## Context
Add a two-tab structure to the calendar page: "Events" (ICS) and "My Logs" (daily log viewing) with an interactive month grid.

## Files to Create
| File | Purpose |
|---|---|
| `components/calendar/MonthGrid.tsx` | Client — interactive month grid |

## Files to Change
| File | Change |
|---|---|
| `app/(dashboard)/calendar/page.tsx` | Two-tab layout; pass log entry dates to MonthGrid |

## Completion Criteria
- [ ] Calendar page has "Events" and "My Logs" tabs
- [ ] Events tab unchanged
- [ ] My Logs tab renders month grid with nav arrows
- [ ] Days with log entries show dot indicator
- [ ] Clicking a day highlights it
- [ ] Month navigation works
