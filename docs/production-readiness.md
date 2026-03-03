# Production Readiness Checklist

This document is the current handoff point for production hardening. If a future agent needs to resume this work, start here.

## Current Readiness Focus

The product now has:
- CI for typecheck, build, tests, and smoke validation
- a mock-device end-to-end smoke harness
- a minimum safe deployment guardrail that makes the current single-instance API requirement explicit

The next recommended phase is desktop security hardening.

## Top 10 Fixes By Impact

1. **CI for API + Web + smoke E2E**: complete
   CI now runs `pnpm -w typecheck`, `pnpm -w lint`, `pnpm -w build`, `pnpm -w test`, `bash scripts/smoke/httpSmoke.sh`, and `bash scripts/smoke/wsSmoke.sh`.

2. **Non-interactive lint**: complete
   Repo lint is now CI-safe and non-interactive. Current enforcement is TypeScript-based (`tsc --noEmit`) because no new network installs were allowed.

3. **Automated tests**: complete (minimum slice)
   The repo now has baseline unit coverage for auth/CSRF, subscription gating, ownership mapping, shared protocol validation, and deployment guardrails.

4. **Remove single-process ambiguity**: complete (minimum-safe version)
   Multi-instance mode is explicitly unsupported today. The API now enforces `DEPLOYMENT_MODE=single_instance` and advertises that constraint in health output.

5. **Health checks verify real dependencies**: complete
   `/health` now performs a DB probe, reports Stripe and desktop release-provider config readiness, and returns `503` when the API is not actually ready.

6. **Desktop security hardening (CSP / allowlists)**: pending
   The desktop app still needs production CSP and IPC tightening.

7. **Release hardening (signing / notarization)**: pending
   Windows code signing and macOS notarization remain open.

8. **Versioning + release hygiene**: pending
   API/web/desktop version sources still need a single source of truth.

9. **Data + incident readiness**: pending
   Backup, rollback, retention, and privacy runbooks are still missing.

10. **Security review of remote-control flows**: pending
    Approval-gating, denial paths, and abuse thresholds still need a dedicated security pass.

## Current Operating Contract

- Run exactly one API instance.
- Treat `DEPLOYMENT_MODE=single_instance` as the only supported mode.
- Do not scale the API horizontally until rate limits and device presence move to shared infrastructure.
- Keep WebSocket and authenticated browser traffic routed consistently through the same API process.

## Recommended Next Iteration

**Iteration 20: Desktop Security Hardening**

Deliverables:
- re-enable desktop CSP with a production-safe policy
- narrow Tauri command/plugin allowlists
- review IPC exposure and document the trust boundary
- add validation steps for desktop security settings in CI or release checks
