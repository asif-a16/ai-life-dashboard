# Phase 4 — Weight CSV Export & Import

## Context
Users want to download weight history as sorted CSV (date, weight to 2 dp) and re-import from Excel-exported CSV.

## Files to create
| File | Purpose |
|---|---|
| `app/api/log/export/weight/route.ts` | GET — stream CSV download |
| `app/api/log/import/weight/route.ts` | POST — parse CSV, bulk-insert bodyweight entries |
| `components/charts/WeightCsvControls.tsx` | Export button + file import input |

## Files to change
| File | Change |
|---|---|
| `components/charts/BodyweightChart.tsx` | Render `<WeightCsvControls>` below chart |

## Completion criteria
- [ ] Export downloads `weights.csv` with correct header and sorted rows
- [ ] Weights formatted to exactly 2 decimal places in export
- [ ] Import of valid 2-column CSV (date, weight_kg) inserts correctly
- [ ] Import handles `\r\n` line endings (Excel-exported CSV)
- [ ] Import skips invalid rows; `skipped` count is accurate
- [ ] E2E test `tests/weight-csv.spec.ts`: log 3 weights → export (verify download URL responds 200) → upload test CSV → verify new entries appear
