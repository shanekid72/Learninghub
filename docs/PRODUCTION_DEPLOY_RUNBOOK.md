# Production Deploy Runbook (Vercel + Supabase)

This runbook is tailored for the current stack in this repo:
- Next.js app deployed on Vercel
- Supabase for data/auth
- Resend for email delivery
- Cron caller for assignment reminders

Use this document as the step-by-step execution plan for each release.

## 1) One-Time Setup

1. Create/connect a Vercel project to this repository.
2. Set all required environment variables in Vercel `Production`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LH_BASE_URL`
   - `LH_API_KEY`
   - `RESEND_API_KEY`
   - `APP_BASE_URL` (for example: `https://your-domain.com`)
   - `CRON_SECRET` (long random string)
   - `AUTH_ALLOWED_EMAIL_DOMAINS`
   - `AUTH_COOKIE_NAME` (default: `lh_session`)
   - `AUTH_COOKIE_SECRET` (long random string)
   - `AUTH_SESSION_TTL_HOURS` (default: `24`)
3. Confirm at least one admin exists in Supabase:
   - `profiles.role = 'admin'`
4. Configure your custom domain in Vercel (if applicable).

## 2) Pre-Deploy (Every Release)

From local workspace:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

If any command fails, stop and fix before deploying.

## 3) Database Rollout (Supabase)

1. Open Supabase SQL Editor for production project.
2. Apply latest schema from `supabase/schema.sql`.
3. Validate key tables/policies exist:
   - `profiles`
   - `module_assignments`
   - `notification_preferences`
   - `analytics_events`
4. Backfill/verify `profiles.team` values for learners.

## 4) Deploy on Vercel

1. Push branch and open PR.
2. Wait for GitHub Actions CI to pass.
3. Validate Vercel Preview deployment:
   - login flow
   - `/hub` access for learner
   - `/admin` access for admin
4. Merge PR to `main`.
5. Confirm Production deployment completes successfully in Vercel.

## 5) Post-Deploy Verification

1. Health endpoint:

```bash
curl -sS https://<your-domain>/api/health
```

Expected: `ok: true` and env checks show required integrations configured.

2. Manual smoke test using `docs/RELEASE_CHECKLIST.md`.
3. Validate admin updates flow:
   - Open `/admin/updates`
   - Publish a test update to a small user set/team
   - Confirm assignment appears in learner hub
4. Validate reminder cron endpoint in dry-run mode:

```bash
curl -sS -H "x-cron-secret: <CRON_SECRET>" "https://<your-domain>/api/cron/assignment-reminders?dryRun=1&days=3"
```

Expected: success payload with non-error stats.

## 6) Scheduler Setup (Required)

Configure a scheduler (any provider) to call:

- Method: `GET` or `POST`
- URL: `https://<your-domain>/api/cron/assignment-reminders?days=3`
- Header: `x-cron-secret: <CRON_SECRET>`
- Frequency: once daily (recommended 08:00 local time)

Run one manual non-dry call after setup to validate:

```bash
curl -sS -X POST -H "x-cron-secret: <CRON_SECRET>" "https://<your-domain>/api/cron/assignment-reminders?days=3"
```

## 7) Rollback Plan

1. In Vercel, promote previous known-good deployment to production.
2. Disable scheduler temporarily to avoid noisy reminder jobs.
3. If issue is data-related, pause admin update publishing until fixed.
4. Triage logs:
   - Vercel function logs (API errors)
   - Supabase logs (query/policy errors)
   - Resend activity (email failures)

## 8) Go/No-Go Criteria

Go live only if all are true:
- CI green
- Production deploy successful
- Health endpoint healthy
- Smoke checklist complete
- Reminder dry-run successful
- No critical errors in logs for at least 15 minutes after deployment
