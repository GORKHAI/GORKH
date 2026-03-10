# Desktop Release API Variable Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make desktop release builds fail fast when required API variables are missing or invalid so beta artifacts stop shipping with localhost defaults.

**Architecture:** Add a workflow-level validation step in `desktop-release.yml` that checks `VITE_API_HTTP_BASE` and `VITE_API_WS_URL` before any platform build starts. Cover the behavior with a workflow test so the validation cannot regress silently.

**Tech Stack:** GitHub Actions YAML, Node.js workflow tests

---

### Task 1: Add the failing workflow test

**Files:**
- Modify: `tests/workflow-desktop-release-command.test.mjs`

**Step 1: Write the failing test**

Add assertions that the workflow:
- validates `VITE_API_HTTP_BASE`
- validates `VITE_API_WS_URL`
- requires `https://` and `wss://` for packaged desktop builds

**Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-desktop-release-command.test.mjs`

Expected: FAIL because the workflow currently passes the variables through but does not validate them.

### Task 2: Implement fail-fast workflow validation

**Files:**
- Modify: `.github/workflows/desktop-release.yml`

**Step 1: Add a prepare-step validation**

Add a shell step after release context resolution that:
- reads `vars.VITE_API_HTTP_BASE`
- reads `vars.VITE_API_WS_URL`
- exits with `::error::` if either is missing
- parses both URLs
- rejects non-`https:` HTTP URLs
- rejects non-`wss:` websocket URLs
- rejects mismatched host/port pairs

**Step 2: Keep existing build env wiring**

Do not change the existing job-level env exports; the fix is to validate them before building.

### Task 3: Verify and ship

**Files:**
- Modify: none

**Step 1: Run tests**

Run:
- `node --test tests/workflow-desktop-release-command.test.mjs`
- `node --test tests/workflow-*.mjs tests/desktop-rust-release-prereqs.test.mjs tests/desktop-rust-format-strings.test.mjs`
- `pnpm --filter @ai-operator/shared build`
- `pnpm --filter @ai-operator/desktop typecheck`

**Step 2: Commit**

Commit only the workflow, test, and plan/design docs.

**Step 3: Tag a new beta**

Push `main`, create the next beta tag, and check the workflow run.
