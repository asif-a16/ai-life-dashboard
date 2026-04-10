# AI Life Dashboard

A personal health and wellness tracker where you log meals, workouts, bodyweight, mood, habits, and reflections — by voice or text. The system stores structured data over time and uses AI to generate weekly narrative insights delivered as spoken audio.

**Demo story:** Speak a meal into the mic → entry is parsed and saved → AI reads back a personalized weekly summary in a spoken voice.

---

## Key Features

- **Voice logging** — speak any entry type; ElevenLabs transcribes, Claude (or keyword matcher) extracts structured data, confirmation card lets you edit before saving
- **Text logging** — tabbed form for all 5 entry types: meal, workout, bodyweight, mood, reflection
- **Habit tracking** — daily check-in, streak computation, compact dashboard view
- **AI insights** — weekly narrative summary generated from your real data, spoken aloud via ElevenLabs TTS
- **Dual-mode AI** — runs fully without an Anthropic key using deterministic template summaries; upgrades to LLM narratives when `ANTHROPIC_API_KEY` is present
- **Calendar import** — upload `.ics` files, upcoming events appear in insight context
- **Supabase-backed** — Postgres with RLS, all data isolated per user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Voice input | ElevenLabs STT (`scribe_v1` model) |
| Voice output | ElevenLabs TTS (`eleven_turbo_v2` model) |
| AI narratives | Anthropic `claude-sonnet-4-6` (optional — mock used if absent) |
| AI transcript parsing | Anthropic `claude-sonnet-4-6` (optional — keyword matcher if absent) |
| Validation | Zod |
| Testing | Playwright (E2E) |
| Deployment | Vercel |

---

## Architecture

```
Browser
  ├── Server Components   — page shells, data fetching via Supabase server client
  ├── Client Components   — forms, VoiceRecorder, InsightPlayer
  └── Route Handlers (app/api/*)
        ├── /api/log                POST, DELETE
        ├── /api/habits             GET, POST, DELETE
        ├── /api/habits/check       POST (toggle habit_log)
        ├── /api/calendar           GET, POST (ICS import)
        ├── /api/insights           GET (cached), POST (generate pipeline)
        ├── /api/voice/stt          POST → parsed entry JSON (does NOT save to DB)
        └── /api/seed               POST (demo data)

Supabase
  ├── Auth (email/password)
  ├── PostgreSQL (6 tables, RLS on all)
  └── Storage (bucket: insight-audio, public read)

External APIs — server-side only
  ├── ElevenLabs /v1/speech-to-text   (STT, always required)
  ├── ElevenLabs /v1/text-to-speech   (TTS, always required)
  └── Anthropic claude-sonnet-4-6     (optional — mock mode if absent)
```

### Key Architecture Decisions

- **Polymorphic `log_entries` table** — one table for all 5 entry types with a JSONB `data` column. Zod validates structure at the API boundary.
- **Voice pipeline does not auto-save** — `/api/voice/stt` returns a parsed entry to the browser for user confirmation. The browser then calls `POST /api/log`.
- **On-demand insight generation with DB cache** — no cron jobs. Results cached for 24 hours in `insights_cache`. Audio stored in Supabase Storage.
- **Dual-mode AI** — `lib/ai/insightEngine.ts` and `lib/voice/transcriptParser.ts` check `ANTHROPIC_API_KEY` at runtime and delegate to LLM or mock. Callers never branch on the key themselves.

---

## Dual-Mode AI System

The app runs fully without an Anthropic API key. When the key is absent, it uses:
- **Template-based narratives** — 3–4 sentence paragraph with real stats values, deterministic suggestion rotation
- **Keyword-based transcript parsing** — regex matching for common voice patterns (meals, workouts, bodyweight, mood)

When `ANTHROPIC_API_KEY` is set, it automatically upgrades to:
- **LLM narratives** — `claude-sonnet-4-6` with wellness coach system prompt, under 250 words
- **Claude-backed extraction** — structured JSON from free-form voice transcripts, with Zod validation

Both modes feed into the same ElevenLabs TTS pipeline and produce spoken audio. The UI shows "Smart Summary" or "AI Insight" badge to indicate which mode was used.

---

## Voice Architecture

1. `VoiceRecorder.tsx` captures audio via `MediaRecorder` (`audio/webm;codecs=opus`)
2. On stop: POST audio blob as `FormData` to `/api/voice/stt`
3. Route handler: ElevenLabs STT → transcript string
4. Route handler: `transcriptParser.ts` → Claude or keyword matcher → `ParsedLogEntry`
5. Returns `{ parsedEntry, transcript }` to browser — **no DB write yet**
6. Browser shows confirmation card with editable fields
7. User confirms → `POST /api/log` saves entry with `voice_transcript`

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs STT + TTS |
| `ELEVENLABS_VOICE_ID` | Yes | ElevenLabs TTS voice |
| `ANTHROPIC_API_KEY` | No | Claude — if absent, mock mode is used |
| `NEXT_PUBLIC_DEMO_MODE` | No | Set `true` to show "Seed Demo Data" button |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project (see [Supabase Setup](#supabase-setup))
- ElevenLabs account with API key and a voice ID

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd ai-life-dashboard
npm install

# 2. Copy and fill environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Go to **SQL Editor** and run the full contents of `supabase/migrations/001_initial_schema.sql`
3. Run this additional migration if not already present:
   ```sql
   ALTER TABLE public.insights_cache ADD COLUMN IF NOT EXISTS insight_mode text NOT NULL DEFAULT 'mock';
   ```
4. Go to **Storage** → **New bucket**: name `insight-audio`, Public: **on**
5. Copy your project URL and keys into `.env.local`

---

## Vercel Deployment

See [docs/deploy-checklist.md](docs/deploy-checklist.md) for a full step-by-step guide.

Quick version:
1. Push repo to GitHub
2. Import project at https://vercel.com
3. Add all environment variables in Vercel project settings
4. Deploy

---

## Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Create test env file
cp .env.test.local.example .env.test.local
# Fill in TEST_USER_EMAIL and TEST_USER_PASSWORD

# Run E2E tests
npm run test:e2e

# Open Playwright UI
npm run test:e2e:ui
```

Tests run against `next dev` on localhost. External APIs (ElevenLabs, Anthropic) are mocked via `page.route()` — no real API calls during test runs.

---

## Project Structure

```
app/
  (auth)/login, signup       — auth pages
  (dashboard)/
    dashboard/               — main dashboard
    log/                     — text + voice logging
    habits/                  — habit CRUD + check-in
    calendar/                — ICS import + event list
  api/
    log, habits, calendar, insights, voice/stt, seed

components/
  layout/   Sidebar, TopNav (+ voice trigger)
  logging/  LogEntryForm, LogTypeFields, RecentLogList
  habits/   HabitCard, TodayHabitChecklist
  voice/    VoiceRecorder, InsightPlayer
  insights/ InsightCard, DeterministicStats

lib/
  supabase/   client.ts, server.ts
  ai/         computeStats, insightEngine, mockNarrativeGenerator,
              llmNarrativeGenerator, buildInsightPrompt
  voice/      elevenLabsSTT, elevenLabsTTS, transcriptParser,
              mockTranscriptParser, llmTranscriptParser
  calendar/   parseICS
  types.ts    — single source of truth for all types + Zod schemas
```
