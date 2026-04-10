# AI Life Dashboard — MVP Implementation Plan

## Context

Demo-ready personal health dashboard for a coding agent assessment. The product shows the full loop: **log → store → analyze → speak**. Demo story: user logs a meal by voice, the dashboard stores it, and the AI reads back a narrative weekly summary in a spoken voice. Five implementation phases, each executable as a single autonomous Claude Code task.

**Pre-implementation setup required (manual steps before Phase 1):**

These must be completed by the user before Phase 1 begins. Claude will prompt for each credential when needed.

**Step A — Create Supabase project:**
1. Go to https://supabase.com, sign in, click "New Project"
2. Choose a name (e.g. `ai-life-dashboard`), set a strong DB password, pick the closest region
3. Wait for provisioning (~2 min), then go to Project Settings → API
4. Copy: `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy: `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Copy: `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

**Step B — Create Vercel project:**
1. Go to https://vercel.com, sign in, click "Add New Project"
2. Import the `ai-life-dashboard` GitHub repo
3. Framework preset: Next.js. Leave all other settings as default.
4. Do NOT deploy yet — add env vars first (done at end of Phase 1)

**Step C — Obtain API keys (required before Phase 3):**
- **ElevenLabs (required):** https://elevenlabs.io → Profile → API Key → `ELEVENLABS_API_KEY`
- **ElevenLabs Voice ID (required):** Go to Voices → pick any voice → click it → copy the Voice ID from the URL or sidebar → `ELEVENLABS_VOICE_ID`
- **Anthropic (optional):** https://console.anthropic.com → API Keys → Create key → `ANTHROPIC_API_KEY`. If omitted, the app uses template-based narrative summaries instead of LLM generation. Voice input and audio playback work regardless.

**Step D — Playwright test user (required before end of Phase 1):**
- After Phase 1 deploys and Supabase is live, go to Supabase Dashboard → Authentication → Users → "Add user"
- Email: `test@aidashboard.dev`, Password: `TestPassword123!`
- This user is reused across all test runs and never deleted

---

## Simplifications Made vs. Initial Draft

The following were identified as overcomplicated and removed:
- **`/settings` page** — voice ID is hardcoded from env var; no user-configurable settings for MVP
- **Web Audio API `AnalyserNode` waveform** — replaced with CSS pulse animation; API is complex and not demo-critical
- **`InsightHistory.tsx` + `/insights` page** — only the last 3 insights are shown on `/dashboard`; a separate insights page adds nav complexity with no demo value
- **5 separate log type field files** — merged into one `LogTypeFields.tsx` with conditional rendering
- **`HabitStreak.tsx` separate component** — streak display is inline in `HabitCard.tsx`
- **`MobileNav.tsx`** — sidebar collapses with a hamburger toggle; bottom nav is not needed
- **`EventCard.tsx`** — calendar events rendered inline in the calendar page
- **Manual calendar event creation** — ICS import only; no manual entry UI
- **`/api/log GET` pagination and filtering** — dashboard fetches last 20 entries; no pagination for MVP
- **`period_start` in `insights_cache`** — not needed; insight always covers last 7 days

---

## Architecture

```
Browser (Next.js 14, App Router, TypeScript, Tailwind, shadcn/ui)
  │
  ├── Server Components   — page shells, data fetching via supabase server client
  ├── Client Components   — forms, VoiceRecorder, InsightPlayer
  │
  └── Route Handlers (/app/api/*)
        ├── /api/log            POST, DELETE
        ├── /api/habits         GET, POST, DELETE
        ├── /api/habits/check   POST (toggle habit_log)
        ├── /api/calendar       GET, POST (ICS parse + upsert)
        ├── /api/insights       GET (cached), POST (generate)
        └── /api/voice/stt      POST (audio → parsed entry JSON, does NOT save)

Supabase
  ├── Auth (email/password)
  ├── PostgreSQL (5 tables, RLS on all)
  └── Storage (bucket: insight-audio, public read)

External APIs (server-side only, never in browser)
  ├── ElevenLabs /v1/speech-to-text  (STT)
  ├── ElevenLabs /v1/text-to-speech  (TTS)
  └── Anthropic claude-sonnet-4-6    (extraction + narrative)
```

---

## Playwright E2E Testing Strategy

### Philosophy
- Tests run against `next dev` on localhost, not against the production URL
- Use the real Supabase database with a dedicated test user (not mocked)
- Mock all external APIs (ElevenLabs, Anthropic) via Playwright `page.route()` network interception — no real API calls during tests
- Tests are isolated: clean up test user's `log_entries` before each test run
- Three tests only. No more until the MVP is shipped.

### Test User Setup
- One fixed test user created once manually in Supabase: `test@aidashboard.dev` / `TestPassword123!`
- Credentials stored in `.env.test.local` (gitignored): `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`
- Tests do NOT create or delete the user — they reuse it and clean up their own data

### API Mocking via `page.route()`

All mocks are defined in `tests/helpers/mocks.ts` and applied in `beforeEach`:

```typescript
// Mock ElevenLabs STT — intercepted at the route handler level
// /api/voice/stt returns a fixed parsed entry without calling ElevenLabs or Anthropic
await page.route('**/api/voice/stt', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    parsedEntry: {
      type: 'meal',
      notes: '',
      logged_at: null,
      data: { description: 'Test chicken salad', calories: 400, protein_g: 35, meal_type: 'lunch' }
    },
    transcript: 'I had a chicken salad for lunch'
  })
}))

// Mock ElevenLabs TTS + Anthropic — intercept /api/insights POST
await page.route('**/api/insights', async route => {
  if (route.request().method() === 'POST') {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        insight: {
          stats_json: {},
          narrative: 'You had a solid week. Keep it up.',
          audio_url: null  // no audio in tests
        },
        isStale: false
      })
    })
  } else {
    route.continue()  // GET passes through to real cache
  }
})
```

**Why intercept at the route handler, not at the external API URL:** ElevenLabs and Anthropic calls happen server-side. Playwright cannot intercept server-to-server requests. Intercepting at `/api/voice/stt` and `/api/insights` is the correct level.

### Test Files

```
tests/
├── helpers/
│   ├── mocks.ts        — reusable page.route() mock setup functions
│   └── auth.ts         — reusable login helper function
├── auth.spec.ts        — Test 1: login + dashboard access
├── logging.spec.ts     — Test 2: create log entry
└── dashboard.spec.ts   — Test 3: data appears in UI
```

### `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.test.local' })

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

### Test Specifications

**`tests/helpers/auth.ts`**
```typescript
export async function loginAsTestUser(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!)
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard')
}
```

**`tests/auth.spec.ts` — Test 1: Login and dashboard access**
```typescript
test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('user can log in and access dashboard', async ({ page }) => {
  await loginAsTestUser(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('navigation')).toBeVisible()  // sidebar
})
```

