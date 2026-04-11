# Phase 2 — Meal Optional Fields (fat, carbs, salt)

## Context
`MealDataSchema` only has `calories` and `protein_g`. Adding `fat_g`, `carbs_g`, `salt_mg` as optional fields. No DB migration needed (JSONB is flexible).

## Files to change
| File | Change |
|---|---|
| `lib/types.ts` | Extend `MealDataSchema` with 3 optional nullable fields |
| `components/logging/LogTypeFields.tsx` | Add 3 new inputs in meal section |
| `lib/voice/mockTranscriptParser.ts` | Extract fat/carbs/salt from transcript |
| `lib/voice/llmTranscriptParser.ts` | Add new fields to system prompt JSON schema |

## Completion criteria
- [ ] Saving meal with fat=20, carbs=45, salt=800 persists correctly
- [ ] Existing meal entries without new fields load without error (all `.optional()`)
- [ ] Editing old meal allows adding new fields
- [ ] Voice mock mode: "60g carbs and 10g fat" extracts both fields
- [ ] E2E test in `tests/logging.spec.ts`: create meal with all 5 numeric fields → verify saved
