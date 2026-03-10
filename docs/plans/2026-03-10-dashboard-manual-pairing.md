# Dashboard Manual Pairing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow a user to pair a newly connected desktop from the dashboard even when it is not yet listed in owned devices.

**Architecture:** Add a small manual pairing form to the dashboard UI and submit it to the existing pair endpoint. Do not change backend visibility rules for `/devices`.

**Tech Stack:** Next.js app router, React, node:test source assertions.

---

### Task 1: Add the failing dashboard pairing test

**Files:**
- Create: `tests/web-dashboard-manual-pairing.test.mjs`
- Modify: none
- Test: `tests/web-dashboard-manual-pairing.test.mjs`

**Step 1: Write the failing test**

Assert that `apps/web/app/dashboard/page.tsx` contains:

- a manual pairing section heading
- a device ID input placeholder
- submission logic that posts to `/devices/${deviceId}/pair`

**Step 2: Run test to verify it fails**

Run: `node --test tests/web-dashboard-manual-pairing.test.mjs`
Expected: FAIL because the manual pairing section does not exist yet.

### Task 2: Implement the manual dashboard pairing form

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Test: `tests/web-dashboard-manual-pairing.test.mjs`

**Step 1: Add state for manual pairing inputs**

Track:

- manual device ID
- manual pairing code
- loading state

**Step 2: Reuse pairing submission flow**

Factor the existing submit logic so both:

- per-device pair UI
- manual pair UI

use the same request path and success refresh behavior.

**Step 3: Render the manual pairing card**

Add a dashboard section before the device list with:

- explanatory text
- device ID input
- pairing code input
- pair button

**Step 4: Run test to verify it passes**

Run: `node --test tests/web-dashboard-manual-pairing.test.mjs`
Expected: PASS

### Task 3: Run focused verification and commit

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Create: `tests/web-dashboard-manual-pairing.test.mjs`

**Step 1: Run focused verification**

Run:

- `node --test tests/web-dashboard-manual-pairing.test.mjs`
- `pnpm --filter @ai-operator/web test`
- `pnpm --filter @ai-operator/web typecheck`

**Step 2: Commit**

```bash
git add apps/web/app/dashboard/page.tsx tests/web-dashboard-manual-pairing.test.mjs docs/plans/2026-03-10-dashboard-manual-pairing-design.md docs/plans/2026-03-10-dashboard-manual-pairing.md
git commit -m "fix: add manual dashboard device pairing"
```
