# Session Summary — AI Life Dashboard

## Current Status: Phases 1–4 Complete

All four phases are committed and passing. Phase 5 (Calendar + Polish) is the only remaining phase.

---

## Completed Phases

### Phase 1: Foundation
- Next.js 16 App Router with TypeScript strict mode, Tailwind v4, shadcn/ui
- Supabase integration: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server/cookie-based)
- Full DB schema in Supabase: `profiles`, `log_entries`, `habits`, `habit_logs`, `calendar_events`, `insights_cache` — all with RLS and the standard four-policy pattern
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
- `components/logging/LogEntryForm.tsx` — tabbed form, Sonner toast on save, accepts optional `prefill?: ParsedLogEntry`
- `components/logging/RecentLogList.tsx` — entry list with type-colored badges, relative timestamps, optional delete
- `components/habits/HabitCard.tsx` — optimistic checkbox toggle, streak display, delete
- `components/habits/TodayHabitChecklist.tsx` — habit list + add form with 6 preset color swatches; `showAddForm` prop hides the add form on dashboard

**Pages updated:**
- `app/(dashboard)/log/page.tsx` — server-fetches last 10 entries, renders `LogEntryForm` + `RecentLogList`
- `app/(dashboard)/habits/page.tsx` — server-fetches habits + 7-day `habit_logs`, computes streak + `completedThisWeek` in JS
- `app/(dashboard)/dashboard/page.tsx` — greeting, compact habits checklist (no add form), last 5 log entries

### Phase 2B: Stats + Insights
Committed as: `Phase 2b: stats, mock insights, and insight card`

**Library modules:**
- `lib/ai/computeStats.ts` — queries last 7 days; returns `DashboardStats`. Called from dashboard page and insights POST route.
- `lib/ai/mockNarrativeGenerator.ts` — template-based 3–4 sentence paragraph from `DashboardStats`. Suggestion rotates deterministically by day of year (`Math.floor(Date.now() / 86400000) % 5`).
- `lib/ai/insightEngine.ts` — abstraction entry point. Mock-only until Phase 4. LLM branch wired in Phase 4.
- `lib/voice/mockTranscriptParser.ts` — keyword regex matching; returns `ParsedLogEntry`. Priority: bodyweight > workout > meal > mood > reflection.
- `lib/voice/transcriptParser.ts` — abstraction shell. Mock-only until Phase 3.

**API routes:**
- `app/api/insights/route.ts` — GET (cache check + stale flag), POST (generate → upsert `insights_cache`)

**Components:**
- `components/insights/DeterministicStats.tsx` — stat chips. Server-safe, receives `DashboardStats` as prop.
- `components/insights/InsightCard.tsx` — client component. Renders stats always. Shows "Generate Insight" button, narrative + mode badge after generation, stale warning.
- `components/voice/InsightPlayer.tsx` — client component. Returns `null` when `audioUrl` is null. Renders play/pause button with real URL (live as of Phase 4).

### Phase 3: Voice Input
Committed as: `Phase 3: voice logging with ElevenLabs STT and Claude extraction`

**New library modules:**
- `lib/voice/elevenLabsSTT.ts` — `transcribeAudio(audioBlob: Blob): Promise<string>`. POSTs to ElevenLabs `/v1/speech-to-text` with `model_id: 'scribe_v1'`. Throws on non-OK response.
- `lib/voice/llmTranscriptParser.ts` — `llmParseTranscript(transcript): Promise<ParsedLogEntry>`. Uses `@anthropic-ai/sdk`, calls `claude-sonnet-4-6` with extraction system prompt. Validates output with `ParsedLogEntrySchema.safeParse()`. Falls back to reflection type on Zod failure.

**Updated modules:**
- `lib/voice/transcriptParser.ts` — now has LLM branch: if `ANTHROPIC_API_KEY` → try `llmParseTranscript` → catch silently → `mockParseTranscript`. Two fallback layers: API failure falls back to keyword matcher; invalid JSON from Claude falls back to reflection.
- `app/api/voice/stt/route.ts` — replaced 501 stub: receives `multipart/form-data` with `audio` field (Blob), calls `transcribeAudio` → `parseTranscript`, returns `{ parsedEntry, transcript }`. Does NOT save to DB.

**New components:**
- `components/voice/VoiceRecorder.tsx` — 4-state machine (`idle | recording | processing | result`). Uses `MediaRecorder` with `audio/webm;codecs=opus` (fallback to `audio/webm`). Auto-stop at 60s. Confirmation card shows editable `LogTypeFields`, notes, collapsible transcript, Save/Discard. Save failure keeps card visible. `onClose` prop for modal integration.

**Updated components:**
- `components/layout/TopNav.tsx` — added Mic icon button in header, fixed modal overlay with `VoiceRecorder` when open. Click-outside (checks `e.target === e.currentTarget`) closes modal.

**Updated pages:**
- `app/(dashboard)/log/page.tsx` — added voice tip callout above the form.

