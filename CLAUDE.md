# CLAUDE.md — AI Life Dashboard

## Product Overview

AI Life Dashboard is a personal health and wellness tracker where users log meals, workouts, bodyweight, mood, habits, and reflections — by voice or text. The system stores structured data over time and uses AI to generate weekly narrative insights delivered as spoken audio. A lightweight ICS calendar integration allows the AI to incorporate schedule context into insights.

**The demo story:** User speaks a meal into the mic → entry is parsed and saved → AI reads back a personalized weekly summary in a spoken voice.

**The app runs fully with or without an Anthropic API key.** ElevenLabs (STT + TTS) is always required. When `ANTHROPIC_API_KEY` is absent, the system uses deterministic template-based narrative summaries and keyword-based voice parsing. When it is present, it upgrades to LLM-generated insights and Claude-powered transcript extraction. No code changes needed to switch — the mode is detected automatically from env vars at runtime.

---

## MVP Scope

**In scope:**
- Email/password auth (Supabase)
- Text and voice logging for 5 entry types: meal, workout, bodyweight, mood, reflection
- Habit tracking with daily check-in and streak computation
- ICS calendar import (upcoming events only, no recurring events)
- AI insight panel: deterministic stat chips + LLM narrative + ElevenLabs voice playback
- Dashboard: today's habits, recent logs, insight card
- Public Vercel deployment

**Out of scope:** OAuth, push notifications, multi-user, mobile app, wearables, real-time sync, manual calendar event creation, recurring habits scheduling UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (Auth + PostgreSQL + Storage + RLS) |
| Voice input | ElevenLabs STT (`scribe_v1` model) |
| Voice output | ElevenLabs TTS (`eleven_turbo_v2` model) |
| AI (optional) | Anthropic `claude-sonnet-4-6` — LLM narratives + voice parsing |
| AI (mock mode) | Template rules + keyword matching — used when no Anthropic key |
| Calendar | `ical.js` for ICS parsing |
| Validation | Zod |
| Deployment | Vercel |

---

## Architecture

```
Browser
  ├── Server Components   — page shells, data fetching via Supabase server client
  ├── Client Components   — forms, VoiceRecorder, InsightPlayer
  └── Route Handlers (/app/api/*)
        ├── /api/log                POST, DELETE
        ├── /api/habits             GET, POST, DELETE
        ├── /api/habits/check       POST (toggle habit_log)
        ├── /api/calendar           GET, POST (ICS import)
        ├── /api/insights           GET (cached), POST (generate pipeline)
        └── /api/voice/stt          POST → returns parsed entry JSON, does NOT save to DB

Supabase
  ├── Auth (email/password)
  ├── PostgreSQL (5 tables with RLS)
  └── Storage (bucket: insight-audio, public read)

External APIs — server-side only, never exposed to browser
  ├── ElevenLabs /v1/speech-to-text   (required)
  ├── ElevenLabs /v1/text-to-speech   (required)
  └── Anthropic claude-sonnet-4-6     (optional — mock mode used if absent)
```

### Architecture Decisions

**Polymorphic `log_entries` table with JSONB `data` column** — one table for all 5 entry types instead of 5 separate tables. Enables unified queries for AI insights and a single RLS policy. Zod validates JSONB structure at the API boundary.

**`/api/voice/stt` does not save to DB** — returns parsed entry to the browser for user confirmation before saving. This allows the user to edit fields before committing. The browser then calls `POST /api/log` to save.

**On-demand insight generation with DB cache** — no cron jobs. User clicks "Generate Insight". Result is cached in `insights_cache` for 24 hours. Audio stored in Supabase Storage so ElevenLabs is not called on every page load.

**Two separate steps for voice logging** — ElevenLabs STT for transcription accuracy, then structured extraction (Claude if key present, keyword matcher if not). Do not attempt to combine them into a single call.

**Dual-mode AI with a single abstraction layer** — `lib/ai/insightEngine.ts` and `lib/voice/transcriptParser.ts` are the only entry points for narrative generation and transcript parsing respectively. They check `ANTHROPIC_API_KEY` at runtime and delegate to either the LLM or mock implementation. Callers never branch on the key themselves.

**ElevenLabs is always required** — there is no browser STT fallback. If `ELEVENLABS_API_KEY` is missing the app will fail at the voice step. This is intentional: voice is a core feature, not optional.

**All API keys are server-side only** — never referenced in client components or passed to the browser. All ElevenLabs and Anthropic calls happen inside Route Handlers.

---

## Data Modeling Rules

