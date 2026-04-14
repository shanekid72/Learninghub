# LearningHub

LearningHub is an internal learning portal built with Next.js (App Router), Supabase, and Tailwind.
It provides:

- Google SSO authentication via Supabase Auth
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
  - Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `AUTH_ALLOWED_EMAIL_DOMAINS`
- Empty module/catalog data:
  - Check `SUPABASE_SERVICE_ROLE_KEY` and seeded `learning_modules` rows
- Email sending fails:
  - Check Gmail SMTP vars (`SMTP_USER`, `SMTP_APP_PASSWORD`, `EMAIL_FROM`) or `RESEND_API_KEY`
- YouTube sync does not import videos:
  - Confirm `YOUTUBE_SYNC_ENABLED=true`
  - Confirm `YOUTUBE_CHANNEL_ID`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REFRESH_TOKEN`
  - Verify the channel owner OAuth token can access the channel uploads playlist
  - Only `unlisted` and embeddable videos are imported in v1
- AI quiz draft generation fails:
  - Confirm `OPENAI_API_KEY` is set
  - Optionally override `OPENAI_QUIZ_MODEL` if you want a different model than `gpt-5-mini`
  - For best results on synced videos, make sure the YouTube upload has captions enabled

## Release

Primary production runbook: [`docs/PRODUCTION_DEPLOY_RUNBOOK.md`](docs/PRODUCTION_DEPLOY_RUNBOOK.md).

Use the checklist in [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before deployment.
Track current readiness in [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md).
Owner responsibilities by phase are in [`docs/PHASE_TASKS.md`](docs/PHASE_TASKS.md).

## Health Check

- `GET /api/health` returns service status and environment check flags.
- Includes YouTube sync readiness flags:
  - `youtubeSyncEnabled`
  - `youtubeChannelId`
  - `youtubeOAuthConfigured`
- Includes quiz generation readiness flag:
  - `openaiQuizConfigured`

## Update Automation

- Admin update publish endpoint: `POST /api/admin/updates/publish`
- Cron reminder endpoint: `GET|POST /api/cron/assignment-reminders` (requires `CRON_SECRET`)

## YouTube Unlisted Sync

LearningHub can import unlisted YouTube uploads from one configured channel into `Admin -> Modules` as draft modules.

### Required environment variables

- `YOUTUBE_SYNC_ENABLED=true`
- `YOUTUBE_CHANNEL_ID=<your youtube channel id>`
- `YOUTUBE_CLIENT_ID=<google oauth client id>`
- `YOUTUBE_CLIENT_SECRET=<google oauth client secret>`
- `YOUTUBE_REFRESH_TOKEN=<refresh token for the channel owner account>`
- `YOUTUBE_SYNC_LOOKBACK_HOURS=168`

### Behavior

- Only `unlisted` and embeddable videos are imported
- Imported videos become `draft` modules with IDs like `yt_<videoId>`
- YouTube owns title/description/thumbnail/duration/video URLs
- Admin owns objective/badges/teams/status/quiz metadata
- New imports notify all admin users by email
- Repeated identical sync failures are deduplicated to avoid alert spam

### Routes

- Admin manual sync: `POST /api/admin/youtube/sync`
- Admin sync status: `GET /api/admin/youtube/sync/status`
- Cron sync: `GET /api/cron/youtube-sync` (requires `CRON_SECRET`)

### Vercel cron

`vercel.json` includes:

- `/api/cron/assignment-reminders` daily

For YouTube sync on Vercel Hobby:

- use the admin manual sync action from `Admin -> Modules`
- or trigger `GET /api/cron/youtube-sync` from an external scheduler

The built-in 15-minute YouTube cron is only suitable for Vercel Pro and above.

## AI Quiz Drafts

LearningHub can generate internal quiz drafts inside the module editor.

### Required environment variables

- `OPENAI_API_KEY=<your openai api key>`
- `OPENAI_QUIZ_MODEL=gpt-5-mini`

### Behavior

- Quiz drafts are generated only when an admin clicks `Generate Quiz Draft`
- For synced YouTube modules, LearningHub first tries to extract captions/transcript text
- If no transcript is available, admins must provide at least 80 words of source notes or transcript text before a draft can be generated
- Cost is constrained by low-cost defaults: `gpt-5-mini`, a capped transcript window, capped admin-note input, and a 3-5 question draft size
- Generated drafts are not auto-saved; admins review and save them in the existing quiz editor
- Certificates are available only for modules with an internal quiz and a passed quiz attempt

## LH Compatibility Upstream

The primary app flow now reads modules, completions, and quizzes directly from Supabase.
If you still need a legacy LearningHub-compatible upstream endpoint for external consumers, you can use:

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
