# HR Scanner Security Audit

Date: 2026-03-24
Repository: `D:\Projects\Learninghub\Learninghub`
Scope: `apps/hr-scanner`, public HR candidate flow, HR API routes, token handling, Supabase persistence, Windows packaging
Artifact reviewed: `apps/hr-scanner/release/LearningHub HR Scanner 0.1.0.exe`
Artifact SHA-256: `76F9F98B3C7CD8BD2CB8B398C8414B13ED9C5E47075F1F9B8F59F571743DF074`

## Executive Summary

This implementation is suitable for internal functional testing, but it is not ready for security approval as an interview-integrity control.

The primary issue is not malware or transport exposure. The primary issue is integrity: a technically capable candidate can bypass or manipulate the telemetry because the server trusts unauthenticated client-reported summaries from any holder of the invite or upload token.

## Review Method

- Static code review of the Electron scanner, public HR routes, admin HR routes, token helpers, and Supabase schema.
- Packaging review of the generated Windows scanner artifact and release configuration.
- No binary reverse engineering, host EDR bypass testing, TLS interception test, or live network packet capture was performed in this pass.

## Threat Model

- Candidate device is not trusted.
- Candidate can inspect browser traffic, run custom scripts, or call public APIs directly.
- Invite links and upload tokens are bearer credentials.
- The scanner is intended to provide interview-integrity evidence, so evidence tamper resistance is a core security requirement, not an optional hardening goal.

## Findings

### [P1] Telemetry is fully forgeable by any client holding a valid token

