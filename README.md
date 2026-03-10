# LearningHub

LearningHub is an internal learning portal built with Next.js (App Router), Supabase, and Tailwind.
It provides:

- Email-gated authentication
- Learning module browsing and completion tracking
- Comments and quiz attempts
- Certificate generation/download
- Admin analytics and CSV reports

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Tailwind CSS + shadcn/ui components
- Vitest for unit/api logic tests
- Playwright for end-to-end coverage

## Prerequisites

- Node.js 20+
- `pnpm` 10+
- Supabase project with schema from [`supabase/schema.sql`](supabase/schema.sql)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your env file:

```bash
cp .env.example .env.local
```

3. Fill required environment variables in `.env.local`.

4. Run development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

- `pnpm dev` start local dev server
- `pnpm build` production build
- `pnpm start` run built app
- `pnpm lint` run ESLint
- `pnpm typecheck` run TypeScript checks
- `pnpm test` run unit/api logic tests (Vitest)
- `pnpm test:e2e` run Playwright E2E tests

Install Playwright browser binaries once:

```bash
pnpm exec playwright install
```

## Architecture

- `app/`
  - Route pages and API handlers (`app/api/*`)
  - Admin pages (`app/admin/*`)
- `components/`
  - UI and feature components (module modal, comments, quiz, admin widgets)
- `hooks/`
  - Client data hooks for auth/modules/completions
- `lib/`
  - Shared logic (env, auth session utilities, sanitization, analytics, email, Supabase clients)
- `supabase/`
  - SQL schema and policies

## Environment Variables

See [`.env.example`](.env.example) for all required and optional variables.

## CI Expectations

Every change should pass:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
```

## E2E Modes

- Baseline E2E (`tests/e2e/auth-guards.spec.ts`) runs by default and validates auth guards and protected API behavior.
- Full integration E2E (`tests/e2e/full-journey.spec.ts`) is opt-in and requires seeded test data plus env vars:
  - `PLAYWRIGHT_FULL_E2E=1`
  - `E2E_LOGIN_EMAIL`
  - `E2E_MODULE_ID`
  - `E2E_QUIZ_ID`
  - `E2E_CERTIFICATE_ID`
  - `E2E_SUPABASE_COOKIE_HEADER`

## Troubleshooting

- Build fails with missing env:
  - Verify required variables in `.env.local`
- Supabase auth/API routes returning unauthorized:
  - Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and session cookie secret values
- Empty module/completion data:
  - Check `LH_BASE_URL` and `LH_API_KEY`
- Email sending fails:
  - Check Gmail SMTP vars (`SMTP_USER`, `SMTP_APP_PASSWORD`, `EMAIL_FROM`) or `RESEND_API_KEY`

## Release

Primary production runbook: [`docs/PRODUCTION_DEPLOY_RUNBOOK.md`](docs/PRODUCTION_DEPLOY_RUNBOOK.md).

Use the checklist in [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before deployment.
Track current readiness in [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md).
Owner responsibilities by phase are in [`docs/PHASE_TASKS.md`](docs/PHASE_TASKS.md).

## Health Check

- `GET /api/health` returns service status and environment check flags.

## Update Automation

- Admin update publish endpoint: `POST /api/admin/updates/publish`
- Cron reminder endpoint: `GET|POST /api/cron/assignment-reminders` (requires `CRON_SECRET`)

## LH Fallback Upstream

If you do not have an external LearningHub upstream service yet, you can use the built-in compatible endpoint:

- `LH_BASE_URL=https://<your-domain>/api/lh/upstream`
- `LH_API_KEY=<your-random-shared-key>`

This endpoint supports `action=modules`, `action=completions`, and `action=markComplete`.

## Email Providers

This app supports two providers:

- Gmail SMTP (recommended default for quick setup)
  - `EMAIL_PROVIDER=smtp`
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=465`
  - `SMTP_SECURE=true`
  - `SMTP_USER=<your gmail/google-workspace sender>`
  - `SMTP_APP_PASSWORD=<gmail app password>`
  - `EMAIL_FROM=Learning Hub <your-sender@your-domain>`
- Resend (optional fallback)
  - `RESEND_API_KEY=<your-resend-key>`

Delivery order defaults to SMTP first, then Resend fallback.
