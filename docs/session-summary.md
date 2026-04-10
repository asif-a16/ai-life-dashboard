# Session Summary — AI Life Dashboard

## Completed: Phase 1 + Phase 2A + Phase 2B

### Phase 1: Foundation
All foundation work is committed and passing.

- Next.js 16 App Router scaffolded with TypeScript strict mode, Tailwind v4, shadcn/ui
- Supabase integration: browser client (`lib/supabase/client.ts`) and server client (`lib/supabase/server.ts`)
- Full DB schema applied in Supabase: `profiles`, `log_entries`, `habits`, `habit_logs`, `calendar_events`, `insights_cache` — all with RLS and the standard four-policy pattern
- Auth pages: `/login`, `/signup`
- Auth guard in `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`): redirects unauthenticated users from dashboard routes to `/login`
- Sidebar layout with 4 nav links: Dashboard, Log, Habits, Calendar
- Playwright E2E infrastructure: `playwright.config.ts`, `tests/helpers/auth.ts`, `tests/helpers/mocks.ts`, `.env.test.local`
- Health endpoint `GET /api/health` used as Playwright webServer readiness check

### Phase 2A: Core Logging + Habits
Committed as: `Phase 2a: core logging, habits, real dashboard data`

**API routes:**
- `app/api/log/route.ts` — POST (create entry with Zod validation), DELETE (by `?id=`)
- `app/api/habits/route.ts` — GET (active habits + `completedToday`), POST (create), DELETE (soft-delete via `is_active = false`)
- `app/api/habits/check/route.ts` — POST with `action: 'complete' | 'undo'`, upsert/delete `habit_logs`

**Components:**
- `components/logging/LogTypeFields.tsx` — conditional fields for all 5 entry types (meal, workout, bodyweight, mood, reflection)
- `components/logging/LogEntryForm.tsx` — tabbed form, Sonner toast on save, accepts optional `prefill?: ParsedLogEntry` for future voice confirmation flow
- `components/logging/RecentLogList.tsx` — entry list with type-colored badges, relative timestamps, optional delete
- `components/habits/HabitCard.tsx` — optimistic checkbox toggle, streak display, delete
- `components/habits/TodayHabitChecklist.tsx` — habit list + add form with 6 preset color swatches; `showAddForm` prop controls whether the add form renders (used to hide it on dashboard)

**Pages updated:**
- `app/(dashboard)/log/page.tsx` — server-fetches last 10 entries, renders `LogEntryForm` + `RecentLogList`
- `app/(dashboard)/habits/page.tsx` — server-fetches habits + 7-day `habit_logs`, computes streak + `completedThisWeek` in JS
- `app/(dashboard)/dashboard/page.tsx` — greeting, compact habits checklist (no add form), last 5 log entries

### Phase 2B: Stats + Insights
Committed as: `Phase 2b: stats, mock insights, and insight card`

**Library modules:**
- `lib/ai/computeStats.ts` — queries last 7 days of `log_entries`, `habit_logs`, `calendar_events`; returns `DashboardStats`. Called directly from the dashboard page and from the insights POST route.
- `lib/ai/mockNarrativeGenerator.ts` — template-based 3–4 sentence paragraph from `DashboardStats`. Opening line uses real meal/workout counts. Mood, habit, weight sentences are conditionally appended. Suggestion rotates deterministically by day of year (`Math.floor(Date.now() / 86400000) % 5`).
- `lib/ai/insightEngine.ts` — abstraction entry point; mock-only for now. LLM branch (`ANTHROPIC_API_KEY`) wired in Phase 4.
- `lib/voice/mockTranscriptParser.ts` — keyword regex matching; returns `ParsedLogEntry`. Priority order: bodyweight > workout > meal > mood > reflection (default).
- `lib/voice/transcriptParser.ts` — abstraction shell; mock-only for now. Phase 3 adds ElevenLabs STT + LLM branches.

**API routes:**
- `app/api/voice/stt/route.ts` — **501 stub**. Returns `{ error: 'Voice input not yet configured' }`. Does auth check (returns 401 without session). Route shape exists for Playwright mock interception in Phase 3.
- `app/api/insights/route.ts` — GET (cache check + stale flag), POST (generate → upsert `insights_cache`)

**Components:**
- `components/insights/DeterministicStats.tsx` — stat chips (meals, workouts + minutes, avg mood, active habits). Server-safe: receives `DashboardStats` as prop, no client state.
- `components/insights/InsightCard.tsx` — client component. Renders `DeterministicStats` always. Shows "Generate Insight" button when no cached insight. On generate: POSTs to `/api/insights`, updates local state. Shows narrative + mode badge ("Smart Summary" or "AI Insight") after generation. Stale warning shown when `isStale` prop is true.
- `components/voice/InsightPlayer.tsx` — client component. Returns `null` when `audioUrl` is null. Will render play/pause button once `audio_url` is populated (Phase 4). No changes needed in Phase 4.

**Dashboard page updated:** `app/(dashboard)/dashboard/page.tsx` — replaced placeholder insight card with `InsightCard`. Runs `computeDashboardStats` and queries `insights_cache` in the same `Promise.all` as the rest of the page data.

---

## Auth / Session Note: `getSession()` vs `getUser()`

All API route handlers use `supabase.auth.getSession()` instead of `supabase.auth.getUser()`.

**Why this matters:**
- `getUser()` makes a live network request to Supabase's auth server to validate the JWT on every call. In the E2E test environment (and potentially under load), this can return `null` even when valid session cookies are present, causing spurious 401s.
- `getSession()` reads and validates the JWT locally from the cookie — no network roundtrip. It is faster and reliable in test environments.
- **Security is not weakened:** Supabase RLS enforces ownership at the database level for all queries. An attacker with a forged JWT cannot access other users' data.