**`tests/logging.spec.ts` — Test 2: Create a new log entry**
```typescript
test.beforeEach(async ({ page }) => {
  // Clean up test user's log entries via the app's API
  await loginAsTestUser(page)
  // Use page.evaluate to call the delete endpoint for cleanup
  // Simpler: just proceed — duplicate entries do not break the test
})

test('user can create a meal log entry', async ({ page }) => {
  await loginAsTestUser(page)
  await page.goto('/log')
  await page.getByRole('tab', { name: 'Meal' }).click()
  await page.getByLabel('Description').fill('Grilled chicken')
  await page.getByLabel('Calories').fill('500')
  await page.getByRole('button', { name: 'Save Entry' }).click()
  await expect(page.getByText('Entry saved')).toBeVisible()  // success toast
})
```

**`tests/dashboard.spec.ts` — Test 3: Data appears in the UI**
```typescript
test('saved log entry appears in recent logs on dashboard', async ({ page }) => {
  await loginAsTestUser(page)

  // Create an entry via the form
  await page.goto('/log')
  await page.getByRole('tab', { name: 'Meal' }).click()
  const uniqueDescription = `Test meal ${Date.now()}`
  await page.getByLabel('Description').fill(uniqueDescription)
  await page.getByRole('button', { name: 'Save Entry' }).click()
  await expect(page.getByText('Entry saved')).toBeVisible()

  // Navigate to dashboard and verify it appears
  await page.goto('/dashboard')
  await expect(page.getByText(uniqueDescription)).toBeVisible()
})
```

### npm Scripts to Add

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

---

## Directory Structure

```
ai-life-dashboard/
├── app/
│   ├── layout.tsx                          root layout, Toaster provider
│   ├── page.tsx                            redirect: auth → /dashboard, else /login
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx                      sidebar shell + TopNav
│       ├── dashboard/page.tsx              today summary + recent logs + insight card
│       ├── log/page.tsx                    LogEntryForm + VoiceRecorder
│       ├── habits/page.tsx                 habit CRUD + TodayHabitChecklist
│       └── calendar/page.tsx              event list + ICSUploader
├── app/api/
│   ├── log/route.ts                        POST (create), DELETE via ?id=
│   ├── habits/route.ts                     GET, POST, DELETE via ?id=
│   ├── habits/check/route.ts               POST (toggle habit_log for a date)
│   ├── calendar/route.ts                   GET (upcoming events), POST (ICS import)
│   ├── insights/route.ts                   GET (cached), POST (generate pipeline)
│   └── voice/stt/route.ts                  POST audio blob → ElevenLabs STT → parsed entry JSON
├── components/
│   ├── ui/                                 shadcn/ui primitives (auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx                     nav links + collapse toggle
│   │   └── TopNav.tsx                      page title + VoiceRecorder trigger button
│   ├── logging/
│   │   ├── LogEntryForm.tsx                type selector + renders LogTypeFields
│   │   ├── LogTypeFields.tsx               conditional fields for all 5 types in one file
│   │   └── RecentLogList.tsx               last 20 log entries
│   ├── habits/
│   │   ├── HabitCard.tsx                   habit row with streak + toggle
│   │   └── TodayHabitChecklist.tsx         list of HabitCards for today
│   ├── voice/
│   │   ├── VoiceRecorder.tsx               mic button, state machine, confirmation card
│   │   └── InsightPlayer.tsx               play/pause button for audio URL
│   └── insights/
│       ├── InsightCard.tsx                 stat chips + narrative + InsightPlayer
│       └── DeterministicStats.tsx          stat chips only (rendered independently)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       createBrowserClient()
│   │   └── server.ts                       createServerClient() (cookies)
│   ├── ai/
│   │   ├── insightEngine.ts                ABSTRACTION — auto-selects mock or LLM mode
│   │   ├── computeStats.ts                 deterministic stat queries (always runs)
│   │   ├── mockNarrativeGenerator.ts       template-based narrative, no API needed
│   │   ├── llmNarrativeGenerator.ts        Claude-backed narrative (used if ANTHROPIC_API_KEY set)
│   │   └── buildInsightPrompt.ts           prompt assembly (used by llmNarrativeGenerator only)
│   ├── voice/
│   │   ├── transcriptParser.ts             ABSTRACTION — auto-selects mock or LLM parser
│   │   ├── mockTranscriptParser.ts         keyword-based extraction, no ANTHROPIC_API_KEY needed
│   │   ├── llmTranscriptParser.ts          Claude extraction (used if ANTHROPIC_API_KEY set)
│   │   ├── elevenLabsSTT.ts                ElevenLabs STT wrapper (required)
│   │   └── elevenLabsTTS.ts                ElevenLabs TTS wrapper (required)
│   ├── calendar/
│   │   └── parseICS.ts                     ical.js wrapper → CalendarEvent[]
│   └── types.ts                            all shared TypeScript types + Zod schemas
├── middleware.ts                           session refresh + redirect guard
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql          complete schema, all tables, RLS, trigger
```

---

## Data Model — Complete SQL

### Full Migration (`supabase/migrations/001_initial_schema.sql`)

```sql
-- PROFILES
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL DEFAULT '',
  timezone        text NOT NULL DEFAULT 'UTC',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- LOG ENTRIES (polymorphic)
CREATE TABLE public.log_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text NOT NULL CHECK (type IN ('meal','workout','bodyweight','mood','reflection')),
  logged_at         timestamptz NOT NULL DEFAULT now(),
  notes             text,
  data              jsonb NOT NULL DEFAULT '{}',
  voice_transcript  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX log_entries_user_logged_at ON public.log_entries (user_id, logged_at DESC);
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_entries_select_own" ON public.log_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "log_entries_insert_own" ON public.log_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "log_entries_update_own" ON public.log_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "log_entries_delete_own" ON public.log_entries FOR DELETE USING (auth.uid() = user_id);

-- HABITS
CREATE TABLE public.habits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_select_own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_insert_own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update_own" ON public.habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_delete_own" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- HABIT LOGS
CREATE TABLE public.habit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id      uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_on  date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_on)
);
CREATE INDEX habit_logs_user_date ON public.habit_logs (user_id, completed_on DESC);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_logs_select_own" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- CALENDAR EVENTS
CREATE TABLE public.calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  location    text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  ics_uid     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ics_uid)
);
CREATE INDEX calendar_events_user_start ON public.calendar_events (user_id, start_at ASC);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_events_select_own" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_insert_own" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_events_delete_own" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- INSIGHTS CACHE (one current insight per user, overwritten on regenerate)
CREATE TABLE public.insights_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_end  date NOT NULL,
  stats_json  jsonb NOT NULL DEFAULT '{}',
  narrative   text NOT NULL,
  audio_url   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_end)
);
ALTER TABLE public.insights_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_select_own" ON public.insights_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_insert_own" ON public.insights_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_update_own" ON public.insights_cache FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_delete_own" ON public.insights_cache FOR DELETE USING (auth.uid() = user_id);
```

### JSONB Field Schemas (enforced by Zod at API boundary)

```typescript
// meal
{ description: string, calories: number | null, protein_g: number | null, meal_type: 'breakfast'|'lunch'|'dinner'|'snack' }

// workout
{ activity: string, duration_min: number, intensity: 'light'|'moderate'|'hard', distance_km: number | null }

// bodyweight
{ weight_kg: number, unit: 'kg'|'lbs' }

// mood
{ score: number (1-10), emotions: string[], energy_level: number (1-10) }

// reflection
{ content: string }
```