### Phase 4: LLM + TTS Upgrade
Committed as: `Phase 4: LLM narrative generation and ElevenLabs TTS for insight audio`

**New library modules:**
- `lib/ai/buildInsightPrompt.ts` — `buildInsightPrompt(stats, recentEntries): { system, user }`. System prompt: wellness coach, 2-3 paragraphs, actionable suggestion, under 250 words, second person. User message: stats block + recent moods + recent workouts + upcoming calendar events.
- `lib/ai/llmNarrativeGenerator.ts` — `llmGenerateNarrative(stats, recentEntries): Promise<string>`. Calls `claude-sonnet-4-6`, `max_tokens: 500`. Throws if no text block in response.
- `lib/voice/elevenLabsTTS.ts` — `synthesizeWithElevenLabs(text): Promise<Buffer>`. POSTs to ElevenLabs `/v1/text-to-speech/{VOICE_ID}` with `eleven_turbo_v2` model. Returns audio buffer.

**Updated modules:**
- `lib/ai/insightEngine.ts` — LLM branch added: if `ANTHROPIC_API_KEY` → try `llmGenerateNarrative` → catch silently → `mockGenerateNarrative`.
- `app/api/insights/route.ts` POST pipeline now:
  1. `computeDashboardStats` + fetch recentEntries
  2. `generateNarrative(stats, recentEntries)` → narrative (auto: mock or LLM)
  3. `synthesizeWithElevenLabs(narrative)` → audioBuffer
  4. Upload buffer to Supabase Storage `insight-audio/{userId}/{Date.now()}.mp3`
  5. Get public URL via `supabase.storage.getPublicUrl()`
  6. Upsert `insights_cache` with `audio_url` populated

---

## Current Features

### Text Logging
- 5 entry types: meal, workout, bodyweight, mood, reflection
- Tabbed form at `/log` with type-specific fields
- Recent entries list with delete
- All entries visible on dashboard

### Voice Logging
- Mic button in top nav bar, accessible from any dashboard page
- Records audio via browser `MediaRecorder` API
- Sends to ElevenLabs STT → returns transcript
- Transcript parsed by Claude (if `ANTHROPIC_API_KEY` set) or keyword matcher
- Confirmation card shows parsed result with editable fields before saving
- Saved with `voice_transcript` field populated

### Habit Tracking
- Create habits with name + color
- Daily check-in with optimistic toggle
- Streak computation (consecutive days from today backwards)
- Compact view on dashboard, full CRUD at `/habits`

### AI Insights
- Stat chips always visible (meals, workouts, avg mood, active habits)
- "Generate Insight" button triggers narrative + TTS pipeline
- Narrative stored in `insights_cache`, audio stored in Supabase Storage
- Play button appears after generation
- 24-hour cache with stale detection

### Calendar
- Page exists at `/calendar` but is a placeholder (Phase 5 implements ICS import)

---

## Dual-Mode AI System

### Mode detection
Both switches are server-side only. The browser never knows which mode is active.

| Feature | Mode condition | Implementation |
|---|---|---|
| Transcript parsing | `ANTHROPIC_API_KEY` set | `lib/voice/transcriptParser.ts` → calls `llmParseTranscript` or `mockParseTranscript` |
| Insight narrative | `ANTHROPIC_API_KEY` set | `lib/ai/insightEngine.ts` → calls `llmGenerateNarrative` or `mockGenerateNarrative` |
| TTS audio | Always (ElevenLabs required) | `lib/voice/elevenLabsTTS.ts` — no mock fallback |

### Mock mode (no `ANTHROPIC_API_KEY`)
- Narrative: template sentences filled from real `DashboardStats`. Deterministic — same data produces same output.
- Transcript parsing: keyword regex matching. Priority: bodyweight > workout > meal > mood > reflection.
- UI badge: "Smart Summary"

### LLM mode (`ANTHROPIC_API_KEY` present)
- Narrative: `claude-sonnet-4-6`, max 500 tokens, wellness coach system prompt.
- Transcript parsing: `claude-sonnet-4-6`, max 512 tokens, structured extraction prompt. Falls back to mock if Claude call fails or returns invalid JSON.
- UI badge: "AI Insight"

