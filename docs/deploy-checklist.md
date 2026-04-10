# Deployment Checklist

Step-by-step guide to deploy AI Life Dashboard to Vercel with a live Supabase backend.

---

## 1. Supabase Setup

### 1a. Create project
- Go to https://supabase.com → sign in → **New Project**
- Set a name, strong DB password, and closest region
- Wait ~2 min for provisioning

### 1b. Apply database schema
- Go to **SQL Editor** in your Supabase project
- Paste and run the full contents of `supabase/migrations/001_initial_schema.sql`
- Then run this additional migration:
  ```sql
  ALTER TABLE public.insights_cache ADD COLUMN IF NOT EXISTS insight_mode text NOT NULL DEFAULT 'mock';
  ```

### 1c. Create storage bucket
- Go to **Storage** → **New bucket**
- Name: `insight-audio`
- Public: **on** (toggle enabled)
- Click **Create bucket**

### 1d. Collect Supabase credentials
From **Project Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (reserved, not currently used)

### 1e. Create auth test user (optional, for E2E tests)
- Go to **Authentication → Users → Add user**
- Email: `test@aidashboard.dev`, Password: `TestPassword123!`

---

## 2. Collect API Keys

### ElevenLabs (required for voice)
- Go to https://elevenlabs.io → sign in → **Profile → API Key**
- Copy key → `ELEVENLABS_API_KEY`
- Go to **Voices** → pick a voice → copy the Voice ID from the URL or sidebar → `ELEVENLABS_VOICE_ID`

### Anthropic (optional — mock mode used if absent)
- Go to https://console.anthropic.com → **API Keys → Create key**
- Copy key → `ANTHROPIC_API_KEY`
- If absent: app uses template-based narratives + keyword-based transcript parsing

---

## 3. Vercel Deployment

### 3a. Push to GitHub
```bash
git push origin main
```

### 3b. Import project
- Go to https://vercel.com → **Add New Project**
- Import your GitHub repo
- Framework preset: **Next.js** (auto-detected)

### 3c. Add environment variables
In Vercel project settings → **Environment Variables**, add:

| Name | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key | Yes |
| `ELEVENLABS_VOICE_ID` | Your ElevenLabs voice ID | Yes |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | No |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | No (shows seed button) |

### 3d. Deploy
- Click **Deploy**
- Wait for build to complete (~1-2 min)
- Copy the deployed URL (e.g. `https://ai-life-dashboard-xxx.vercel.app`)

---

## 4. Post-Deployment Verification

### 4a. Basic auth flow
- [ ] Open deployed URL → redirected to `/login`
- [ ] Sign up with a new email → lands on `/dashboard`
- [ ] Sign out → redirected to `/login`
- [ ] Sign in again → lands on `/dashboard`

### 4b. Text logging
- [ ] Go to `/log` → select "Meal" tab → fill description + calories → click **Save Entry** → toast appears
- [ ] Entry appears in Recent Entries list
- [ ] Delete the entry → it disappears

### 4c. Habit tracking
- [ ] Go to `/habits` → add a habit with a name and color → it appears in the list
- [ ] Check it for today → checkbox fills → streak shows "1-day streak"
- [ ] Refresh page → check state persists

### 4d. Voice logging
- [ ] Click mic button in top bar → microphone permission prompt appears → allow
- [ ] Say "I had oatmeal for breakfast with 300 calories" → processing spinner → confirmation card
- [ ] Confirm entry → "Entry saved" toast → entry appears in dashboard

### 4e. AI insights
- [ ] Go to `/dashboard` → stat chips visible (may show zeros if no data)
- [ ] Click **Generate Insight** → spinner → narrative text appears
- [ ] Play button appears below narrative → click it → audio plays
- [ ] Refresh page → insight still visible (cached)
- [ ] Log a new entry → refresh dashboard → stale warning appears

### 4f. Demo data (if `NEXT_PUBLIC_DEMO_MODE=true`)
- [ ] **Seed Demo Data** button visible on dashboard
- [ ] Click it → page reloads with 7 days of entries and stat chips filled
- [ ] Click **Generate Insight** → specific narrative referencing real data

---

## 5. Troubleshooting

### "Could not transcribe audio"
- Check `ELEVENLABS_API_KEY` is set correctly in Vercel env vars
- Verify the key has available credits in your ElevenLabs account
- Check Vercel function logs for the specific error from ElevenLabs

### "Audio upload failed"
- Verify the `insight-audio` Supabase Storage bucket exists and is set to **Public**
- Check Supabase Storage → Policies — ensure authenticated users can upload

### "Unauthorized" on API routes
- Supabase anon key or URL may be incorrect
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel

### Insight narrative is generic (not referencing your data)
- This is mock mode — add `ANTHROPIC_API_KEY` to Vercel env vars and redeploy for LLM narratives

### Dashboard shows error page
- Check Supabase project is active (free tier projects pause after inactivity)
- Go to https://supabase.com → your project → click **Restore** if paused

---

## 6. Local Development After Deployment

To run locally with production Supabase:

```bash
cp .env.local.example .env.local
# Fill in all values from steps above

npm run dev
```

To run E2E tests:

```bash
cp .env.test.local.example .env.test.local
# Set TEST_USER_EMAIL=test@aidashboard.dev
# Set TEST_USER_PASSWORD=TestPassword123!

npm run test:e2e
```