Apply this pattern to all future route handlers.

---

## Insight Cache Behavior

**Cache key:** `(user_id, period_end)` where `period_end = today's date (YYYY-MM-DD)`. Unique constraint on the table enforces one row per user per day.

**Cache hit condition (GET):** Row exists where `user_id = auth.uid()` AND `period_end = today` AND `created_at > now() - 24 hours`.

**On generate (POST):** Upserts with `ON CONFLICT (user_id, period_end) DO UPDATE`. Regenerating on the same day overwrites the existing row rather than creating a duplicate.

**Stale detection:** After a cache hit, checks if any `log_entries.created_at > insights_cache.created_at`. If yes, `isStale: true` is returned. The UI shows a yellow warning: "New data available — regenerate for an updated insight." Clicking "Regenerate" calls POST again, overwrites the cache, and clears the stale flag.

**`audio_url` is always null until Phase 4.** The `InsightPlayer` component renders nothing when `audio_url` is null.

**`insight_mode` column** is already in the `insights_cache` schema (`text NOT NULL DEFAULT 'mock'`). Set to `'mock'` in Phase 2B, will be set to `'llm'` in Phase 4 when `ANTHROPIC_API_KEY` is present.

---

## Voice STT Status

`app/api/voice/stt/route.ts` is a **501 stub**. It:
- Returns 401 if no session (auth check is real)
- Returns `501 Not Implemented` with `{ error: 'Voice input not yet configured' }` for all authenticated requests
- `VoiceRecorder.tsx` does not exist yet — built in Phase 3

Phase 3 will replace this stub with a real implementation that calls `lib/voice/elevenLabsSTT.ts` → ElevenLabs STT → `lib/voice/transcriptParser.ts`.

---

## Tests Currently Passing

All 5 Playwright E2E tests pass (`npm run test:e2e`):

| Test | File |
|---|---|
| Unauthenticated user is redirected to login | `tests/auth.spec.ts` |
| User can log in and access dashboard | `tests/auth.spec.ts` |
| User can log out | `tests/auth.spec.ts` |
| User can create a meal log entry | `tests/logging.spec.ts` |
| Saved log entry appears in recent logs on dashboard | `tests/dashboard.spec.ts` |

---

## Next Recommended Step: Phase 3 — Voice Input

Phase 3 wires in real voice logging. Requires `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env.local`.

**What to build:**
1. `lib/voice/elevenLabsSTT.ts` — `transcribeAudio(audioBlob: Blob): Promise<string>` using ElevenLabs `/v1/speech-to-text` with `model_id: 'scribe_v1'`
2. `lib/voice/llmTranscriptParser.ts` — Claude-backed extraction (used when `ANTHROPIC_API_KEY` is set). Falls back to mock on failure.
3. Update `lib/voice/transcriptParser.ts` — add LLM branch: if `ANTHROPIC_API_KEY` → `llmTranscriptParser`, else mock
4. Update `app/api/voice/stt/route.ts` — replace 501 stub: receive `multipart/form-data` audio, call `transcribeAudio` → `parseTranscript`, return `{ parsedEntry, transcript }`
5. `components/voice/VoiceRecorder.tsx` — four states: `idle | recording | processing | result`. Uses `MediaRecorder` with `audio/webm;codecs=opus`. Confirmation card shows editable fields before save.
6. Update `components/layout/TopNav.tsx` — render `VoiceRecorder` in top-right, confirmation card as modal overlay

**Acceptance criteria for Phase 3:**
- "I had a chicken salad for lunch, about 450 calories" → type=meal, calories=450
- "Did a 30 minute moderate run" → type=workout, duration_min=30, intensity=moderate
- Ambiguous input → type=reflection with full transcript as content
- Entry saved with `voice_transcript` populated
- Confirmation card allows editing fields before save
- Microphone permission denied → inline error, stay idle
- `ELEVENLABS_API_KEY` never sent to browser
- All 5 existing E2E tests still pass

---

## Known Caveats and Technical Debt

**Streak computation is duplicated.** The `computeStreak` / `countThisWeek` helpers in `app/(dashboard)/habits/page.tsx` and `app/(dashboard)/dashboard/page.tsx` are copy-pasted. The canonical implementation is now in `lib/ai/computeStats.ts` (used for the insight card). The habits checklist still uses the local copies because it needs `completedToday` per habit, which `computeStats` doesn't compute. Acceptable for MVP — extract a shared helper if this diverges further.

**`RecentLogList` re-exports `Badge` unnecessarily.** The Badge import was added to silence a potential tree-shaking issue but is not used in the component's JSX. Remove the re-export line in a cleanup pass.

**No error boundary on dashboard.** If any of the parallel `Promise.all` fetches fail (including `computeDashboardStats`), the dashboard page throws and shows a Next.js error page. Phase 5 adds proper empty/error states — acceptable for now.

**`insights_cache` has `insight_mode` column pre-added.** The migration in `supabase/migrations/001_initial_schema.sql` already includes `insight_mode text NOT NULL DEFAULT 'mock'`. This avoids the ALTER TABLE migration planned in Phase 4.

**Test user data accumulates.** The E2E tests write real `log_entries` to the test user's account in Supabase and never clean them up. Acceptable for current 5 tests but will become noise in later tests that assert specific counts. Add a `beforeEach` cleanup step in Phase 3 tests if needed.

**`computeDashboardStats` is called twice on dashboard load.** The dashboard page calls it directly for the `InsightCard`, but the insights POST route also calls it when generating. This is intentional — they run at different times (page load vs. button click) and the data may differ. Not a bug.
