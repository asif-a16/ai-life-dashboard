# Phase 10a — Dashboard Widget Customization

## Context
Users choose which dashboard sections to show. Preferences in localStorage. Widgets: Habits, Recent Logs, Insight, Weight Chart.

## Files to Create
| File | Purpose |
|---|---|
| `components/dashboard/DashboardCustomizer.tsx` | Gear button + checkbox panel |
| `hooks/useDashboardPrefs.ts` | Read/write localStorage prefs |
| `components/dashboard/DashboardLayout.tsx` | Client wrapper that conditionally renders widgets |

## Completion Criteria
- [ ] Gear icon in dashboard header
- [ ] Checkboxes for all 4 widgets
- [ ] Unchecking hides widget immediately
- [ ] Preference persists across refresh
- [ ] All widgets visible by default
