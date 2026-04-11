# Phase 5 — User Onboarding

## Context
New users see the dashboard with no guidance. A skippable 3-step wizard after signup introduces the app.

## DB migration required
```sql
-- supabase/migrations/002_onboarding.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
```

## Files to create
| File | Purpose |
|---|---|
| `supabase/migrations/002_onboarding.sql` | Schema migration |
| `app/(auth)/onboarding/page.tsx` | 3-step wizard (client component) |
| `app/api/profile/onboard/route.ts` | PATCH — marks onboarding complete |

## Files to change
| File | Change |
|---|---|
| `lib/types.ts` | Add `onboarded_at: string \| null` to `Profile` interface |
| `app/(dashboard)/layout.tsx` | Redirect unonboarded users to `/onboarding` |

## Completion criteria
- [ ] New user (null `onboarded_at`) redirected to `/onboarding` on any dashboard route
- [ ] Skip on any step marks onboarding done, redirects to `/dashboard`
- [ ] Completing all steps marks onboarding done
- [ ] Returning user (non-null `onboarded_at`) goes straight to dashboard — no redirect loop
- [ ] Migration SQL applies cleanly (`supabase db push`)
- [ ] E2E test `tests/onboarding.spec.ts`: sign up new user → assert redirect to `/onboarding` → click skip → assert `/dashboard` → reload → assert stays on `/dashboard`
