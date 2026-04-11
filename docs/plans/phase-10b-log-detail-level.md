# Phase 10b — Log Detail Level

## Context
Per-type display preference: compact (name only) vs detailed (all fields). Stored in localStorage.

## Files to Create
| File | Purpose |
|---|---|
| `hooks/useLogDetailPrefs.ts` | Per-type detail level in localStorage |

## Files to Change
| File | Change |
|---|---|
| `components/logging/RecentLogList.tsx` | Use prefs in summarize() |
| `components/logging/HistoryView.tsx` | Same |
| `components/dashboard/DashboardCustomizer.tsx` | Add detail level toggles |

## Completion Criteria
- [ ] Detail toggles in customizer (per type)
- [ ] Compact: minimal info; Detailed: full fields
- [ ] Persists across refresh
- [ ] Works in RecentLogList and HistoryView