### Tables
- `profiles` — extends `auth.users`, auto-created on signup via trigger
- `log_entries` — polymorphic, all log types in one table, JSONB `data` column
- `habits` — habit definitions
- `habit_logs` — one row per habit per day completed, unique on `(habit_id, completed_on)`
- `calendar_events` — parsed from ICS, unique on `(user_id, ics_uid)`
- `insights_cache` — one active insight per user per day, unique on `(user_id, period_end)`

### RLS Requirements

**Every table must have RLS enabled.** Apply this exact four-policy pattern to all tables:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own" ON <table> FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON <table> FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON <table> FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own" ON <table> FOR DELETE USING (auth.uid() = user_id);
```

For `profiles`, the PK is `id` not `user_id` — use `auth.uid() = id`.

**Never use the service role key in client-side code.** Route handlers use the server Supabase client (cookie-based session), which enforces RLS automatically.

### JSONB Schemas (enforced by Zod)
- `meal`: `{ description, calories, protein_g, meal_type: breakfast|lunch|dinner|snack }`
- `workout`: `{ activity, duration_min, intensity: light|moderate|hard, distance_km? }`
- `bodyweight`: `{ weight_kg, unit: kg|lbs }`
- `mood`: `{ score (1-10), emotions: string[], energy_level (1-10) }`
- `reflection`: `{ content }`

All Zod schemas live in `lib/types.ts`. Import from there — do not redefine.

---

## Voice Feature Guidelines

### Voice Logging Pipeline (exact order)

1. `VoiceRecorder.tsx` captures audio via `MediaRecorder` with `mimeType: 'audio/webm;codecs=opus'`
2. On stop: assemble chunks into a Blob, POST as `FormData` to `/api/voice/stt`
3. Route handler calls `lib/voice/elevenLabsSTT.ts` → ElevenLabs returns transcript string
4. Route handler calls `lib/voice/transcriptParser.ts` → delegates to Claude (if `ANTHROPIC_API_KEY`) or keyword matcher (if not) → returns validated `ParsedLogEntry`
5. On parse failure: fall back to `{ type: 'reflection', data: { content: transcript } }`
6. Route handler returns `{ parsedEntry, transcript }` — **does not save to DB**
7. `VoiceRecorder` shows confirmation card with editable fields
8. User confirms → browser calls `POST /api/log` with `voice_transcript` included
9. Success → toast, reset recorder to idle

### VoiceRecorder States
`idle → recording → processing → result → idle`

Do not add extra states. Each state has exactly one UI representation.

### Fallback Rules
- Microphone permission denied → inline error, stay in `idle`
- ElevenLabs STT failure → show error "Could not transcribe audio. Please try again."
- Claude parse failure → automatically falls back to keyword-based mock parser (no error shown)
- Mock parser cannot determine type → default to `reflection` with full transcript as content
- `POST /api/log` failure → keep confirmation card visible so user does not lose the entry

### ICS Integration Rules
- Only parse `VEVENT` components; skip anything with `RRULE` (no recurring events)
- Only include events with `start_at > now()` and `start_at < now() + 90 days`
- Dedup on `ics_uid` using `ON CONFLICT (user_id, ics_uid) DO UPDATE`
- `parseICS()` returns `[]` on any parse error — it never throws
- The calendar page shows a simple sorted list; no drag-and-drop, no editing

---

## AI Insights Guidelines

### Dual-Mode Narrative Generation

The insight narrative is always generated — the only difference is quality:

| Mode | When active | Narrative source | Speed |
|---|---|---|---|
| Mock | No `ANTHROPIC_API_KEY` | Template sentences filled from `DashboardStats` | <100ms |
| LLM | `ANTHROPIC_API_KEY` present | Claude `claude-sonnet-4-6` | ~5-15s |

Both modes feed into the same TTS pipeline (ElevenLabs always speaks the result). Both store the result in `insights_cache`. The `insight_mode` column (`'mock'` or `'llm'`) records which was used and drives the UI badge ("Smart Summary" vs "AI Insight").

**The abstraction:** `lib/ai/insightEngine.ts` exposes `generateNarrative(stats, recentEntries)`. It checks `ANTHROPIC_API_KEY`, calls LLM if present (with mock fallback on error), calls mock if absent. Callers never branch on the key themselves.

### Separation of Concerns

| Layer | Source | Component | Rendered when |
|---|---|---|---|
| Stat chips | `computeStats()` — SQL only | `DeterministicStats.tsx` | Always, on page load |
| "Generate" button | — | `InsightCard.tsx` | When no cached insight |
| Mode badge | `insight_mode` from cache | `InsightCard.tsx` | After generation |
| Narrative text | mock or LLM via `insightEngine` | `InsightCard.tsx` | After generation |
| Audio playback | ElevenLabs TTS (always) | `InsightPlayer.tsx` | After generation |
| Stale warning | DB timestamp check | `InsightCard.tsx` | When new data exists after cache |

**Stat chips must never depend on the LLM.** They are computed server-side from Supabase queries and rendered as props. If narrative generation fails, stats are still visible.

### Mock Narrative Rules (`lib/ai/mockNarrativeGenerator.ts`)

Produces a 3-4 sentence paragraph from template strings filled with real `DashboardStats` values:
- Mood sentence: chosen by `mood.avg` threshold (≥7 positive, ≥5 neutral, else empathetic)
- Habit sentence: names the top habit by `completedThisWeek` and its streak; omitted if no habits
- Weight sentence: shows delta if data exists; omitted if no bodyweight entries
- Suggestion: one of 5 fixed strings rotated by `(dayOfYear % 5)` — deterministic, not random

### `computeStats()` — What to Compute (7-day window)
- COUNT of log entries per type
- AVG mood score and energy level
- SUM workout minutes, COUNT workouts
- First and last bodyweight values + delta
- SUM calories, AVG daily protein
- Per-habit: completion count this week + current streak (computed in JS, not SQL)
- COUNT reflections
- Next 3 upcoming `calendar_events`

### LLM Prompt Rules (only used when `ANTHROPIC_API_KEY` present)
- System prompt: wellness coach, 2-3 warm paragraphs, one actionable suggestion, under 250 words, second person, no raw number repetition
- Context: stats block + last 5 mood entries + last 3 workout entries + next 3 calendar events
- Token budget: stay under 2,000 tokens for the full prompt
- Model: `claude-sonnet-4-6`, `max_tokens: 500`

### Caching
- Cache hit: `insights_cache` row where `user_id = auth.uid()` AND `period_end = today` AND `created_at > now() - interval '24 hours'`
- On generate: upsert with `ON CONFLICT (user_id, period_end) DO UPDATE`
- Stale indicator: check if any `log_entries.created_at > insights_cache.created_at`

---

## Simplicity Rules

These rules exist because this is a demo-first MVP. Do not violate them.

- **No settings page.** Voice ID comes from `ELEVENLABS_VOICE_ID` env var. No user-configurable settings.
- **No pagination.** Dashboard shows last 20 log entries. No infinite scroll or page controls.
- **No Web Audio API waveform.** CSS `animate-pulse` is sufficient for voice recording feedback.
- **No separate insights history page.** Last 3 insights shown on dashboard only.
- **No manual calendar event creation.** ICS import only.
- **No drag-and-drop anywhere.** Simple file input for ICS upload.
- **No service role key in API routes.** Cookie-based server client with RLS is sufficient.
- **No optimistic updates that require rollback logic.** Use simple `router.refresh()` after mutations where instant feedback is not critical.
- **One `lib/types.ts` file.** All types and Zod schemas live here. Do not scatter them across files.

If a feature is not in the MVP scope, do not build it. Do not add configuration options, abstractions, or "nice to haves" that are not required for the demo.

---

## Coding Standards

### File Structure
- All shared types and Zod schemas: `lib/types.ts`
- Supabase clients: `lib/supabase/client.ts` and `lib/supabase/server.ts`
- AI abstraction: `lib/ai/insightEngine.ts` (single entry point — do not call LLM/mock directly from routes)
- AI implementations: `lib/ai/computeStats.ts`, `lib/ai/mockNarrativeGenerator.ts`, `lib/ai/llmNarrativeGenerator.ts`, `lib/ai/buildInsightPrompt.ts`
- Voice abstraction: `lib/voice/transcriptParser.ts` (single entry point — do not call LLM/mock directly from routes)
- Voice implementations: `lib/voice/elevenLabsSTT.ts`, `lib/voice/elevenLabsTTS.ts`, `lib/voice/mockTranscriptParser.ts`, `lib/voice/llmTranscriptParser.ts`
- Calendar parsing: `lib/calendar/parseICS.ts`
- Route handlers: `app/api/*/route.ts`
- Page components: `app/(dashboard)/*/page.tsx`
- UI components: `components/` (grouped by feature: layout, logging, habits, voice, insights, calendar)

### TypeScript
- Strict mode enabled. No `any`. No type assertions unless unavoidable.
- All function parameters and return types must be explicitly typed.
- Use types from `lib/types.ts` — do not redefine equivalent types in component files.
- Zod schemas are the source of truth for runtime validation; infer TypeScript types from them with `z.infer<typeof Schema>`.

### React / Next.js
- Default to Server Components. Use `'use client'` only when the component needs browser APIs, state, or event handlers.
- Fetch data in Server Components and pass as props to Client Components. Do not fetch from Client Components unless it is a user-triggered mutation.
- Use `next/navigation` `router.refresh()` after mutations to revalidate server data.
- Do not use `useEffect` for data fetching. Use server-side fetching.

### API Routes
- All Route Handlers validate auth first. Return 401 if no session.
- Use the server Supabase client (from `lib/supabase/server.ts`) — never the browser client in Route Handlers.
- Validate all request bodies with Zod before touching the database.
- Return consistent shapes: `{ data: T }` on success, `{ error: string }` on failure with appropriate HTTP status codes.

### Naming
- Use descriptive names. `computeDashboardStats` not `getStats`. `transcribeAudio` not `doSTT`.
- Boolean variables: `is*` or `has*` prefix. `isLoading`, `hasError`, `isStale`.
- Handler functions in components: `handle*`. `handleSubmit`, `handleVoiceStop`, `handleGenerateInsight`.
- Avoid abbreviations except universally understood ones: `id`, `url`, `api`, `ui`.

### Error Handling
- All API routes: wrap handler body in try/catch, return `{ error: e.message }` with 500 on unexpected errors.
- All client-side mutations: catch errors, display inline error messages. Never log to console and silently fail.
- Voice pipeline: follow the fallback rules defined in the Voice Feature Guidelines section.

---

## How Claude Should Approach Tasks

### Before Implementing
1. Read all files that will be touched before writing any code.
2. Understand the existing patterns — match them. Do not introduce new patterns unless necessary.
3. If the task spans multiple files or has non-obvious dependencies, write out the implementation order before starting.
4. If requirements are ambiguous, make a reasonable decision and note it — do not stop to ask for minor clarifications.

### Implementation Approach
- Implement features end-to-end: API route + data layer + component + page integration, in one pass. Do not leave half-implemented features.
- Follow the phase structure in the plan. Do not build Phase 3 functionality while working on Phase 2.
- When adding a new feature, check `lib/types.ts` first — the type probably already exists.
- Prefer editing existing files over creating new ones when the new code logically belongs there.
- Do not add comments unless the logic is genuinely non-obvious. Self-documenting code is preferred.
- Do not add extra error handling, validation, or abstractions beyond what is needed for the current task.

### After Completing a Task
1. Run `npm run lint` — fix all errors and warnings.
2. Run `npm run typecheck` (or `tsc --noEmit`) — fix all type errors.
3. Verify the feature works end-to-end (can be a quick manual check or reading through the logic).
4. Commit with a clear, functional message (see Git Workflow below).
5. Summarize what was built: files created/modified, any decisions made, anything the next task should know.

---

## Git and Code Quality

### Git Workflow
- After completing a meaningful unit of work, create a commit.
- Use clear, functional commit messages describing what was done:
  - `Add voice logging flow`
  - `Fix empty state in dashboard`
  - `Implement AI insight generation pipeline`
  - `Add ICS calendar import`
- Group related changes into a single commit. Do not create many tiny commits for one feature.
- Do not commit broken code. If lint or typecheck fails, fix it before committing.
- Do not commit `.env.local` or any file containing secrets.

### Code Quality Standards
- Code must be clean, readable, and production quality — not prototype quality.
- Use descriptive variable and function names. Avoid abbreviations.
- Prefer clarity over cleverness. If a simpler approach works, use it.
- Keep functions small and focused on one thing.
- Maintain consistent TypeScript types throughout. Use `lib/types.ts` as the source of truth.
- Avoid unnecessary complexity or premature abstractions. Build exactly what is needed.
- No dead code. Remove unused imports, variables, and functions before committing.

### Pre-Commit Checklist
Before every commit:
- [ ] `npm run lint` passes with no errors
- [ ] `npm run typecheck` passes with no errors
- [ ] No `console.log` statements left in committed code
- [ ] No unused imports or variables
- [ ] All new env vars are documented in this file and in `.env.local.example`

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Not used in MVP (reserved) |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs STT + TTS — voice will not work without this |
| `ELEVENLABS_VOICE_ID` | Yes | TTS voice ID — required alongside `ELEVENLABS_API_KEY` |
| `ANTHROPIC_API_KEY` | No | Claude API — if absent, mock narrative + keyword parser used |
| `NEXT_PUBLIC_DEMO_MODE` | No | Set to `true` to show "Seed Demo Data" button |

**Minimum viable `.env.local` (voice works, mock AI summaries):**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

**Full `.env.local` (voice + LLM insights):**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ANTHROPIC_API_KEY=...
```

**Rule:** Any variable without the `NEXT_PUBLIC_` prefix must only be referenced in Route Handlers or server-side code. If you see an API key referenced in a Client Component, that is a bug.
