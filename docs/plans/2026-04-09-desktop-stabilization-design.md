# Desktop Runtime Stabilization Design

## Context

The current desktop release blockers cluster around one theme: the app exposes a polished retail shell, but several user-critical paths still run through the wrong runtime or the wrong window model.

Validated source problems:

- Confirmed tasks still default to `advanced_agent`, while chat/settings/local Free AI checks use the production `llm` path.
- Overlay mode is still implemented as a fullscreen native window with visible desktop chrome layered on top, not as a minimal HUD.
- The normal desktop window hides native chrome and only exposes a small custom drag strip, which makes the app feel immovable.
- Readiness and fallback logic are broader and more optimistic than the real runtime capabilities.
- Updater behavior depends on workflow-generated release config and currently hides real feed failures as “no update”.

This work needs to be phased. The user-facing breakage is largest in the desktop shell itself, so that has to move first.

## Approaches Considered

### 1. Minimal release hotfix only

Change the default task engine back to legacy AI Assist, patch one or two UI issues, and ship.

Pros:

- Smallest diff.
- Fastest way to reduce some task stalls.

Cons:

- Leaves overlay and window behavior visibly broken.
- Leaves the product with mismatched runtime truth between task execution, onboarding, and settings.
- Risks another release where some complaints are fixed and others are still obvious.

### 2. Full runtime rewrite first

Unify confirmed tasks, chat, and local Free AI around one execution path before touching release/UI work.

Pros:

- Cleanest long-term architecture.
- Reduces future drift.

Cons:

- Too large for the immediate stabilization need.
- Delays obvious shell fixes users are already complaining about.

### 3. Phased stabilization with user-visible shell fixes in Phase 1

Stabilize the shipped desktop in layers:

1. Fix the user-visible runtime default and the desktop shell first.
2. Tighten readiness/fallback/runtime consistency next.
3. Fix updater and run-lifecycle truth next.
4. Add release validation around the real shipped paths.

Pros:

- Solves the most visible problems first.
- Keeps diffs reviewable.
- Preserves room for deeper runtime corrections without blocking immediate desktop recovery.

Cons:

- For a short period, some internal architecture debt still exists behind a safer default.

## Recommended Design

Use approach 3: phased stabilization, with the desktop shell and wrong task default in Phase 1.

## Approved Phase Structure

### Phase 1: Desktop Shell And Runtime Hotfix

Phase 1 is the immediate release-recovery batch.

It includes:

- Switch confirmed tasks back to `ai_assist_legacy` by default.
- Demote `advanced_agent` to an explicit experimental/debug surface instead of the retail default.
- Redesign overlay mode into a minimal transparent HUD:
  - no fullscreen visual haze
  - no heavy shell around the desktop
  - compact controller only
  - compact approval cards only
- Fix normal window dragging by exposing a broader, obvious draggable chrome area instead of the current narrow hidden strip.

Phase 1 does not attempt to finish runtime unification. It reduces user-visible breakage and routes default task execution through the path already exercised by settings/chat/local Free AI checks.

### Phase 2: Readiness, Fallback, And Local Runtime Consistency

Phase 2 tightens the task-start contract:

- require workspace only when a task actually needs workspace tools
- require screen/control permissions only when the task truly needs them
- stop treating hosted/local fallback as “available” unless reachability and capability are explicitly confirmed
- align task execution with the same effective local model and compatibility behavior used by conversation/settings tests

### Phase 3: Run-Lifecycle And Updater Truth

Phase 3 fixes truthfulness in the system:

- the server should not mark AI Assist runs healthy just because the device accepted them
- updater-disabled beta builds should say so clearly
- stable updater/feed failures should surface actionable errors instead of silent `204` no-update responses

### Phase 4: Release Validation

Phase 4 adds explicit release confidence around the real shipped app:

- packaged macOS validation for confirmed tasks on Free AI
- packaged validation for overlay behavior and window movement
- packaged validation for unavailable fallback paths
- packaged validation for beta/stable updater truth

## Design Decisions

### Task Runtime Default

The default engine must prioritize proven product behavior over architectural ambition. `advanced_agent` may remain available for internal validation, but it should not remain the retail default until it matches the production chat/settings/runtime path and passes packaged release validation.

### Overlay Model

Overlay mode should remain an execution-only state, but its presentation must stop competing with the real desktop. The desktop underneath is the primary visual surface during execution. GORKH should become a thin control layer, not a replacement shell.

### Window Dragging

The normal desktop window needs an obvious drag affordance that spans the actual visible top chrome, not a hidden absolute strip buried inside the centered content frame. Interactive controls must remain clickable, but the non-interactive top shell should drag reliably across the full window width.

### Testing Strategy

Phase 1 uses source-based regression tests first because the current failure modes are structural and packaging-sensitive:

- assistant-engine default/catalog expectations
- overlay shell/controller/approval presentation expectations
- desktop drag-region expectations

After Phase 1 code lands, run the targeted desktop tests and only then proceed to broader verification.

## Expected Files

- `docs/plans/2026-04-09-desktop-stabilization-design.md`
- `docs/plans/2026-04-09-desktop-stabilization.md`
- `apps/desktop/src/lib/assistantEngine.ts`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/components/ActiveOverlayShell.tsx`
- `apps/desktop/src/components/OverlayController.tsx`
- `apps/desktop/src/components/ApprovalModal.tsx`
- `apps/desktop/src/components/ActionApprovalModal.tsx`
- `apps/desktop/src/components/ToolApprovalModal.tsx`
- `tests/desktop-assistant-engine.test.ts`
- `tests/desktop-overlay-visual-shell.test.mjs`
- `tests/desktop-overlay-controller.test.mjs`
- `tests/desktop-overlay-approvals.test.mjs`
- `tests/desktop-overlay-window-state.test.mjs`
