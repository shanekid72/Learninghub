# Solo Execution Tasks By Phase

This project is being executed by two people only: you (owner/operator) and Codex (implementation).

## Phase 1: Auth and Foundation

### Owner Tasks
- [ ] Set required auth env variables in `.env.local` and deployment envs:
  - `AUTH_COOKIE_SECRET`
  - `AUTH_ALLOWED_EMAIL_DOMAINS`
  - `AUTH_SESSION_TTL_HOURS`
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in runtime environments.
- [ ] Confirm at least one admin profile exists in Supabase (`profiles.role = 'admin'`).
- [ ] Validate login using an allowed email domain and confirm redirect to `/hub`.

### Codex Tasks (already completed)
- Unified auth flow around signed cookie session.
- Refactored protected APIs and admin guards to use unified session context.
- Passed `typecheck`, `lint`, `test`, `build`.

## Phase 2: Assignment Model and Targeted Learning

### Owner Tasks
- [ ] Apply updated schema from [`supabase/schema.sql`](../supabase/schema.sql) in Supabase SQL editor.
- [ ] Backfill `profiles.team` values for real users (required for team assignments).
- [ ] Create initial module assignments in `/admin/assignments`:
  - Team assignments for baseline induction modules
  - Individual assignments for exceptions
- [ ] Validate due dates and active/inactive assignment toggles with real data.

### Codex Tasks (already completed)
- Added `module_assignments` data model, policies, indexes, and types.
- Added admin assignment APIs and `/admin/assignments` page.
- Wired `/api/lh/modules` and hub UI to real assignment metadata (`assigned`, `due_date`).
- Added assignment unit tests and passed full validation gates.

## Phase 3: Hardening and Release

### Owner Tasks
- [ ] Set production-grade env values and confirm `.env.local` parity with deployment.
- [ ] Validate external integrations in target environment:
  - `LH_BASE_URL` and `LH_API_KEY`
  - `RESEND_API_KEY`
- [ ] Configure and secure automation env values:
  - `APP_BASE_URL`
  - `CRON_SECRET`
- [ ] Schedule a cron job to call `GET|POST /api/cron/assignment-reminders` with `x-cron-secret`.
- [ ] Run manual smoke tests listed in [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).
- [ ] Execute UAT signoff for:
  - Learner journey (login -> modules -> completion -> quiz/certificate)
  - Admin journey (dashboard -> assignments -> updates -> reports)
- [ ] Approve go-live after reviewing logs and error dashboards post-deploy.

### Codex Tasks (completed in Phase 3)
- Release hardening updates and `/api/health`.
- Baseline and default E2E readiness validation.
- Admin update publish flow (`/admin/updates`, `/api/admin/updates/publish`).
- Assignment reminder cron endpoint (`/api/cron/assignment-reminders`).
- Release/task documentation with explicit owner handoff actions.

## Decision Rules

- If a task requires secrets, console access, or policy approval, owner executes it.
- If a task is code, schema, tests, automation, docs, or validation tooling, Codex executes it.
