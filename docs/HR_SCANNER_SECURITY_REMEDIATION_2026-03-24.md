# HR Scanner Security Remediation Status

Date: 2026-03-24

This note is the remediation follow-up to `docs/HR_SCANNER_SECURITY_AUDIT_2026-03-24.md`.

## Fixed in this patch

### 1. One-time invite pairing is now enforced
- Pairing now rejects used, revoked, expired, and non-`invited` sessions.
- A successful pair claim atomically marks the invite as used and binds the session to a scanner identity.
- Re-pairing with the same invite is rejected.

### 2. Scanner uploads are no longer plain bearer-token JSON
- The scanner now generates an ECDSA P-256 identity during pairing.
- The server stores the paired scanner public key and fingerprint on the HR session.
- Baseline, heartbeat, and completion uploads are now signed.
- The upload token is bound to the scanner fingerprint.
- The server verifies the signature before accepting any upload.

### 3. Replay and out-of-order uploads are rejected
- Each signed upload carries a monotonic `sequence`.
- The server persists `scanner_last_sequence`.
- Uploads with duplicate or older sequence numbers are rejected.

### 4. Completed sessions are immutable
- After the first accepted `completed` event, the server rejects any further scanner uploads for that session.
- Completion can no longer be replayed to overwrite `latest_summary` or append duplicate completion events.

### 5. Public invite validation no longer leaks admin-only HR data
- `/api/hr/invite/validate` now accepts a `POST` body instead of a query-string token.
- The public DTO was reduced to candidate name, job title, scheduled time, invite expiry, and session status.
- Candidate email, reviewer notes, review outcome, and admin event data are not exposed on the public route.

### 6. Scanner origin handling is restricted
- The scanner now requires a trusted LearningHub origin allowlist for non-localhost pairing.
- Non-localhost pairing requires HTTPS.
- Manual token fallback is still supported, but only against a trusted LearningHub base URL.

### 7. Electron hardening was increased
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- new-window creation is denied
- a CSP was added to the renderer entry HTML

## Database changes

Added to `public.hr_sessions`:
- `scanner_public_key`
- `scanner_key_fingerprint`
- `scanner_last_sequence`

Migration:
- `supabase/migrations/20260324_hr_interview_integrity_hardening.sql`

## Validation performed

- `pnpm test` passed
- targeted ESLint on HR/scanner source paths passed
- `pnpm scanner:typecheck` passed
- unsigned hardened scanner package built successfully

Artifact:
- `apps/hr-scanner/release/LearningHub HR Scanner 0.1.0.exe`
- SHA-256: `DCCE1652FA9575C8E20554BFB1AA17C0357EFFFABBEA58B3ED042E78BED3F992`

## Residual risk / release notes

### 1. This remains an untrusted-endpoint control
The scanner runs on a candidate-managed Windows machine. These changes materially improve integrity, replay resistance, and public-surface minimization, but they do not create hardware-backed remote attestation. A sufficiently capable local user can still tamper with their own environment.

### 2. Formal release signoff still requires code signing
The hardened scanner was built in unsigned mode for testing. The default signed build path is present, but producing a release-grade signed artifact still requires:
- a valid Windows code-signing certificate
- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- a build environment with the privileges needed for the electron-builder signing toolchain

### 3. Repository-wide typecheck is currently blocked by unrelated qualification work
The HR/scanner changes typecheck and test cleanly in targeted scope, but the full repository `tsc --noEmit` currently fails on separate qualification-module changes that were already in progress in the working tree.
