# Single-Instance Deployment Guardrails Design

**Date:** 2026-03-03

## Summary

The current API keeps rate-limit buckets, WebSocket presence, and some orchestration state in process memory. That means multi-instance deployments are not safe yet: requests can land on different nodes and observe different state.

The minimum-safe production fix is to make the current deployment model explicit: this release supports a single API instance only. The code should surface that constraint in health responses, reject explicit multi-instance configuration, and document the requirement clearly.

## Approach Options

### Option 1: Document only

Add README and operations notes saying the API must run as one instance.

Pros:
- Fastest
- No runtime behavior change

Cons:
- Easy to ignore
- Misconfiguration still looks healthy until production issues appear

### Option 2: Explicit single-instance guardrails (recommended)

Add configuration for deployment mode, reject unsupported multi-instance mode at startup, and expose deployment constraints in `/health` and `/admin/health`.

Pros:
- Prevents accidental unsafe scaling
- Makes the current architecture visible to operators and CI
- Small, low-risk change

Cons:
- Does not solve scaling yet

### Option 3: Start Redis-backed coordination now

Move rate limiting and presence to shared infrastructure.

Pros:
- Real path toward horizontal scaling

Cons:
- Larger architectural change
- Requires new infrastructure and more testing

## Chosen Design

Implement Option 2 now.

Add a small deployment helper in the API that:
- defines the supported deployment mode (`single_instance`)
- reports the current runtime contract (`stickySessionsRequired`, `multiInstanceSupported`)
- throws a clear error if `DEPLOYMENT_MODE=multi_instance`

Update `/health` and `/admin/health` to include deployment metadata so operators can see the constraint directly.

## Documentation

Add a production-readiness checklist document that:
- tracks the top 10 production fixes and current status
- marks Iteration 18 complete
- marks this single-instance guardrail work complete
- names the next recommended fix

Update README to state that the API is currently single-instance only.

## Testing

Use TDD:
- add a unit test for the deployment helper that fails before implementation
- verify the helper rejects unsupported multi-instance mode
- run the targeted test, then the repository test suite, typecheck, and lint
