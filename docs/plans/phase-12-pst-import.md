# Phase 12 — Outlook PST Calendar Import

## Context
Import Outlook calendar from .pst files using pst-extractor npm package. Extract calendar appointments, store in calendar_events with source='pst'.

## DB Migration
`supabase/migrations/003_calendar_source.sql`: ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ics'

## Files to Create
| File | Purpose |
|---|---|
| `lib/calendar/parsePST.ts` | Server utility wrapping pst-extractor |
| `app/api/calendar/import/pst/route.ts` | POST route for PST upload |
| `components/calendar/PSTUploader.tsx` | .pst file input component |
| `supabase/migrations/003_calendar_source.sql` | DB migration |

## Files to Change
| File | Change |
|---|---|
| `app/(dashboard)/calendar/page.tsx` | Add PST uploader in Events tab |

## Completion Criteria
- [ ] PST upload visible in Events tab
- [ ] Valid PST imports calendar events correctly
- [ ] Duplicates updated, not duplicated
- [ ] Recurring events skipped
- [ ] Events outside 90-day window skipped
- [ ] E2E test `tests/pst-import.spec.ts`
