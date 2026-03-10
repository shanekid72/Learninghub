# Release Status

Last updated: 2026-03-05

## Automated Gates

- [x] `pnpm lint` (warnings only, no errors)
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm test:e2e` baseline (`tests/e2e/auth-guards.spec.ts`)
- [x] `pnpm test:e2e` default run (3 passed, 4 integration tests intentionally skipped)
- [ ] `pnpm test:e2e` full integration (requires seeded env + cookies)

## Feature Status

- [x] Unified auth/session guarding across app routes and APIs
- [x] Assignment data model and admin assignment UI
- [x] Assignment-aware learner feed (`assigned`, `due_date`)
- [x] Admin update publish flow (targeted assignment + optional notification email)
- [x] Assignment reminder cron endpoint with dry-run and reminder analytics
- [x] Admin analytics and CSV report exports
- [x] Quiz/comments/certificates APIs behind unified auth checks

## Remaining Manual Owner Tasks

- [ ] Apply latest Supabase schema
- [ ] Confirm env/secrets in target deployment
- [ ] Configure scheduler for `/api/cron/assignment-reminders` with `CRON_SECRET`
- [ ] Run full manual smoke checklist from `docs/RELEASE_CHECKLIST.md`
- [ ] Approve launch after post-deploy log review