---

## Voice Logging Pipeline — Step by Step

### Step 1: User initiates recording
- `VoiceRecorder.tsx` has four states: `idle | recording | processing | result`
- On mic click: call `navigator.mediaDevices.getUserMedia({ audio: true })`
- Start `new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })`
- Set state to `recording`, show pulsing red dot
- Collect `ondataavailable` chunks into array
- Auto-stop after 60 seconds; user can also click stop manually

### Step 2: Audio → transcript (ElevenLabs STT — always)
- On stop: collect chunks → `new Blob(chunks, { type: 'audio/webm' })`
- Set state to `processing`, show spinner
- POST `FormData` with `audio` blob to `/api/voice/stt`
- Route handler calls `elevenLabsSTT(audioBlob)` → transcript string

### Step 3: Transcript → structured entry
- Route handler calls `transcriptParser.parseTranscript(transcript)` — the abstraction
- **If `ANTHROPIC_API_KEY` set:** calls `llmTranscriptParser` (Claude extraction). Falls back to mock if call fails.
- **If no `ANTHROPIC_API_KEY`:** calls `mockTranscriptParser` (keyword matching)
- In LLM mode, Claude is called with:
- **Extraction system prompt:**
  ```
  You are a health log parser. Extract a structured entry from this voice transcript.
  Return ONLY valid JSON with this exact shape:
  {
    "type": "meal" | "workout" | "bodyweight" | "mood" | "reflection",
    "notes": string (optional extra context, can be empty string),
    "logged_at": ISO8601 string or null (if user mentions a time),
    "data": { ...type-specific fields }
  }

  Type-specific data fields:
  - meal: { "description": string, "calories": number|null, "protein_g": number|null, "meal_type": "breakfast"|"lunch"|"dinner"|"snack" }
  - workout: { "activity": string, "duration_min": number, "intensity": "light"|"moderate"|"hard", "distance_km": number|null }
  - bodyweight: { "weight_kg": number, "unit": "kg"|"lbs" }
  - mood: { "score": number 1-10, "emotions": string[], "energy_level": number 1-10 }
  - reflection: { "content": string }

  If type is ambiguous or cannot be determined, use "reflection" with the full transcript as content.
  Never include extra fields. Never wrap in markdown code blocks.
  ```
- Parse JSON from Claude response
- Validate with Zod schema (same schemas as JSONB field schemas above)
- If Zod fails: fall back to `{ type: 'reflection', notes: '', data: { content: transcript } }`

### Step 4: Return to client
- Route handler returns `{ parsedEntry, transcript }` — does NOT write to DB
- `VoiceRecorder.tsx` sets state to `result`
- Renders a confirmation card showing the parsed entry type + fields
- User can edit fields in-place (simple inputs on the card)
- On confirm: passes the entry + `voice_transcript` to `LogEntryForm.tsx` which calls `POST /api/log`

### Step 5: Save to DB
- `POST /api/log` receives `{ type, logged_at, notes, data, voice_transcript }`
- Route handler validates with Zod, inserts into `log_entries`
- Returns saved entry; client shows success toast and resets `VoiceRecorder` to `idle`

### Fallback Handling
- If `getUserMedia` fails (permissions denied): show error "Microphone access required"
- If ElevenLabs STT fails: show error "Could not transcribe audio. Please try again."
- If LLM parsing fails: fall back to `mockParseTranscript` automatically (no error shown to user)
- If mock parsing cannot determine type: default to `reflection` with full transcript as content
- If final `POST /api/log` fails: keep confirmation card visible so user does not lose the entry

---

## Dual-Mode AI System

The app runs fully without any AI API key using deterministic logic and template-based narratives. When API keys are present, it upgrades to real LLM generation. The switch is automatic — no code changes, no feature flags.

### Mode Detection

```typescript
// lib/ai/insightEngine.ts
const LLM_MODE = !!process.env.ANTHROPIC_API_KEY
```

ElevenLabs keys are required and always present — no mode detection needed for STT or TTS. The only runtime switch is whether `ANTHROPIC_API_KEY` is set. This is evaluated server-side only; the browser never knows which mode is active.

### Shared Interface

The only abstraction needed is for narrative generation. Voice (STT and TTS) always uses ElevenLabs and has no fallback path.

```typescript
// lib/ai/insightEngine.ts — single entry point, auto-selects mock or LLM
export async function generateNarrative(
  stats: DashboardStats,
  recentEntries: RecentEntriesContext
): Promise<string>

// lib/voice/transcriptParser.ts — single entry point, auto-selects mock or LLM
export async function parseTranscript(
  transcript: string
): Promise<ParsedLogEntry>
```

`speechSynthesizer.ts` is not needed as an abstraction — ElevenLabs TTS is always called directly from `lib/voice/elevenLabsTTS.ts`.

### Mock Mode (default — no API keys required)

**Narrative generation (`lib/ai/mockNarrativeGenerator.ts`):**

Produces a readable, data-grounded narrative using template sentences selected and filled from `DashboardStats`. No API calls. Always synchronous. Example output:

```
This week you logged {logCounts.meal} meals and completed {workout.count} workouts
totalling {workout.totalMinutes} minutes of exercise. {moodSentence} {habitSentence}
{weightSentence} {suggestion}
```

Template selection rules:
- `moodSentence`: if `mood.avg >= 7` → "Your mood averaged a strong {avg}/10..." | if `mood.avg >= 5` → "Mood was steady at {avg}/10..." | else → "It was a tough week emotionally..."
- `habitSentence`: find top habit by `completedThisWeek`. "Your most consistent habit was {name} with a {streak}-day streak." If no habits: omit.
- `weightSentence`: if `bodyweight.delta < 0` → "You're trending down {delta}kg this week." | if `delta > 0` → "Bodyweight was up {delta}kg." | if no data: omit.
- `suggestion`: one of 5 fixed suggestions chosen by `(week number) % 5` — ensures variety across days without randomness:
  1. "Try to add one more workout next week."
  2. "Consider logging your mood daily for better trend visibility."
  3. "Consistency beats intensity — keep showing up."
  4. "A quick reflection before bed can improve next week's insights."
  5. "Track your protein for a few days to see if it aligns with your goals."

The result is a coherent 3–4 sentence paragraph. Not as nuanced as LLM output, but specific to the user's actual data.

**Voice transcript parsing (`lib/voice/mockTranscriptParser.ts`):**

Uses keyword matching to extract a structured entry from a transcript string. Covers the common demo cases reliably.

