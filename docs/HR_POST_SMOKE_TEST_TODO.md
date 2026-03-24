# HR Post-Smoke-Test TODO

Date: 2026-03-24
Scope: Follow-up patches to apply after the first successful end-to-end HR interview integrity smoke test.

## UX and Flow

- [ ] Make clipboard writes non-blocking in the HR admin flow.
  The current session-create and fresh-invite actions auto-copy the invite URL and can trigger a browser clipboard permission prompt.
- [ ] If clipboard permission is denied, keep the session creation flow successful and show a clear fallback message instead of surfacing the copy failure as the primary result.
- [ ] Add an explicit manual copy fallback in the admin success state so HR can still retrieve the invite URL without relying on browser clipboard permission.
- [ ] Review whether auto-copy should remain the default behavior or be replaced with an explicit `Copy invite link` action.

## Scanner Release

- [ ] Produce a signed Windows scanner artifact for broad release.
- [ ] Rebuild the scanner artifact against the final approved production origin allowlist if the release host differs from the current test host.

## Validation and Hardening

- [ ] Re-run the HR smoke test after the clipboard UX patch lands.
- [ ] Add a regression test for clipboard-denied behavior in the HR admin invite flow.
- [ ] Confirm the final release notes and security handoff reflect the signed scanner artifact once that build is available.
