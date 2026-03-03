# Single-Instance Deployment Guardrails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the current single-instance deployment model explicit in code, health output, and docs so operators cannot silently deploy an unsafe multi-instance topology.

**Architecture:** Add a small deployment helper in the API that centralizes deployment-mode validation and health metadata. Wire that helper into config loading and health endpoints, then document the constraint and current production-readiness status in a dedicated checklist/handoff doc.

**Tech Stack:** Node.js, Fastify, TypeScript, node:test, Markdown docs

---

### Task 1: Add a failing deployment-readiness test

**Files:**
- Create: `tests/api-deployment.test.mjs`
- Test: `tests/api-deployment.test.mjs`

**Step 1: Write the failing test**

Add tests that expect a deployment helper module to:
- report `single_instance` as supported with `multiInstanceSupported: false`
- throw a clear error when validating `multi_instance`

**Step 2: Run test to verify it fails**

Run: `node --test tests/api-deployment.test.mjs`
Expected: FAIL because `apps/api/dist/lib/deployment.js` does not exist yet.

### Task 2: Implement deployment guardrails

**Files:**
- Create: `apps/api/src/lib/deployment.ts`
- Modify: `apps/api/src/config.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Write minimal implementation**

Add a helper that:
- exports deployment metadata for health responses
- validates `DEPLOYMENT_MODE`
- throws on `multi_instance` with a clear explanation

Wire config to read `DEPLOYMENT_MODE` with default `single_instance`.

Update `/health` and `/admin/health` to include deployment metadata.

**Step 2: Run test to verify it passes**

Run: `pnpm -w build && node --test tests/api-deployment.test.mjs`
Expected: PASS

### Task 3: Document the operational contract

**Files:**
- Modify: `README.md`
- Create: `docs/production-readiness.md`

**Step 1: Add docs**

Update README to state:
- API is currently single-instance only
- sticky sessions are required anywhere requests can traverse multiple proxies

Create a production-readiness checklist that:
- lists the top 10 readiness fixes
- records current status
- identifies the next recommended phase

**Step 2: Verify docs build assumptions**

Run: `grep -n "single-instance" README.md docs/production-readiness.md`
Expected: matching lines in both files

### Task 4: Full verification

**Files:**
- Test: `tests/api-deployment.test.mjs`
- Test: `tests/*.test.mjs`

**Step 1: Run targeted verification**

Run: `node --test tests/api-deployment.test.mjs`
Expected: PASS

**Step 2: Run repo verification**

Run: `pnpm -w test`
Expected: PASS

Run: `pnpm -w typecheck`
Expected: PASS

Run: `pnpm -w lint`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/api-deployment.test.mjs apps/api/src/lib/deployment.ts apps/api/src/config.ts apps/api/src/index.ts README.md docs/production-readiness.md docs/plans/2026-03-03-single-instance-deployment-design.md docs/plans/2026-03-03-single-instance-deployment.md
git commit -m "feat: document and enforce single-instance deployment"
```
