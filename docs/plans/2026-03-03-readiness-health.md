# Dependency-Aware Health Checks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `/health` into a real readiness endpoint by validating cheap core dependencies while keeping deeper diagnostics in `/admin/health`.

**Architecture:** Add a reusable readiness helper in the API that combines a DB probe, config presence checks, and deployment status into a single readiness report. Use that helper from both health endpoints, with `/health` returning a compact probe-friendly response and `/admin/health` exposing richer operational detail.

**Tech Stack:** Node.js, Fastify, Prisma, TypeScript, node:test, Markdown docs

---

### Task 1: Add a failing readiness test

**Files:**
- Create: `tests/api-readiness.test.mjs`
- Test: `tests/api-readiness.test.mjs`

**Step 1: Write the failing test**

Add tests that expect a readiness helper module to:
- report `ok: true` when DB probing succeeds and required config is present
- report `ok: false` with concrete failure reasons when DB probing fails or desktop release provider config is incomplete

**Step 2: Run test to verify it fails**

Run: `node --test tests/api-readiness.test.mjs`
Expected: FAIL because `apps/api/dist/lib/readiness.js` does not exist yet.

### Task 2: Implement readiness helper and wire endpoints

**Files:**
- Create: `apps/api/src/lib/readiness.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Write minimal implementation**

Add a helper that:
- runs a DB probe
- computes readiness from deployment + config presence
- returns `failures` and compact dependency state

Update:
- `/health` to return `503` when not ready
- `/admin/health` to include the same readiness object plus existing diagnostics

**Step 2: Run test to verify it passes**

Run: `pnpm -w build && node --test tests/api-readiness.test.mjs`
Expected: PASS

### Task 3: Update docs and handoff state

**Files:**
- Modify: `docs/protocol.md`
- Modify: `docs/production-readiness.md`

**Step 1: Document the new contract**

Update protocol docs to describe:
- `/health` as readiness-oriented and able to return `503`
- `/admin/health` as detailed admin diagnostics

Update the readiness checklist to:
- mark item 5 complete
- advance the next recommended phase

**Step 2: Verify docs markers**

Run: `grep -n "Health checks verify real dependencies: complete\\|Iteration 20" docs/production-readiness.md`
Expected: matching lines

### Task 4: Full verification

**Files:**
- Test: `tests/api-readiness.test.mjs`
- Test: `tests/*.test.mjs`

**Step 1: Run targeted verification**

Run: `node --test tests/api-readiness.test.mjs`
Expected: PASS

**Step 2: Run repo verification**

Run: `pnpm -w test`
Expected: PASS

Run: `pnpm -w typecheck`
Expected: PASS

Run: `pnpm -w lint`
Expected: PASS

Run: `bash scripts/smoke/httpSmoke.sh`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/api-readiness.test.mjs apps/api/src/lib/readiness.ts apps/api/src/index.ts docs/protocol.md docs/production-readiness.md docs/plans/2026-03-03-readiness-health-design.md docs/plans/2026-03-03-readiness-health.md
git commit -m "feat: add dependency-aware readiness checks"
```