### Fallback chain for transcript parsing
```
User speaks
  → ElevenLabs STT (always, no fallback — throws if fails)
  → if ANTHROPIC_API_KEY:
      → try llmParseTranscript
          → if JSON invalid: return reflection type (never throws)
      → on network/API error: fall through to mock
  → mockParseTranscript (always returns valid ParsedLogEntry)
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe to expose to browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Not used in MVP (reserved) |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs STT + TTS — voice will not work without this |
| `ELEVENLABS_VOICE_ID` | Yes | TTS voice ID — required alongside `ELEVENLABS_API_KEY` |
| `ANTHROPIC_API_KEY` | No | If absent: mock narrative + keyword parser. If present: Claude-backed narrative + extraction. |

**Current `.env.local` status:**
- Supabase URL + keys: configured
- ElevenLabs API key + voice ID: configured
- Anthropic API key: empty (mock mode active)

---

## Auth / Session Pattern

All API route handlers use `supabase.auth.getSession()` instead of `supabase.auth.getUser()`.

**Why:** `getUser()` makes a live network request to Supabase's auth server on every call. In the E2E test environment this causes spurious 401s even with valid cookies. `getSession()` validates the JWT locally from the cookie — faster and reliable.

**Security:** Supabase RLS enforces ownership at the DB level for all queries regardless.

Apply this pattern to all future route handlers.

---

## Test Coverage

All 5 Playwright E2E tests pass (`npm run test:e2e`):

| Test | File |
|---|---|
| Unauthenticated user is redirected to login | `tests/auth.spec.ts` |
| User can log in and access dashboard | `tests/auth.spec.ts` |
| User can log out | `tests/auth.spec.ts` |
| User can create a meal log entry | `tests/logging.spec.ts` |
| Saved log entry appears in recent logs on dashboard | `tests/dashboard.spec.ts` |

**Mock strategy:** `/api/voice/stt` and `/api/insights` POST are intercepted via `page.route()` in `tests/helpers/mocks.ts`. No real ElevenLabs or Anthropic calls in tests.

**Test user:** `test@aidashboard.dev` / `TestPassword123!` — exists in Supabase Auth, never deleted by tests.

---

## Supabase Setup Status

All tables exist with RLS enabled. The `insight_mode` column in `insights_cache` must be added manually if not already present:

```sql
ALTER TABLE public.insights_cache ADD COLUMN IF NOT EXISTS insight_mode text NOT NULL DEFAULT 'mock';
```

Supabase Storage bucket `insight-audio` (public) must exist for TTS audio upload to work.

---

## Known Caveats and Technical Debt

**Streak computation is duplicated.** `app/(dashboard)/habits/page.tsx` and `app/(dashboard)/dashboard/page.tsx` both compute streaks locally. The canonical implementation is in `lib/ai/computeStats.ts`. Acceptable for MVP.

**No error boundary on dashboard.** If any parallel fetch in the dashboard page fails, Next.js shows an error page. Phase 5 addresses this with empty/error states.

**Test user data accumulates.** E2E tests write real `log_entries` and never clean up. Acceptable for 5 tests but will become noise if assertion counts matter.

**`computeDashboardStats` is called twice on dashboard load.** Once for the `InsightCard`, once inside the insights POST route. Intentional — they run at different times and data may differ.

**No ANTHROPIC_API_KEY configured.** App runs in mock mode. To enable LLM narratives and Claude-backed transcript extraction, add the key to `.env.local` and redeploy.

---

## Next Step: Phase 5 — Calendar + Polish

Phase 5 is the final phase. It adds ICS calendar import, a demo data seed endpoint, loading skeletons, empty states, and final polish.

### Phase 5 Execution Prompt

```
Read docs/session-summary.md and CLAUDE.md. Then implement Phase 5 (Calendar + Polish) end-to-end.

Before starting, confirm:
- The `ical.js` package is available (install if not: npm install ical.js)
- The calendar page at app/(dashboard)/calendar/page.tsx is currently a placeholder

Phase 5 tasks:
1. Install ical.js: npm install ical.js
2. Create lib/calendar/parseICS.ts — parseICS(icsString): CalendarEvent[]. Skip RRULEs, only future events within 90 days, return [] on parse error.
3. Create app/api/calendar/route.ts — GET (upcoming events, ordered ASC, limit 20), POST (ICS import via multipart/form-data, upsert on ics_uid, return { imported, skipped })
4. Create components/calendar/ICSUploader.tsx — file input (.ics only) + Import button, shows result count or error
5. Update app/(dashboard)/calendar/page.tsx — render ICSUploader + sorted event list, empty state
6. Create app/api/seed/route.ts — POST: deletes last 8 days of log_entries for auth user, inserts 7 days of realistic seed data (14 meals, 3 workouts, 4 moods, 2 reflections, 2 bodyweight entries). Return { seeded: number }.
7. Update app/(dashboard)/dashboard/page.tsx — add "Seed Demo Data" button (visible when NEXT_PUBLIC_DEMO_MODE=true or NODE_ENV=development)
8. Add loading skeletons using shadcn Skeleton to: RecentLogList, InsightCard, TodayHabitChecklist
9. Add empty states: RecentLogList ("No entries yet. Log your first entry above."), TodayHabitChecklist ("No habits yet. Add your first habit below.")
10. Wrap all API route handlers in try/catch with { error: string } responses (audit any missing)
11. Run npm run lint && npm run typecheck && npm run test:e2e — all must pass
12. Commit as: "Phase 5: calendar import, seed data, skeletons, and empty states"

Constraints:
- Do NOT implement OAuth, recurring event support, manual calendar event creation, or drag-and-drop
- Do NOT add pagination to any list
- Seed data must be hardcoded realistic values — not random
- Do not touch any Phase 1–4 files unless fixing a bug surfaced by Phase 5
```
