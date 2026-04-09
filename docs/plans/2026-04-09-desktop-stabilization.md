# Desktop Runtime Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilize the shipped desktop experience by fixing the wrong confirmed-task default, redesigning overlay mode into a minimal transparent HUD, restoring reliable normal window dragging, then tightening task readiness/fallback behavior and updater/run-lifecycle truth in later phases.

**Architecture:** Keep the current multi-path architecture for now, but move the retail default back onto the safer legacy AI Assist execution path while reducing the visible desktop shell to a thin overlay/control model. Follow with narrower readiness/fallback contracts, then server/updater truth fixes, then packaged validation.

**Tech Stack:** React, TypeScript, Tauri, Rust, Node test runner

**Validation Checklist:** `docs/plans/2026-04-09-desktop-stabilization-validation.md`

---

## Phase 1: Desktop Shell And Runtime Hotfix

### Task 1: Write Failing Phase 1 Regressions

**Files:**
- Modify: `tests/desktop-assistant-engine.test.ts`
- Modify: `tests/desktop-overlay-visual-shell.test.mjs`
- Modify: `tests/desktop-overlay-controller.test.mjs`
- Modify: `tests/desktop-overlay-approvals.test.mjs`
- Modify: `tests/desktop-overlay-window-state.test.mjs`

**Step 1: Update the assistant-engine regression**

Change the engine test so it expects:

- `DEFAULT_ASSISTANT_ENGINE_ID === 'ai_assist_legacy'`
- `ai_assist_legacy` is the retail default
- `advanced_agent` is explicitly experimental/debug

**Step 2: Strengthen overlay-shell expectations**

Assert that:

- the overlay shell remains transparent
- the controller is compact and not a large glass card
- overlay approvals remain compact floating cards

**Step 3: Strengthen normal-window drag expectations**

Assert that:

- the draggable area is no longer only the small absolute strip inside the centered frame
- the visible top chrome exposes a broader drag surface

**Step 4: Run the focused Phase 1 tests**

Run:

```bash
node --import tsx --test tests/desktop-assistant-engine.test.ts tests/desktop-overlay-visual-shell.test.mjs tests/desktop-overlay-controller.test.mjs tests/desktop-overlay-approvals.test.mjs tests/desktop-overlay-window-state.test.mjs
```

Expected: FAIL on the engine default and at least one overlay/window expectation.

### Task 2: Restore The Retail Default Task Engine

**Files:**
- Modify: `apps/desktop/src/lib/assistantEngine.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Change the default engine**

Set `DEFAULT_ASSISTANT_ENGINE_ID` to `ai_assist_legacy`.

**Step 2: Re-label the engine catalog**

Make the catalog describe:

- `ai_assist_legacy` as the stable retail path
- `advanced_agent` as experimental/debug

**Step 3: Reduce retail exposure**

Keep the selector usable for debugging, but make the wording clearly secondary and non-default.

**Step 4: Run the focused engine test**

Run:

```bash
node --import tsx --test tests/desktop-assistant-engine.test.ts
```

Expected: PASS.

### Task 3: Implement The Minimal Overlay And Draggable Window Shell

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/ActiveOverlayShell.tsx`
- Modify: `apps/desktop/src/components/OverlayController.tsx`
- Modify: `apps/desktop/src/components/ApprovalModal.tsx`
- Modify: `apps/desktop/src/components/ActionApprovalModal.tsx`
- Modify: `apps/desktop/src/components/ToolApprovalModal.tsx`

**Step 1: Keep overlay visually transparent**

Remove any remaining heavy fullscreen shell treatment. The desktop underneath should remain visually primary.

**Step 2: Keep only compact floating overlay surfaces**

Use:

- a small status shell
- a compact control surface
- compact approval cards

Avoid large pane-like shells and avoid fullscreen dark blockers.

**Step 3: Expand the normal drag affordance**

Move the normal-mode drag region into a broader visible top chrome area that spans the window width while keeping buttons and other interactive controls clickable.

**Step 4: Run the focused overlay/window tests**

Run:

```bash
node --test tests/desktop-overlay-visual-shell.test.mjs tests/desktop-overlay-controller.test.mjs tests/desktop-overlay-approvals.test.mjs tests/desktop-overlay-window-state.test.mjs
```

Expected: PASS.

### Task 4: Verify Phase 1 As A Batch

**Files:**
- No new files

**Step 1: Run all focused Phase 1 tests together**

Run:

```bash
node --import tsx --test tests/desktop-assistant-engine.test.ts tests/desktop-overlay-visual-shell.test.mjs tests/desktop-overlay-controller.test.mjs tests/desktop-overlay-approvals.test.mjs tests/desktop-overlay-window-state.test.mjs
```

**Step 2: Record any remaining source-truth gaps before Phase 2**

Note any failures that point to readiness/fallback/runtime consistency work rather than shell/default-engine work.

## Phase 2: Readiness, Fallback, And Local Runtime Consistency

### Task 5: Write Failing Readiness And Fallback Regressions

**Files:**
- Modify: `apps/desktop/src/lib/taskReadiness.ts`
- Modify: `apps/desktop/src/lib/aiAssist.ts`
- Modify or create tests for readiness and fallback selection

**Steps:**

1. Add failing regressions for over-broad workspace/screen gating.
2. Add failing regressions for optimistic fallback selection.
3. Run focused tests and verify they fail for the intended reasons.

### Task 6: Narrow Task Gating And Fallback Selection

**Files:**
- Modify: `apps/desktop/src/lib/taskReadiness.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/lib/aiAssist.ts`
- Modify: `apps/desktop/src/lib/localAi.ts`

**Steps:**

1. Require workspace only for workspace tasks.
2. Require screen/control only for tasks that truly need them.
3. Stop selecting fallback paths unless availability is explicitly confirmed.
4. Align task execution with the same effective local model / compatibility path used by conversation and settings checks.

## Phase 3: Run-Lifecycle And Updater Truth

### Task 7: Write Failing Lifecycle And Updater Truth Regressions

**Files:**
- Modify or create tests for `apps/api/src/lib/ws-handler.ts`
- Modify or create tests for `apps/api/src/index.ts`
- Modify or create tests for desktop updater UI expectations

**Steps:**

1. Add failing regression for “run marked healthy on device accept”.
2. Add failing regression for silent updater-feed failures.
3. Add failing regression for beta-build updater-disabled messaging.

### Task 8: Implement Lifecycle And Updater Truth Fixes

**Files:**
- Modify: `apps/api/src/lib/ws-handler.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/SettingsPanel.tsx`

**Steps:**

1. Require stronger engine-start/progress truth before the server advertises healthy execution.
2. Surface real stable updater-feed failures instead of masking them as 204 no-update responses.
3. Make updater-disabled beta messaging explicit in the shipped desktop UI.

## Phase 4: Release Validation

### Task 9: Add Real Shipped-Path Validation

**Files:**
- Modify or create packaged-release smoke tests and release-check tests

**Steps:**

1. Validate confirmed tasks on Free AI in a packaged macOS build.
2. Validate overlay behavior and normal window dragging in packaged desktop builds.
3. Validate hosted fallback unavailable behavior.
4. Validate beta/stable updater truth.

### Task 10: Final Verification

**Files:**
- No new files

**Steps:**

1. Re-run focused source regressions.
2. Run the broader desktop verification commands required by the touched areas.
3. Summarize residual risks before release.