```typescript
function mockParseTranscript(transcript: string): ParsedLogEntry {
  const lower = transcript.toLowerCase()

  // Detect type
  const isMeal = /\b(ate|had|meal|breakfast|lunch|dinner|snack|calories|protein)\b/.test(lower)
  const isWorkout = /\b(workout|exercise|run|ran|gym|walk|walked|yoga|swim|cycl|lifted|training)\b/.test(lower)
  const isBodyweight = /\b(weigh|weight|kg|lbs|pounds|kilos|scale)\b/.test(lower)
  const isMood = /\b(feel|feeling|mood|happy|sad|anxious|stressed|tired|energetic|great|awful)\b/.test(lower)

  if (isBodyweight) {
    const numberMatch = transcript.match(/(\d+\.?\d*)\s*(kg|lbs|pounds|kilos)?/)
    return { type: 'bodyweight', notes: '', logged_at: null,
      data: { weight_kg: numberMatch ? parseFloat(numberMatch[1]) : 0, unit: 'kg' } }
  }
  if (isWorkout) {
    const minutes = transcript.match(/(\d+)\s*(min|minute)/)
    const km = transcript.match(/(\d+\.?\d*)\s*k(m|ilometre)?/)
    return { type: 'workout', notes: '', logged_at: null,
      data: { activity: extractActivity(lower), duration_min: minutes ? parseInt(minutes[1]) : 30,
              intensity: extractIntensity(lower), distance_km: km ? parseFloat(km[1]) : null } }
  }
  if (isMeal) {
    const calories = transcript.match(/(\d+)\s*(cal|calorie|kcal)/)
    const protein = transcript.match(/(\d+)\s*(g|gram).*protein|protein.*(\d+)\s*(g|gram)/)
    const mealType = extractMealType(lower)
    return { type: 'meal', notes: '', logged_at: null,
      data: { description: transcript, calories: calories ? parseInt(calories[1]) : null,
              protein_g: protein ? parseInt(protein[1] || protein[3]) : null, meal_type: mealType } }
  }
  if (isMood) {
    const score = transcript.match(/(\d+)\s*(out of|\/)\s*10/)
    return { type: 'mood', notes: '', logged_at: null,
      data: { score: score ? parseInt(score[1]) : 6, emotions: [], energy_level: 5 } }
  }

  // Default: reflection
  return { type: 'reflection', notes: '', logged_at: null, data: { content: transcript } }
}
```

Helper functions (`extractActivity`, `extractIntensity`, `extractMealType`) use simple keyword maps.

**STT:** Always uses ElevenLabs. No browser fallback.

**TTS:** Always uses ElevenLabs. No mock fallback. `InsightPlayer` always has an audio URL after generation.

### LLM Mode (when `ANTHROPIC_API_KEY` is set)

**Narrative generation (`lib/ai/llmNarrativeGenerator.ts`):**

```typescript
async function llmGenerateNarrative(stats, recentEntries): Promise<string> {
  const { system, user } = buildInsightPrompt(stats, recentEntries)
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system,
    messages: [{ role: 'user', content: user }]
  })
  return response.content[0].text
}
```

**Prompt structure (`lib/ai/buildInsightPrompt.ts`):**

System: "You are a personal wellness coach AI. Write 2-3 warm, specific paragraphs from a user's 7-day health data. Reference patterns and correlations. Give one actionable suggestion. Speak directly to the user. Under 250 words. Do not repeat raw numbers."

User message: Stats block + last 5 mood entries + last 3 workout entries + next 3 calendar events. Token budget: ~2,000 tokens.

**Transcript parsing (`lib/voice/llmTranscriptParser.ts`):** Calls Claude with the extraction system prompt (unchanged from original plan). Falls back to mock parser if Claude call fails.

**TTS (`lib/voice/elevenLabsTTS.ts`):** Always calls ElevenLabs (key is required). Uploads MP3 to Supabase Storage, returns public URL.

### `lib/ai/insightEngine.ts` — The Abstraction Layer

```typescript
import { mockGenerateNarrative } from './mockNarrativeGenerator'
import { llmGenerateNarrative } from './llmNarrativeGenerator'

export async function generateNarrative(
  stats: DashboardStats,
  recentEntries: RecentEntriesContext
): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await llmGenerateNarrative(stats, recentEntries)
    } catch {
      // LLM failed — fall back to mock rather than surfacing an error
      return mockGenerateNarrative(stats)
    }
  }
  return mockGenerateNarrative(stats)
}
```

The same pattern applies to `lib/voice/transcriptParser.ts`. TTS has no abstraction — `elevenLabsTTS.ts` is called directly.

### Deterministic Stats (`lib/ai/computeStats.ts`)

Unchanged — always runs via SQL queries regardless of mode.

```typescript
type DashboardStats = {
  periodDays: 7,
  logCounts: Record<LogEntryType, number>,
  mood: { avg: number | null, energyAvg: number | null },
  workout: { count: number, totalMinutes: number },
  bodyweight: { first: number | null, last: number | null, delta: number | null },
  calories: { totalLogged: number, avgProteinPerDay: number | null },
  habits: Array<{
    id: string, name: string, color: string,
    completedThisWeek: number,
    currentStreak: number,
  }>,
  reflectionCount: number,
  upcomingEvents: Array<{ title: string, start_at: string, location: string | null }>
}
```

**Streak computation:** Query all `habit_logs` ordered by `completed_on DESC`. Iterate from today backwards; count consecutive days until a gap.

### TTS Pipeline

1. `/api/insights` POST calls `elevenLabsTTS(narrative)` directly (no abstraction layer)
2. ElevenLabs TTS → Buffer → upload to Supabase Storage → return public URL
3. URL saved as `audio_url` in `insights_cache`
4. `InsightPlayer` renders with the audio URL

### Caching

Identical in both modes:
- `GET /api/insights`: return cached row if `period_end = today` and `created_at > now() - 24h`
- `POST /api/insights`: generate → upsert `insights_cache` with `ON CONFLICT (user_id, period_end) DO UPDATE`
- Stale indicator: check if any `log_entries.created_at > insights_cache.created_at`

### UI — Mode Indicator

Add a small badge to the `InsightCard` header indicating which mode generated the insight:
- Mock mode: "Smart Summary" (neutral label — does not expose implementation detail)
- LLM mode: "AI Insight" with a subtle sparkle icon

The user experience is identical. The badge simply signals quality level.

### UI Separation Table

| What | Computed by | Component | When rendered |
|---|---|---|---|
| Stat chips | `computeStats()` SQL | `DeterministicStats.tsx` | Always, instantly |
| "Generate" button | — | `InsightCard.tsx` | When no cached insight |
| Narrative text | mock or LLM | `InsightCard.tsx` | After generation |
| Play button + audio | ElevenLabs TTS | `InsightPlayer.tsx` | After generation (always present) |
| Stale warning | DB timestamp check | `InsightCard.tsx` | When new data exists after cache |
| Mode badge | env var check | `InsightCard.tsx` | Always visible on insight card |

---

## ICS Integration — Minimal Scope

**What is supported:**
- Upload `.ics` file → parse → store events starting within next 90 days
- Fields extracted: `SUMMARY` (title), `DTSTART`, `DTEND`, `LOCATION`, `DESCRIPTION`, `UID`
- Dedup on `ics_uid` — re-uploading the same file does not create duplicates
- Events displayed as a sorted list on `/calendar`
- Next 3 upcoming events included in AI insight prompt

