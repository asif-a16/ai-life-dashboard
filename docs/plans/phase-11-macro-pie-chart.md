# Phase 11 — Macro Pie Chart

## Context
Recharts PieChart for fat/carbs/protein. Colors: protein=emerald, carbs=sky blue, fat=amber. Time period selector (Today / 7 Days / 30 Days).

## Files to Create
| File | Purpose |
|---|---|
| `components/charts/MacroPieChart.tsx` | PieChart with period selector |

## Files to Change
| File | Change |
|---|---|
| `app/(dashboard)/dashboard/page.tsx` | Fetch meal entries; render MacroPieChart |

## Completion Criteria
- [ ] Chart visible when meal entries with macros exist
- [ ] Protein=green, carbs=blue, fat=amber
- [ ] Period selector filters correctly
- [ ] Empty state when no macro data
- [ ] Tooltip shows segment + grams
