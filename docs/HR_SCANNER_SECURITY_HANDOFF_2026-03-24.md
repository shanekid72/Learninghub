# HR Scanner Security Handoff Report

Date: 2026-03-24
Repository: `D:\Projects\Learninghub\Learninghub`
Production hardening commit: `557effd56d8b7fb90d21bebcedcdf55a370679ec`
Supabase migration applied: `supabase/migrations/20260324_hr_interview_integrity_hardening.sql`

## Scope

Reviewed components:
- `apps/hr-scanner`
- public HR candidate routes
- HR upload and pairing APIs
- token generation and validation helpers
- Supabase HR persistence model
- Windows scanner packaging path

Reviewed artifact:
- `apps/hr-scanner/release/LearningHub HR Scanner 0.1.0.exe`
- SHA-256: `DCCE1652FA9575C8E20554BFB1AA17C0357EFFFABBEA58B3ED042E78BED3F992`

## Executive Summary

The original HR scanner implementation was not suitable for security signoff because the telemetry path was bearer-token based, public invite validation returned excess internal data, pairing was not truly one-time, and completed sessions were still mutable.

Those issues have now been remediated in the deployed code path. The scanner and backend now enforce one-time pairing, signed uploads, replay resistance, immutable completion, public-response minimization, trusted-origin restrictions, and stronger Electron renderer hardening.

The remaining material limitation is architectural: this scanner still runs on a candidate-managed Windows device. It is therefore a hardened, low-assurance endpoint control rather than a hardware-attested forensic control. A sufficiently capable local user can still tamper with their own environment.

## Review Method

- Static review of the scanner, HR APIs, public candidate flow, shared token/signing code, and persistence model
- Validation of the hardened scanner packaging path
- Regression testing of the new security invariants
- Supabase migration application and schema verification

Not performed in this pass:
- binary reverse engineering
- EDR bypass testing
- TLS interception testing
- live packet capture
- red-team style local tampering exercise

## Original Findings And Status

### 1. Forgeable scanner telemetry
Original severity: `P1`

Original issue:
- Any holder of a valid invite/upload token could post plain JSON summaries.
- The server had no scanner-bound signature or replay protection.

Remediation:
- Scanner now generates an ECDSA P-256 keypair at pair time.
- Server stores `scanner_public_key` and `scanner_key_fingerprint` on the HR session.
- Upload token is bound to the scanner fingerprint.
- Baseline, heartbeat, and completion uploads are signed.
- Server verifies the signature before accepting the event.
- Server persists and enforces monotonic `scanner_last_sequence`.

Current status:
- materially improved
- replay and blind token-only submission are mitigated
- residual limitation remains because the endpoint itself is still candidate-controlled

### 2. Invite tokens were reusable in the pairing path
Original severity: `P1`

Original issue:
- Used invites could still be paired again.
- Multiple clients could attach to the same session.

Remediation:
- pairing now rejects used, revoked, expired, and non-`invited` sessions
- successful pairing atomically claims the invite and moves the session into paired state

Current status:
- fixed

### 3. Public invite validation leaked internal HR data
Original severity: `P1`

Original issue:
- Public validation returned the broader session model including internal HR-only fields.

Remediation:
- validation moved to `POST`
- public DTO reduced to:
  - candidate name
  - job title
  - scheduled time
  - invite expiry
  - session status

Current status:
- fixed

### 4. Completed sessions remained mutable
Original severity: `P2`

Original issue:
- repeated `completed` uploads could overwrite the final session summary and append duplicate completion events

Remediation:
- server rejects all scanner uploads after the first accepted completion
- completion is now effectively one-way and immutable from the scanner path

Current status:
- fixed

### 5. Token exposure through query-string validation
Original severity: `P2`

Original issue:
- candidate token was sent again via GET query string during validation

Remediation:
- public validation route now accepts a POST body
- page metadata now disables indexing and referrer leakage

Current status:
- fixed for the validation path
- note: the invite token is still present in the candidate URL path by design

### 6. Scanner accepted arbitrary origins and did not enforce HTTPS
Original severity: `P2`

Original issue:
- manual pairing and pasted session links could target arbitrary hosts

Remediation:
- non-localhost pairing now requires HTTPS
- scanner build enforces a trusted LearningHub origin allowlist via `HR_SCANNER_ALLOWED_ORIGINS`
- manual fallback remains allowed only for trusted LearningHub origins

Current status:
- fixed

### 7. Electron hardening gaps
Original severity: `P3`

Original issue:
- renderer sandbox not enabled
- no CSP
- window navigation controls were weak

Remediation:
- `sandbox: true`
- `webSecurity: true`
- `contextIsolation: true`
- `nodeIntegration: false`
- new-window creation denied
- CSP added to scanner HTML

Current status:
- fixed

### 8. Unsigned Windows artifact
Original severity: `P3`

Original issue:
- test packaging path produced an unsigned artifact

Remediation:
- default signed build path retained
- separate unsigned test-build config introduced:
  - `apps/hr-scanner/electron-builder.unsigned.json5`

Current status:
- partially addressed
- unsigned build is acceptable for controlled testing only
- formal release still requires Authenticode signing

## Database Hardening Applied

Added to `public.hr_sessions`:
- `scanner_public_key`
- `scanner_key_fingerprint`
- `scanner_last_sequence`

Migration:
- `supabase/migrations/20260324_hr_interview_integrity_hardening.sql`

Applied status:
- applied successfully to the connected Supabase project

## Validation Evidence

Executed successfully:
- `pnpm test`
- `pnpm scanner:typecheck`
- targeted ESLint on HR/scanner source paths
- hardened scanner unsigned build

Artifact built:
- `apps/hr-scanner/release/LearningHub HR Scanner 0.1.0.exe`
- SHA-256: `DCCE1652FA9575C8E20554BFB1AA17C0357EFFFABBEA58B3ED042E78BED3F992`

Trusted-origin build note:
- scanner test artifact was built with `HR_SCANNER_ALLOWED_ORIGINS=https://learninghub-nine.vercel.app`

## Residual Risk

### 1. Candidate device remains untrusted
This solution does not provide hardware-backed attestation, TPM-backed runtime integrity, or remote attestation of the candidate endpoint. A sophisticated local user can still interfere with their own workstation and potentially bypass or suppress detection logic.

### 2. Scanner is an integrity signal, not a forensic guarantee
The control is suitable as a risk signal for HR review. It should not be positioned as cryptographic proof of candidate behavior.

### 3. Production release signing is still required
For formal distribution and endpoint trust review, the release artifact should be Authenticode-signed using a valid certificate and a build environment that supports the signing toolchain.

## Recommendation

Current recommendation:
- internal testing / controlled rollout: acceptable
- production use as a reviewed HR risk-signal control: acceptable with the residual-risk caveats above
- production use as a high-assurance anti-cheat or forensic enforcement control: not recommended

Required before broad formal release:
- signed Windows artifact
- documented operational policy for how HR interprets scanner findings
- explicit acknowledgment from stakeholders that this is a hardened endpoint signal, not remote attestation

## Reference Documents

- `docs/HR_SCANNER_SECURITY_AUDIT_2026-03-24.md`
- `docs/HR_SCANNER_SECURITY_REMEDIATION_2026-03-24.md`