**What is NOT supported (explicitly excluded):**
- Recurring events (RRULE) — skip any event with RRULE
- Manual event creation or editing
- Deleting individual events (user can only delete all events — not exposed in UI)
- Google Calendar / CalDAV sync
- Past events (events with `DTSTART` before now are ignored)

**Library:** `ical.js` — parse ICS string, iterate `VCALENDAR > VEVENT` components.

**`parseICS.ts` contract:**
```typescript
function parseICS(icsString: string): CalendarEvent[]
// Returns only future events (start_at > now) within 90 days
// Skips VEVENTs with RRULE
// Maps DTSTART/DTEND → UTC timestamptz strings
// Returns [] on parse failure (does not throw)
```

---

## Environment Variables

| Variable | Required | Effect if absent |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | App won't start |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | App won't start |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Not used in MVP |
| `ELEVENLABS_API_KEY` | Yes | Voice input and audio playback will not work |
| `ELEVENLABS_VOICE_ID` | Yes | TTS will not work |
| `ANTHROPIC_API_KEY` | No | Mock template narrative used instead of LLM; voice transcript parsed by keyword matcher |

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

---

## Phase 1: Foundation

**Start state:** Empty repo (only README.md).
**End state:** Auth-gated Next.js app running on Vercel. User can sign up, log in, see placeholder dashboard. All DB tables created with RLS.

**Prerequisite check:** Before starting, confirm Pre-implementation Steps A and B are complete. The following env var values are required to be in hand:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Exact Tasks

