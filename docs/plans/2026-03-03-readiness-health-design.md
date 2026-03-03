# Dependency-Aware Health Checks Design

**Date:** 2026-03-03

## Summary

The API currently exposes `/health` as a liveness endpoint only. It does not verify database connectivity or whether required external configuration is present, so load balancers and orchestrators cannot distinguish "process is running" from "system is ready."

The goal is to make `/health` a real readiness signal while keeping it cheap and safe for automated probes.

## Approaches

### Option 1: Keep `/health` shallow, move readiness to `/admin/health`

Pros:
- Minimal change
- No behavior change for public probes

Cons:
- Load balancers still do not have a truthful readiness endpoint

### Option 2: Make `/health` readiness-focused, keep richer diagnostics in `/admin/health` (recommended)

Pros:
- Orchestrators can rely on `/health`
- Public response stays small
- Operators still get richer diagnostics via `/admin/health`

Cons:
- `/health` can now return `503` when dependencies are unavailable

### Option 3: Add separate `/ready` endpoint

Pros:
- Clear separation of liveness and readiness

Cons:
- More surface area
- Unnecessary for the current app size

## Chosen Design

Implement Option 2.

Add a small readiness helper that:
- runs a cheap database probe (`SELECT 1`)
- reports Stripe config presence
- reports desktop release-provider config presence
- combines that with deployment status
- returns a compact readiness report and failure reasons

Then:
- `/health` returns `200` when ready and `503` when not ready
- `/health` includes only a compact `readiness` object
- `/admin/health` includes the same readiness object plus detailed diagnostics and internal counts

## Testing

Use TDD:
- add a failing unit test for the readiness helper
- verify it reports ready when dependencies are present
- verify it reports not-ready with failure reasons when DB or provider config is missing
- re-run build, tests, typecheck, lint, and HTTP smoke

## Documentation

Update:
- protocol docs for `/health` and `/admin/health`
- production readiness checklist to mark item 5 complete and identify the next recommended phase
