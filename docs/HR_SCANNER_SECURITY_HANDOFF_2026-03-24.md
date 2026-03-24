# HR Scanner Security Current Status Report

Date: 2026-03-24
Repository: `D:\Projects\Learninghub\Learninghub`
Assessment scope: LearningHub HR interview integrity flow, `apps/hr-scanner`, public HR candidate routes, HR API routes, token handling, Supabase persistence, and Windows scanner packaging
Application security baseline: `557effd56d8b7fb90d21bebcedcdf55a370679ec`
Database hardening migration: `supabase/migrations/20260324_hr_interview_integrity_hardening.sql`
Reviewed artifact: `apps/hr-scanner/release/LearningHub HR Scanner 0.1.0.exe`
Artifact SHA-256: `DCCE1652FA9575C8E20554BFB1AA17C0357EFFFABBEA58B3ED042E78BED3F992`

## Executive Summary

The current HR scanner implementation uses one-time pairing, signed scanner uploads, replay resistance, immutable completion handling, minimized public candidate data exposure, trusted-origin enforcement, and hardened Electron runtime settings.

The platform stores bounded interview-integrity summaries for HR review and does not persist raw process lists, full command lines, or raw network connection dumps in Supabase.

In its current state, this implementation is suitable to operate as a hardened HR risk-signal control with human review. It should not be described as a hardware-attested, forensic-grade, or tamper-proof anti-cheat system because the candidate endpoint remains an untrusted Windows host.

## Current Security Controls

### Pairing and session integrity

- HR interview invites are single-use for scanner pairing.
- Pairing is bound to a single scanner identity for the session.
- Pairing rejects expired, revoked, or previously used invites.

### Scanner identity and upload validation

- The scanner generates an ECDSA P-256 keypair during pairing.
- The server stores the scanner public key and fingerprint on the HR session.
- Baseline, heartbeat, and completion events are signed by the paired scanner identity.
- Upload tokens are bound to the paired scanner fingerprint.

### Replay resistance and state protection

- Each scanner upload carries a monotonic sequence number.
- The server stores the latest accepted sequence and rejects duplicate or older submissions.
- Completed sessions are immutable from the scanner upload path.

### Public surface minimization

- Public invite validation uses a request body instead of query-string validation.
- The public invite response is limited to the candidate-facing fields needed to start the session.
- Reviewer notes, reviewer outcome, candidate email, and internal admin-only session details are not returned by the public route.

### Transport and origin controls

- Non-localhost pairing requires HTTPS.
- The scanner enforces an allowlist of approved LearningHub origins for non-local use.
- The current test artifact was built with `HR_SCANNER_ALLOWED_ORIGINS=https://learninghub-nine.vercel.app`.

### Electron hardening

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- new-window creation is denied
- a renderer Content Security Policy is present

## Data Handling and Privacy Posture

- Supabase persistence is limited to summary counts, flags, timestamps, review data, and event metadata required for HR workflow.
- Raw suspicious process names, full command lines, and raw network-connection dumps remain local to the scanner and are not stored in platform persistence.
- HR tables remain behind Row Level Security, and admin routes enforce authenticated admin access.

## Current Database Status

The hardening migration is applied in the target Supabase project.

`public.hr_sessions` includes:

- `scanner_public_key`
- `scanner_key_fingerprint`
- `scanner_last_sequence`

Verified migration history includes:

- `20260323135243 hr_interview_integrity`
- `20260323135500 hr_interview_integrity_indexes`
- `20260323135618 hr_interview_integrity_policy_cleanup`
- `20260324085923 hr_interview_integrity_hardening`

## Validation Performed

- `pnpm test`
- `pnpm scanner:typecheck`
- targeted ESLint on HR and scanner source paths
- hardened Windows scanner build completed successfully

## Residual Risk

- The scanner runs on a candidate-managed Windows machine. This is an untrusted endpoint by design.
- Signed uploads and session binding materially improve integrity, but they do not provide hardware-backed remote attestation.
- A determined local attacker with control of their own host should still be assumed capable of attempting endpoint tampering.
- The currently generated Windows artifact is suitable for controlled testing and internal evaluation, but broad release should use a code-signed build and controlled release pipeline.

## Current Recommendation

Current posture for security review:

- acceptable as a hardened HR review signal for interview integrity workflows
- acceptable for controlled production use where HR reviewers interpret the signal as part of a broader hiring process
- not appropriate to position as tamper-proof endpoint attestation or forensic-proof evidence collection

Release requirement for broad distribution:

- produce a signed Windows artifact with a valid code-signing certificate
- build and release from a controlled environment with the required signing privileges
