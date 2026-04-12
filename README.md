# AI Life Dashboard

AI Life Dashboard is a personal health tracker where you log meals, workouts, bodyweight, mood, and reflections by text or voice, then get a weekly spoken summary from your own data.

Demo loop: log -> store -> analyze -> speak.

## Key Features

- Voice logging with edit-before-save confirmation
  - Record in the browser, transcribe with ElevenLabs STT, parse into structured fields, review, then save.
- Conversational voice assistant
  - Ask questions about your data and draft log entries through a voice/chat assistant flow.
- Structured logging + history
  - Track 5 core entry types: meal, workout, bodyweight, mood, reflection.
  - Browse and manage entries on a dedicated history page.
- Foods and recipes
  - Maintain a custom food library with nutrition values.
  - Build recipes (including sub-recipes) and reuse them in meal logging.
- Habit tracking
  - Daily check-offs with streak calculations.
- AI insights (dual mode)
  - Works without Anthropic: deterministic smart summary.
  - Upgrades automatically with Anthropic key: LLM-generated narrative.
  - Both modes support spoken playback via ElevenLabs TTS.
- Calendar-aware context
  - Import ICS events and include upcoming schedule context in insights.
- Customizable dashboard
  - Toggle/reorder widgets and control detail level for entry cards.
- Analytics tools
  - Bodyweight trend chart, macro pie chart, and weight CSV import/export.

## Current Scope (And What Is Not Supported)

- Supported:
  - Email/password auth, onboarding, dashboard pages, foods/recipes, habits, insights, voice features, ICS import.
- Not supported:
  - Outlook PST import.
  - Recurring ICS events (RRULE) ingestion.
  - Manual calendar event creation/editing in the app.
  - Mobile-native app clients.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| UI | Tailwind CSS v4, shadcn/ui |
| Data/Auth | Supabase Postgres + Auth + Storage + RLS |
| Voice STT | ElevenLabs `scribe_v1` |
| Voice TTS | ElevenLabs `eleven_turbo_v2` |
| AI (optional) | Anthropic `claude-sonnet-4-6` |
| Validation | Zod |
| Charts | Recharts |
| Testing | Playwright E2E |
| Deploy | Vercel |

## Architecture Snapshot

```text
Browser
  - Server Components for data loading
  - Client Components for interaction (forms, recorder, assistant, player)
  - Route Handlers in app/api/*

Supabase
  - Auth (email/password)
  - Postgres (RLS-protected tables)
  - Storage (insight audio)

External APIs (server-side only)
  - ElevenLabs STT + TTS
  - Anthropic (optional)
```

The app uses runtime dual-mode AI:
- No `ANTHROPIC_API_KEY`: template summaries + keyword parsing.
- With `ANTHROPIC_API_KEY`: LLM insights + richer transcript extraction.

## API Surface

### Core logging and dashboard
- `POST, PATCH, DELETE /api/log`
- `POST /api/log/import/weight`
- `GET /api/log/export/weight`
- `GET, POST, DELETE /api/habits`
- `POST /api/habits/check`
- `GET, POST /api/calendar`
- `GET, POST /api/insights`
- `GET /api/health`
- `POST /api/seed`

### Foods and recipes
- `GET, POST, PATCH, DELETE /api/foods`
- `POST /api/foods/recalculate`
- `GET, POST, PATCH, DELETE /api/recipes`
- `POST /api/recipes/recalculate`
- `POST, DELETE /api/recipes/ingredients`

### Voice and assistant
- `POST /api/voice/stt`
- `POST /api/voice/ask`
- `POST /api/voice/session`
- `POST /api/assistant/tool`

### Profile and auth utilities
- `PATCH /api/profile/onboard`
- `POST /api/auth/signout`

## Environment Variables

### Runtime (required)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser anon key |
| `ELEVENLABS_API_KEY` | ElevenLabs STT and TTS |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice used for insights |

### Runtime (optional)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables LLM insight + transcript parsing mode |
| `ELEVENLABS_AGENT_ID` | Enables conversational assistant session endpoint |
| `NEXT_PUBLIC_DEMO_MODE` | Shows seed demo data action in UI |

### Testing (required for Playwright global setup)

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Creates/verifies test user in global setup |
| `TEST_USER_EMAIL` | E2E login identity |
| `TEST_USER_PASSWORD` | E2E login password |

Use [.env.local.example](.env.local.example) as the base runtime template.

## Local Setup

### Prerequisites
- Node.js 18+
- Supabase project
- ElevenLabs API key and voice ID

### 1. Install dependencies

```bash
npm install
```

### 2. Configure runtime env

Bash:

```bash
cp .env.local.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Then fill `.env.local` with required values.

### 3. Apply database migrations

Run migration SQL files in order from [supabase/migrations](supabase/migrations):

1. `001_initial_schema.sql`
2. `002_onboarding.sql`
3. `003_calendar_source.sql`
4. `004_custom_foods.sql`
5. `005_recipes.sql`

### 4. Create storage bucket

In Supabase Storage, create bucket `insight-audio` with public read enabled.

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Running Tests (Playwright)

The E2E suite runs against local `next dev` via Playwright webServer config and uses a global setup that logs in and stores session state.

### 1. Install browser (first time)

```bash
npx playwright install chromium
```

### 2. Create test env file

Create `.env.test.local` with:

```env
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```

Also ensure `.env.local` contains `SUPABASE_SERVICE_ROLE_KEY` for test user bootstrap.

### 3. Run tests

```bash
npm run test:e2e
```

### 4. Open Playwright UI mode

```bash
npm run test:e2e:ui
```

### Useful targeted runs

```bash
npx playwright test tests/auth.spec.ts
npx playwright test --project auth
npx playwright test --project authenticated
```

Notes:
- First run creates `tests/.auth/user.json` from global setup.
- Test artifacts live in `test-results/` and `playwright-report/` and are gitignored.

## Project Structure

```text
app/
  (auth)/                 login/signup
  (dashboard)/            dashboard, log, habits, calendar, history, foods, recipes
  onboarding/             multi-step onboarding flow
  api/                    route handlers (log, habits, calendar, insights, voice, foods, recipes, etc.)

components/
  dashboard/              layout + customization
  logging/                entry forms, recent logs, history UI
  voice/                  recorder, assistant conversation, insight player
  foods/                  food library UI
  recipes/                recipe builder/library UI
  charts/                 bodyweight + macro visualizations

lib/
  ai/                     stats + narrative engines
  voice/                  STT/TTS + transcript parsing
  nutrition/              recipe and macro calculation
  calendar/               ICS parsing
  supabase/               browser/server clients
  types.ts                shared types + zod schemas

tests/
  global.setup.ts         creates/authenticates test user session
  *.spec.ts               end-to-end specs by feature domain
```

## Deployment

For deployment steps and checks, see [docs/deploy-checklist.md](docs/deploy-checklist.md).

## Additional Documentation

- [CLAUDE.md](CLAUDE.md): architecture decisions, constraints, and coding workflow.
- [docs/implementation-plan.md](docs/implementation-plan.md): implementation history and simplifications.