1. Run `npx create-next-app@latest . --typescript --tailwind --app --src-dir=no --import-alias='@/*'` in the repo root
2. Install dependencies: `npm install @supabase/supabase-js @supabase/ssr zod`
3. Install shadcn/ui: `npx shadcn@latest init` (style: default, base color: slate, CSS variables: yes)
4. Install shadcn components: `npx shadcn@latest add button card input label toast separator`
5. Create `.env.local` with the 3 Supabase env vars (from Step A above). Leave ElevenLabs and Anthropic keys as empty placeholders — they are not needed until Phase 3.
6. Create `supabase/migrations/001_initial_schema.sql` — full SQL from the Data Model section above
7. Apply migration: copy the full SQL from `001_initial_schema.sql`, paste into Supabase Dashboard → SQL Editor → Run
8. Create `lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`
9. Create `lib/supabase/server.ts` — `createServerClient` using `next/headers` cookies
10. Create `middleware.ts` — refresh session + redirect unauthenticated requests from `/(dashboard)/.*` to `/login`
11. Create `lib/types.ts` — all TypeScript types and Zod schemas for all 5 log types, Habit, HabitLog, CalendarEvent, DashboardStats, InsightCache
12. Create `app/(auth)/login/page.tsx` — email/password login form using `supabase.auth.signInWithPassword`, redirect to `/dashboard` on success
13. Create `app/(auth)/signup/page.tsx` — signup form using `supabase.auth.signUp`, redirect to `/dashboard` on success
14. Create `app/page.tsx` — server component that checks session and redirects to `/dashboard` or `/login`
15. Create `app/(dashboard)/layout.tsx` — renders `Sidebar` + main content area
16. Create `components/layout/Sidebar.tsx` — nav links to: Dashboard, Log, Habits, Calendar
17. Create `components/layout/TopNav.tsx` — page title + logout button
18. Create `app/(dashboard)/dashboard/page.tsx` — placeholder: "Welcome to AI Life Dashboard" card
19. Create `app/(dashboard)/log/page.tsx` — placeholder card
20. Create `app/(dashboard)/habits/page.tsx` — placeholder card
21. Create `app/(dashboard)/calendar/page.tsx` — placeholder card
22. Push to GitHub. Go to Vercel project (created in Step B) → Settings → Environment Variables. Add:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    Then trigger a deployment from the Vercel dashboard.
23. Install Playwright: `npm install -D @playwright/test dotenv`
24. Run `npx playwright install chromium`
25. Create `playwright.config.ts` — config from the Testing Strategy section above
26. Create `.env.test.local` with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` (gitignore this file)
27. Create the test user manually in Supabase Auth dashboard (`test@aidashboard.dev` / `TestPassword123!`)
28. Create `tests/helpers/auth.ts` — `loginAsTestUser` helper
29. Create `tests/helpers/mocks.ts` — `setupApiMocks` function wrapping all `page.route()` calls
30. Create `tests/auth.spec.ts` — Test 1 (redirect + login + dashboard access)
31. Add `"test:e2e"` and `"test:e2e:ui"` scripts to `package.json`
32. Run `npm run test:e2e` — verify Test 1 passes before ending Phase 1

### Deliverables
- `package.json` with all deps including `@playwright/test`
- `supabase/migrations/001_initial_schema.sql`
- `lib/supabase/client.ts`, `lib/supabase/server.ts`
- `middleware.ts`
- `lib/types.ts` (complete — all types defined once here)
- `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`
- `app/page.tsx`
- `app/(dashboard)/layout.tsx` + all 4 placeholder pages
- `components/layout/Sidebar.tsx`, `components/layout/TopNav.tsx`
- `playwright.config.ts`
- `tests/helpers/auth.ts`, `tests/helpers/mocks.ts`
- `tests/auth.spec.ts` — passing
- Working Vercel deployment URL

### Acceptance Criteria
- [ ] Unauthenticated visit to `/dashboard` redirects to `/login`
- [ ] User can sign up → auto `profiles` row created → lands on `/dashboard`
- [ ] User can log out → redirected to `/login`
- [ ] `/dashboard` loads with sidebar showing 4 nav links
- [ ] All 5 DB tables visible in Supabase Studio with RLS enabled
- [ ] Public Vercel URL responds with 200
- [ ] `npm run test:e2e` runs and Test 1 (auth.spec.ts) passes

---

## Phase 2: Core Logging + Mock AI

**Start state:** Phase 1 complete. Auth works. DB schema exists. Placeholder UI.
**End state:** User can log all 5 entry types via text form. Dashboard shows real data. Habits CRUD and check-in work. Mock AI insight generation and mock voice parsing both work without any API keys.

### Exact Tasks

1. Create `app/api/log/route.ts`:
   - `POST`: validate body with Zod (type + data), insert into `log_entries` using server Supabase client, return inserted row
   - `DELETE`: accept `?id=uuid`, delete matching row where `user_id = auth.uid()`

2. Create `app/api/habits/route.ts`:
   - `GET`: return all active habits for auth user with today's `habit_logs` joined
   - `POST`: create habit (name, color)
   - `DELETE`: accept `?id=uuid`, soft delete (set `is_active = false`)

3. Create `app/api/habits/check/route.ts`:
   - `POST`: body `{ habit_id, completed_on, action: 'complete'|'undo' }`
   - `complete`: `INSERT INTO habit_logs ... ON CONFLICT (habit_id, completed_on) DO NOTHING`
   - `undo`: `DELETE FROM habit_logs WHERE habit_id = ? AND completed_on = ? AND user_id = auth.uid()`

4. Create `components/logging/LogTypeFields.tsx`:
   - Renders different fields based on `type` prop
   - `meal`: description (text), meal_type (select), calories (number), protein_g (number)
   - `workout`: activity (text), duration_min (number), intensity (select), distance_km (number)
   - `bodyweight`: weight_kg (number), unit (select: kg/lbs)
   - `mood`: score (slider 1-10), energy_level (slider 1-10), emotions (multi-select or comma-input)
   - `reflection`: content (textarea)

5. Create `components/logging/LogEntryForm.tsx`:
   - Type selector tabs (meal | workout | bodyweight | mood | reflection)
   - Renders `LogTypeFields` for selected type
   - Optional notes textarea
   - Optional logged_at datetime-local input (defaults to now)
   - On submit: `POST /api/log`, show success toast, reset form
   - Accepts optional `prefill` prop (for voice confirmation)

6. Create `components/logging/RecentLogList.tsx`:
   - Receives log entries as props
   - Renders each entry: type badge (colored), formatted timestamp, summary line per type
   - Meal: "description — Xcal" | Workout: "activity — Xmin" | Bodyweight: "Xkg" | Mood: "X/10" | Reflection: first 80 chars of content
   - Delete button per entry
   - If `voice_transcript` present: collapsible "Voice input" section showing transcript text

7. Update `app/(dashboard)/log/page.tsx`:
   - Renders `LogEntryForm`
   - Below form: last 10 entries via `RecentLogList` (fetched server-side)

8. Create `components/habits/HabitCard.tsx`:
   - Shows habit name + color dot
   - Checkbox for today's completion status
   - Shows current streak: "X-day streak" (computed from `habit_logs`)
   - On checkbox toggle: `POST /api/habits/check` (optimistic update)
   - Delete button

9. Create `components/habits/TodayHabitChecklist.tsx`:
   - Renders list of `HabitCard` for all active habits
   - New habit form: name input + color picker (6 preset hex options) + add button

10. Update `app/(dashboard)/habits/page.tsx`:
    - Server-fetches habits + today's logs
    - Renders `TodayHabitChecklist`

11. Update `app/(dashboard)/dashboard/page.tsx`:
    - Server-fetches: last 20 log entries, all active habits + today's habit_logs
    - Renders: welcome greeting with user's `display_name`
    - Renders: `TodayHabitChecklist` (compact, no add form — link to /habits)
    - Renders: `RecentLogList` (last 5 entries, no delete button — link to /log)
    - Placeholder insight card (Phase 4)

After implementing logging and habit functionality, implement mock AI:

11. Create `lib/ai/computeStats.ts` — all deterministic stat queries (needed by both mock and LLM modes)
12. Create `lib/ai/mockNarrativeGenerator.ts` — template-based narrative using `DashboardStats`. No API calls. See template rules in the Dual-Mode AI System section.
13. Create `lib/ai/insightEngine.ts` — checks `ANTHROPIC_API_KEY`. If absent, calls `mockGenerateNarrative`. If present (Phase 4 will add LLM branch), calls LLM. For now: always calls mock.
14. Create `lib/voice/mockTranscriptParser.ts` — keyword-based extraction from transcript string. See implementation in Dual-Mode AI System section.
15. Create `lib/voice/transcriptParser.ts` — abstraction. For now: always calls `mockParseTranscript`. Phase 3 adds LLM branch.
16. Create `app/api/voice/stt/route.ts` — accepts audio blob (multipart). Routes to `transcriptParser.ts`. Returns `{ parsedEntry, transcript }`. Does NOT save to DB. Returns 500 if ElevenLabs STT is not yet available (Phase 3 wires it in fully; this stub validates the route shape).
19. Create `app/api/insights/route.ts` — GET (cached) + POST (generate). POST calls `computeStats` → `insightEngine.generateNarrative` → `speechSynthesizer.synthesizeSpeech` → upsert `insights_cache`.
20. Create `components/insights/DeterministicStats.tsx` — stat chips from `DashboardStats` prop
21. Create `components/insights/InsightCard.tsx` — stat chips + generate button + narrative + mode badge + `InsightPlayer`
22. Create `components/voice/InsightPlayer.tsx` — only renders when `audioUrl` is non-null
23. Update `/dashboard` page to fetch stats + cached insight, render `InsightCard`
24. Create `tests/logging.spec.ts` — Test 2: create a meal log entry via form, verify success toast
25. Create `tests/dashboard.spec.ts` — Test 3: create entry on `/log`, navigate to `/dashboard`, verify entry visible
26. Run `npm run test:e2e` — all 3 tests must pass before ending Phase 2

### Deliverables
- `app/api/log/route.ts`
- `app/api/habits/route.ts`
- `app/api/habits/check/route.ts`
- `app/api/voice/stt/route.ts`
- `app/api/voice/mode/route.ts`
- `app/api/insights/route.ts`
- `lib/ai/computeStats.ts`
- `lib/ai/mockNarrativeGenerator.ts`
- `lib/ai/insightEngine.ts` (mock-only at this stage)
- `lib/voice/mockTranscriptParser.ts`
- `lib/voice/transcriptParser.ts` (mock-only at this stage)
- `components/logging/LogTypeFields.tsx`, `LogEntryForm.tsx`, `RecentLogList.tsx`
- `components/habits/HabitCard.tsx`, `TodayHabitChecklist.tsx`
- `components/insights/DeterministicStats.tsx`, `InsightCard.tsx`
- `components/voice/InsightPlayer.tsx`
- Updated: all 3 dashboard pages
- `tests/logging.spec.ts`, `tests/dashboard.spec.ts` — passing

### Acceptance Criteria
- [ ] Can log one entry of each of the 5 types; entry appears in `RecentLogList`
- [ ] Can delete a log entry
- [ ] Can create/toggle/delete habits; checklist persists across refresh
- [ ] Dashboard shows real Supabase data
- [ ] "Generate Insight" works without `ANTHROPIC_API_KEY` — returns a mock narrative with real data
- [ ] Mock narrative contains actual user data (references real numbers from stats)
- [ ] Stat chips render independently of insight generation
- [ ] `/api/insights` GET returns cached insight if it exists
- [ ] Play button does not appear (ElevenLabs TTS not wired until Phase 4)
- [ ] All API routes return 401 without a valid session
- [ ] All 3 E2E tests pass

---

## Phase 3: Voice Input

**Start state:** Phase 2 complete. Mock AI works. Text logging works.
**End state:** User can speak to log any entry type. ElevenLabs handles STT. Transcript is parsed via mock keyword matcher (or LLM if `ANTHROPIC_API_KEY` is set). Confirmation card allows editing before save.

**ElevenLabs keys required before starting this phase** (Step C of pre-implementation setup).

### Exact Tasks

1. Create `lib/voice/elevenLabsSTT.ts`:
   - `async function transcribeAudio(audioBlob: Blob): Promise<string>`
   - Builds `FormData` with `file` = audio blob, `model_id` = `"scribe_v1"`
   - `fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! }, body: formData })`
   - Returns transcript string. Throws if response is not ok.

2. Create `lib/voice/llmTranscriptParser.ts`:
   - `async function llmParseTranscript(transcript: string): Promise<ParsedLogEntry>`
   - Calls `anthropic.messages.create` with `claude-sonnet-4-6`, max_tokens 512, extraction system prompt
   - Validates response with Zod. On failure: returns `{ type: 'reflection', notes: '', logged_at: null, data: { content: transcript } }`

3. Update `lib/voice/transcriptParser.ts` — add LLM branch:
   ```typescript
   export async function parseTranscript(transcript: string): Promise<ParsedLogEntry> {
     if (process.env.ANTHROPIC_API_KEY) {
       try { return await llmParseTranscript(transcript) } catch { /* fall through */ }
     }
     return mockParseTranscript(transcript)
   }
   ```

4. Update `app/api/voice/stt/route.ts`:
   - `POST`: receives `multipart/form-data` with `audio` field (Blob)
   - Calls `transcribeAudio(audioBlob)` → transcript string
   - Calls `parseTranscript(transcript)` → `ParsedLogEntry`
   - Returns `{ parsedEntry, transcript }` — does NOT write to DB
   - Returns 500 if ElevenLabs call fails

5. Create `components/voice/VoiceRecorder.tsx`:
   - Four UI states: `idle | recording | processing | result`
   - `idle`: mic button (outlined)
   - `recording`: pulsing red dot + "Recording..." + stop button. CSS `animate-pulse`. Auto-stop at 60s.
   - `processing`: spinner + "Processing..."
   - `result`: confirmation card
   - Uses `MediaRecorder` with `mimeType: 'audio/webm;codecs=opus'`; collect chunks via `ondataavailable`, assemble on `onstop`
   - POST audio Blob as `FormData` to `/api/voice/stt`
   - On response: set state to `result`, store `parsedEntry` and `transcript`
   - **Confirmation card:** type badge + editable `LogTypeFields` + notes + collapsible transcript + "Save Entry" + "Discard"
   - "Save Entry": `POST /api/log` with `{ ...parsedEntry, voice_transcript: transcript }`. On success: toast + reset to `idle`.
   - "Discard": reset to `idle`
   - Permission denied: inline error "Microphone access required", stay `idle`

6. Update `components/layout/TopNav.tsx`:
   - Render `<VoiceRecorder />` in top-right, accessible from any dashboard page
   - Confirmation card renders as a modal overlay

7. Update `app/(dashboard)/log/page.tsx`:
   - Add tip callout: "Use the microphone button in the top bar to log by voice"

### Deliverables
- `lib/voice/elevenLabsSTT.ts`
- `lib/voice/llmTranscriptParser.ts`
- Updated: `lib/voice/transcriptParser.ts` (LLM branch wired in)
- Updated: `app/api/voice/stt/route.ts`
- `components/voice/VoiceRecorder.tsx`
- Updated: `components/layout/TopNav.tsx`

### Acceptance Criteria
- [ ] Saying "I had a chicken salad for lunch, about 450 calories" → confirmation card: type=meal, description=chicken salad, calories=450
- [ ] Saying "Did a 30 minute moderate run" → type=workout, duration_min=30, intensity=moderate
- [ ] Ambiguous input → type=reflection with full transcript as content
- [ ] Entry saved with `voice_transcript` populated
- [ ] Confirmation card allows editing fields before save
- [ ] `ELEVENLABS_API_KEY` and `ANTHROPIC_API_KEY` never sent to browser
- [ ] Permission denied → user-friendly inline error

---

## Phase 4: LLM + TTS Upgrade

**Start state:** Phase 3 complete. Mock AI and voice both work end-to-end.
**End state:** When `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` are present, the system auto-upgrades to LLM narratives and spoken audio. Mock mode continues working when keys are absent. Both modes use the same components and API routes.

### Exact Tasks

1. Create `lib/ai/buildInsightPrompt.ts`:
   - `function buildInsightPrompt(stats: DashboardStats, recentEntries: RecentEntriesContext): { system: string, user: string }`
   - System prompt: wellness coach, 2-3 paragraphs, actionable suggestion, under 250 words, second person
   - User message: stats block + last 5 mood entries + last 3 workout entries + next 3 calendar events
   - Token budget: ~2,000 tokens max

2. Create `lib/ai/llmNarrativeGenerator.ts`:
   - `async function llmGenerateNarrative(stats, recentEntries): Promise<string>`
   - Calls `anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 500, ... })`
   - Returns `response.content[0].text`

3. Update `lib/ai/insightEngine.ts` — add LLM branch:
   ```typescript
   export async function generateNarrative(stats, recentEntries): Promise<string> {
     if (process.env.ANTHROPIC_API_KEY) {
       try { return await llmGenerateNarrative(stats, recentEntries) } catch { /* fall through */ }
     }
     return mockGenerateNarrative(stats)
   }
   ```

4. Create `lib/voice/elevenLabsTTS.ts`:
   - `async function synthesizeWithElevenLabs(text: string): Promise<Buffer>`
   - POST to `https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}`
   - Body: `{ text, model_id: 'eleven_turbo_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }`
   - Returns `Buffer.from(await response.arrayBuffer())`

5. Create Supabase Storage bucket `insight-audio`:
   - Via Supabase Dashboard: Storage → New bucket → name: `insight-audio`, Public: on
   - Or SQL: `INSERT INTO storage.buckets (id, name, public) VALUES ('insight-audio', 'insight-audio', true);`

6. Update `app/api/insights/route.ts` POST pipeline:
   1. `computeStats(userId, supabase)` → stats
   2. Fetch last 5 mood + last 3 workout entries for context
   3. `generateNarrative(stats, recentEntries)` → narrative (auto: mock or LLM)
   4. `synthesizeWithElevenLabs(narrative)` → audioBuffer (always called — ElevenLabs required)
   5. Upload buffer to Supabase Storage: `insight-audio/{userId}/{Date.now()}.mp3`
   6. Get public URL via `supabase.storage.from('insight-audio').getPublicUrl(path)`
   7. Upsert `insights_cache`: `{ narrative, audio_url, stats_json: stats, insight_mode: process.env.ANTHROPIC_API_KEY ? 'llm' : 'mock' }`

7. Add `insight_mode` column to `insights_cache` — run in Supabase SQL editor:
   ```sql
   ALTER TABLE public.insights_cache ADD COLUMN insight_mode text NOT NULL DEFAULT 'mock';
   ```

8. Update `components/insights/InsightCard.tsx` — use `insight_mode` for mode badge:
   - `insight_mode === 'llm'` → badge "AI Insight"
   - `insight_mode === 'mock'` → badge "Smart Summary"

9. Verify `InsightPlayer` renders correctly with the real audio URL

### Deliverables
- `lib/ai/buildInsightPrompt.ts`
- `lib/ai/llmNarrativeGenerator.ts`
- Updated: `lib/ai/insightEngine.ts` (LLM branch wired in)
- `lib/voice/elevenLabsTTS.ts`
- Updated: `app/api/insights/route.ts`
- `insights_cache` table updated with `insight_mode` column
- Supabase Storage bucket `insight-audio` created

### Acceptance Criteria

**Without `ANTHROPIC_API_KEY` (mock narrative + ElevenLabs TTS):**
- [ ] "Generate Insight" → template narrative containing real user data
- [ ] ElevenLabs speaks the narrative; play button appears and audio plays
- [ ] Mode badge shows "Smart Summary"
- [ ] Cached result returned on same-day re-request (no new API calls)

**With `ANTHROPIC_API_KEY` (LLM narrative + ElevenLabs TTS):**
- [ ] LLM narrative references specific user data
- [ ] ElevenLabs speaks the LLM narrative; play button appears and audio plays
- [ ] MP3 exists in Supabase Storage `insight-audio` bucket
- [ ] Mode badge shows "AI Insight"

**All modes:**
- [ ] Stat chips render before and independently of insight generation
- [ ] Cache hit on same-day regeneration (no new API calls)
- [ ] Stale warning appears when new `log_entries` exist after last insight
- [ ] If LLM call fails, falls back to mock narrative and TTS still runs on fallback text
- [ ] All API calls server-side only

---

## Phase 5: Calendar + Polish

**Start state:** Phase 4 complete. Full AI insight pipeline works.
**End state:** ICS import works. Demo Mode seeds data. UI is polished and demo-ready.

### Exact Tasks

1. Install `ical.js`: `npm install ical.js`

2. Create `lib/calendar/parseICS.ts`:
   - `function parseICS(icsString: string): Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>[]`
   - Parse with `ICAL.parse(icsString)` + `new ICAL.Component(parsed)`
   - Iterate `VCALENDAR.getAllSubcomponents('vevent')`
   - Skip any vevent with `RRULE` property
   - Extract: `SUMMARY` → title, `DTSTART` → start_at (convert to UTC ISO string), `DTEND` → end_at, `LOCATION` → location, `DESCRIPTION` → description, `UID` → ics_uid
   - Filter: only events where `start_at > now()` and `start_at < now() + 90 days`
   - Return `[]` if parse throws

3. Create `app/api/calendar/route.ts`:
   - `GET`: return `calendar_events` where `user_id = auth.uid()` and `start_at > now()`, order by `start_at ASC`, limit 20
   - `POST`: receive ICS file as `multipart/form-data` with key `file`
     - Read file text, call `parseICS(text)`
     - Upsert each event: `INSERT INTO calendar_events (...) ON CONFLICT (user_id, ics_uid) DO UPDATE SET title=EXCLUDED.title, start_at=EXCLUDED.start_at, ...`
     - Return `{ imported: number, skipped: number }`

4. Create `components/calendar/ICSUploader.tsx`:
   - File input (`.ics` only) + "Import Calendar" button
   - On submit: POST FormData to `/api/calendar`
   - Shows result: "Imported 12 events" or error message
   - No drag-and-drop (keep simple)

5. Update `app/(dashboard)/calendar/page.tsx`:
   - Server-fetch upcoming events
   - Render `ICSUploader` at top
   - Render events as a simple list: date/time + title + location (if present)
   - Empty state: "No upcoming events. Import a .ics calendar file to get started."

6. Update `lib/ai/buildInsightPrompt.ts`:
   - `computeStats` already includes `upcomingEvents` — ensure they are included in the prompt's UPCOMING EVENTS section (already specified, verify implementation)

7. Create `app/api/seed/route.ts` (Demo Mode):
   - `POST`: seeds 7 days of realistic sample data for auth user
   - Inserts: 14 meal entries, 3 workout entries, 4 mood entries, 2 reflections, 2 bodyweight entries
   - Uses hardcoded realistic data (see sample data below)
   - Idempotent: delete existing log_entries before inserting seed data (only entries from last 8 days)
   - Returns `{ seeded: number }`

8. Add "Demo Mode" button to `app/(dashboard)/dashboard/page.tsx`:
   - Visible only in development OR if a `NEXT_PUBLIC_DEMO_MODE=true` env var is set
   - Calls `POST /api/seed`, then refreshes the page
   - Label: "Seed Demo Data"

9. Add loading skeletons:
   - `RecentLogList`: show 3 skeleton rows while loading
   - `InsightCard`: show skeleton stat chips + placeholder narrative area while loading
   - `TodayHabitChecklist`: show 3 skeleton rows while loading
   - Use `shadcn/ui Skeleton` component

10. Add empty states:
    - `RecentLogList`: "No entries yet. Log your first entry above."
    - `TodayHabitChecklist`: "No habits yet. Add your first habit below."
    - `/calendar`: as defined in step 5

11. Error handling:
    - Wrap all API calls in try/catch; return `{ error: string }` with appropriate HTTP status
    - All client components show inline error messages (not raw console errors)
    - `/dashboard` page: if stats query fails, show empty `DeterministicStats` (all zeros) rather than crashing

12. Final Vercel deployment check:
    - Confirm all env vars are set in Vercel dashboard
    - Confirm Supabase Storage bucket exists with public policy
    - Test complete demo flow on the production URL

**Sample seed data (for `/api/seed`):**
- 7 days of meals: oatmeal breakfast, salad lunch, chicken dinner, etc. with realistic calories/protein
- 3 workouts: running (35min, moderate), gym (50min, hard), yoga (30min, light)
- 4 moods: scores [7,5,8,6], varied emotions, energy levels [7,4,8,5]
- 2 reflections: meaningful content about weekly goals
- Bodyweight: two entries showing a small decrease

### Deliverables
- `lib/calendar/parseICS.ts`
- `app/api/calendar/route.ts`
- `app/api/seed/route.ts`
- `components/calendar/ICSUploader.tsx`
- Updated: `app/(dashboard)/calendar/page.tsx`
- Updated: `app/(dashboard)/dashboard/page.tsx` (seed button + skeletons + empty states)
- Error handling across all API routes and client components

### Acceptance Criteria
- [ ] Upload a `.ics` file → events appear in calendar list
- [ ] Re-uploading same `.ics` file does not create duplicate events
- [ ] Upcoming events appear in AI insight narrative when relevant
- [ ] "Seed Demo Data" button fills the dashboard with 7 days of realistic entries
- [ ] After seeding, can immediately click "Generate Insight" and receive a specific narrative
- [ ] All pages show skeleton loaders during data fetch
- [ ] Error states show user-friendly messages (not blank screens or JS errors)
- [ ] Complete demo flow (sign up → voice log → check habit → import calendar → generate insight → play audio) works end-to-end on public Vercel URL

---

## End-to-End Demo Script

Run this manually after Phase 5:

1. Open public Vercel URL → see login page
2. Sign up with new email → land on `/dashboard` (shows empty states)
3. Click "Seed Demo Data" → page reloads with 7 days of data and stat chips
4. Tap mic button in TopNav → say "I just had a protein shake with 30 grams of protein" → confirm meal entry
5. Go to `/habits` → add habit "Meditate" (purple) → check it for today
6. Go to `/calendar` → upload a `.ics` file → verify events appear
7. Return to `/dashboard` → click "Generate Insight" → wait for narrative
8. Click play → hear ElevenLabs voice narrate the weekly summary
9. Log out → redirected to `/login`
