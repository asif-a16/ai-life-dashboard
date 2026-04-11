# Phase 3 — Bodyweight Chart (Dashboard)

## Context
Users want a visual weight trend on the dashboard, filterable by 1W / 1M / 1Y. Embedded in a new card below the insight card; no new page.

## Dependencies
```
npm install recharts
```

## Files to create
| File | Purpose |
|---|---|
| `components/charts/BodyweightChart.tsx` | Client component — recharts line chart + filter tabs |

## Files to change
| File | Change |
|---|---|
| `app/(dashboard)/dashboard/page.tsx` | Fetch all bodyweight entries (no limit); render `<BodyweightChart>` in a Card |

## Completion criteria
- [ ] Chart card visible on dashboard when bodyweight entries exist
- [ ] Empty state shown when no entries
- [ ] 1W / 1M / 1Y filters correctly slice the data
- [ ] Tooltip shows weight to 2 dp with " kg" suffix
- [ ] Chart is responsive (fills card width)
- [ ] E2E test `tests/weight-chart.spec.ts`: seed bodyweight entries → navigate to dashboard → assert chart card visible
