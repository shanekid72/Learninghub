# Release Checklist

## Pre-release Gates

- [ ] `pnpm install`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e` (or documented waiver for environment constraints)

## Config and Data

- [ ] `.env.local` matches deployment env contract
- [ ] Supabase schema is up to date with [`supabase/schema.sql`](../supabase/schema.sql)
- [ ] Admin account exists and can access `/admin`
- [ ] `LH_BASE_URL` and `LH_API_KEY` validated against upstream service
- [ ] `RESEND_API_KEY` validated in environment where notification sending is expected
- [ ] `APP_BASE_URL` and `CRON_SECRET` set correctly
- [ ] Scheduler configured to call `/api/cron/assignment-reminders` with `x-cron-secret`

## Manual Smoke Tests

- [ ] Login with allowed email succeeds and redirects to `/hub`
- [ ] Invalid email/domain is rejected
- [ ] `/api/lh/modules` returns 401 without session and 200 with session
- [ ] Module open, mark complete, and completion refresh work
- [ ] Comments create/edit/delete and permission rules work
- [ ] Quiz submit computes score and stores attempt
- [ ] Certificate generation and download work
- [ ] Admin dashboard/charts/reports load real data
- [ ] Admin updates page can publish to team/user/all and create assignments correctly
- [ ] Reminder cron endpoint dry-run returns expected stats for upcoming due assignments
- [ ] CSV exports download for users/modules/quizzes/certificates

## Post-deploy

- [ ] Application health endpoint and main pages are reachable
- [ ] Error logs checked for auth/session failures
- [ ] Error logs checked for Supabase query failures
- [ ] Error logs checked for report export failures