Files:
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L40)
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L134)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L524)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L542)
[app/api/hr/heartbeat/route.ts](/D:/Projects/Learninghub/Learninghub/app/api/hr/heartbeat/route.ts#L7)
[app/api/hr/complete/route.ts](/D:/Projects/Learninghub/Learninghub/app/api/hr/complete/route.ts#L7)

Impact:
- The scanner sends plain JSON summaries to the server.
- The server normalizes and stores those values without any device attestation, scanner signature, nonce chaining, or server-verifiable proof that the scanner actually ran.
- A candidate can call `/api/hr/pair` directly, obtain an upload token, and then submit fabricated low-risk summaries with `curl`, Postman, browser devtools, or a custom script.

Assessment:
- This defeats the core security objective of the feature.
- As implemented, the platform records what the client says happened, not what the scanner can prove happened.

Recommended remediation:
- Introduce a trusted attestation model or accept that this is only a low-assurance policy signal.
- At minimum, bind telemetry to a scanner-generated keypair per session and require signed event envelopes with monotonic sequence numbers and server-issued nonces.
- Treat the current implementation as advisory, not forensic or enforcement-grade.

### [P1] Invite tokens are not one-time in the pairing path

Files:
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L196)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L423)
[app/api/hr/pair/route.ts](/D:/Projects/Learninghub/Learninghub/app/api/hr/pair/route.ts#L7)

Impact:
- `canPairSession()` does not reject `invite.used_at` or active `paired` / `monitoring` sessions.
- `pairHrSession()` only writes `used_at` if it is null, but it still issues a fresh upload token afterward.
- Anyone holding a previously used invite token can call `/api/hr/pair` again and obtain another valid upload token while the session is ongoing.

Assessment:
- This allows multiple clients to attach to the same interview session.
- It enables parallel forged uploads and weakens auditability because telemetry is no longer tied to a single scanner run.

Recommended remediation:
- Reject pairing when `invite.used_at` is already set.
- Reject pairing when the session is already `paired` or `monitoring`.
- Store and validate a single active upload token or upload-token version per session.

### [P1] Public invite-validation API leaks internal HR session data, including review state

Files:
[app/api/hr/invite/validate/route.ts](/D:/Projects/Learninghub/Learninghub/app/api/hr/invite/validate/route.ts#L6)
[app/api/hr/invite/validate/route.ts](/D:/Projects/Learninghub/Learninghub/app/api/hr/invite/validate/route.ts#L21)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L384)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L388)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L392)
[lib/hr/view-models.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/view-models.ts#L13)
[lib/hr/view-models.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/view-models.ts#L22)
[lib/hr/view-models.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/view-models.ts#L23)

Impact:
- The public validation route returns the full `HrInviteValidationResult`.
- That result includes a `session` object with `candidateEmail`, `reviewNotes`, `reviewOutcome`, timestamps, and other internal fields.
- `getHrInviteValidation()` returns that session snapshot even for `reviewed`, `completed`, `paired`, `revoked`, and `expired` states.

Assessment:
- Anyone holding a stale link can query the endpoint and retrieve HR-only metadata that the candidate scanner does not need.
- After review, this can expose internal reviewer outcomes and notes to the bearer of the old invite URL.

Recommended remediation:
- Split public and admin session models.
- Return only the minimal public fields needed for the candidate page, such as job title, candidate name, scheduled time, validity state, and invite expiry.
- Never return `candidateEmail`, `reviewNotes`, `reviewOutcome`, or internal event history from public routes.

### [P2] Completed sessions remain mutable until review or status transition

Files:
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L519)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L542)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L551)
[lib/hr/server.ts](/D:/Projects/Learninghub/Learninghub/lib/hr/server.ts#L566)
[app/api/hr/complete/route.ts](/D:/Projects/Learninghub/Learninghub/app/api/hr/complete/route.ts#L7)

Impact:
- Once a session is `completed`, the server still accepts more `completed` uploads from any holder of the upload token.
- Each accepted upload rewrites `latest_summary`, updates `completed_at`, and appends another `completed` event.

Assessment:
- This allows evidence tampering after the interview has supposedly ended.
- Final-state records are not immutable.

Recommended remediation:
- Make completion idempotent and one-way.
- Reject all uploads after the first accepted `completed` event.
- If post-completion reconciliation is required, use a separate admin-only override path.

### [P2] Invite bearer token is exposed in URL path and duplicated in a public GET query string

Files:
[app/hr/interview/[token]/page.tsx](/D:/Projects/Learninghub/Learninghub/app/hr/interview/[token]/page.tsx#L14)
[app/hr/interview/[token]/page.tsx](/D:/Projects/Learninghub/Learninghub/app/hr/interview/[token]/page.tsx#L19)
[components/hr/interview-access.tsx](/D:/Projects/Learninghub/Learninghub/components/hr/interview-access.tsx#L42)
[components/hr/interview-access.tsx](/D:/Projects/Learninghub/Learninghub/components/hr/interview-access.tsx#L71)
[components/hr/interview-access.tsx](/D:/Projects/Learninghub/Learninghub/components/hr/interview-access.tsx#L147)

Impact:
- The invite token is carried in the candidate URL path.
- The client then sends it again in a GET query string to `/api/hr/invite/validate`.
- The full link is displayed in the page and copied around for scanner fallback and protocol launch.

Assessment:
- This increases exposure to browser history, proxy logs, server logs, screenshots, and user copy/paste leakage.
- The token is a bearer secret, so URL exposure matters.

Recommended remediation:
- Move validation to a POST body.
- Consider using a short opaque lookup key in the URL and keeping the actual secret out of the route path.
- Expire or rotate tokens aggressively after first successful pair.

### [P2] Scanner accepts arbitrary origins and does not enforce HTTPS

Files:
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L4)
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L18)
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L28)
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L46)
[apps/hr-scanner/src/App.tsx](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/src/App.tsx#L134)

Impact:
- The scanner accepts any `url.origin` from pasted links.
- Manual fallback also accepts arbitrary API base URLs.
- No check enforces `https:` or a trusted hostname set.

Assessment:
- A user can be tricked into pairing against an attacker-controlled host.
- Upload tokens and summary telemetry can be sent to plaintext or untrusted endpoints if the session link is manipulated.

Recommended remediation:
- Enforce `https:` except for explicit localhost development builds.
- Add an allowlist for approved LearningHub domains.
- Reject manual pairing to arbitrary origins in production builds.

### [P3] Electron renderer hardening is incomplete

Files:
[apps/hr-scanner/electron/main.ts](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/electron/main.ts#L55)
[apps/hr-scanner/electron/main.ts](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/electron/main.ts#L57)
[apps/hr-scanner/electron/main.ts](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/electron/main.ts#L58)
[apps/hr-scanner/index.html](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/index.html#L3)
[apps/hr-scanner/index.html](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/index.html#L13)

Impact:
- The scanner enables `contextIsolation` and disables `nodeIntegration`, which is good.
- However, the `BrowserWindow` does not enable renderer sandboxing.
- The app HTML has no Content Security Policy.

Assessment:
- This is a defense-in-depth gap rather than a direct exploit shown in the current code.
- If a renderer XSS or dependency compromise is introduced later, blast radius is larger than necessary.

Recommended remediation:
- Enable `sandbox: true` in production.
- Add a strict CSP that permits only local bundled assets and the required API origins.
- Keep the preload API minimal and typed.

### [P3] Current Windows package is unsigned and explicitly disables executable signing/editing

Files:
[apps/hr-scanner/electron-builder.json5](/D:/Projects/Learninghub/Learninghub/apps/hr-scanner/electron-builder.json5#L14)

Impact:
- The current repo configuration produces an unsigned portable EXE.
- This is acceptable for internal smoke testing only.

Assessment:
- It is not appropriate for wide internal distribution or any external candidate-facing release process.
- Security and IT teams will likely require Authenticode signing and provenance controls.

Recommended remediation:
- Restore Windows signing for release builds.
- Separate test-build and release-build configs if local workstation constraints require an unsigned packaging fallback.

## Data Handling Assessment

Positive observations:
- Raw suspicious process names, full commands, and raw network dumps are kept local to the scanner UI.
- Server persistence is bounded to summary counts, flags, timestamps, notes, and event metadata.
- Supabase HR tables are RLS-enabled and the admin routes enforce admin session checks.

Caveat:
- Even though stored evidence is bounded, the current public API model leaks more fields than necessary to unauthenticated token holders.

## Test Coverage Gaps

No tests currently assert:
- pair-token one-time semantics
- upload-token replay rejection after completion
- public API data minimization for candidate routes
- HTTPS-only or origin allowlisting in the scanner
- immutable final session evidence
- Electron hardening expectations such as CSP or sandbox presence

## Recommendation

Current approval status:
- Functional testing: acceptable
- Security approval for production use as an integrity control: not recommended

Minimum remediation set before security signoff:
- fix one-time invite enforcement in `/api/hr/pair`
- remove sensitive fields from public HR responses
- prevent any post-completion evidence mutation
- enforce trusted HTTPS origins in the scanner
- decide whether this control is advisory only or add real telemetry attestation
- restore signed Windows release packaging
