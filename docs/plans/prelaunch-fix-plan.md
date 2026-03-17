# GORKH Prelaunch Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the launch blockers identified in the pre-launch audit and make GORKH realistic for a macOS external beta first, then a Windows beta.

**Architecture:** Preserve the current desktop-first architecture and fix launch blockers in narrow slices. Prioritize product-truth, privacy, release integrity, and execution correctness before broader UX cleanup. Avoid rewrites by tightening existing API, web, desktop, and verification paths in place.

**Tech Stack:** Tauri desktop app, Rust native commands, React/Vite desktop UI, Fastify API, Next.js web app, shared TypeScript protocol, pnpm workspace, Node test runner, GitHub Actions release workflows.

---

## Ordering Rationale

1. **Shared launch-truth first** because a real beta cannot start if users cannot acquire the app, if feeds can serve placeholders, or if logs leak sensitive data.
2. **Execution correctness second** because wrong-screen clicks and opaque Free AI setup will break real users even if download/auth works.
3. **Session hardening third** because it reduces external-beta security risk without changing the product model.
4. **Platform-specific blockers fourth** because macOS can only launch safely after the shared blockers are closed, and Windows should not be enabled until its false blockers are fixed.
5. **UX and confidence cleanup last** because these are important but should not displace harder launch-truth and safety work.

## Phase Labels

- **Shared:** applies to macOS and Windows launch truth
- **macOS-first:** required before external Mac beta
- **Windows-first:** required before Windows beta

## Phase 1: Shared Launch-Truth Blockers

### Task 1: Fix desktop acquisition / free-local promise

**Platform:** Shared

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/web/app/download/page.tsx`
- Modify: `apps/web/lib/auth.ts`
- Review: `apps/api/src/lib/subscription.ts`
- Review: `apps/api/src/lib/desktop-account.ts`
- Test: `tests/api-subscription.test.mjs`
- Test: `tests/web-dashboard-desktop-first.test.mjs`
- Test: `tests/api-desktop-runs.test.mjs`

**Intent:**
- Make desktop downloads available to authenticated users without an active subscription.
- Keep paid billing gates for premium features, not app acquisition.
- Align download page copy with the free-local product promise.

**Implementation shape:**
1. Add or update API tests proving `/downloads/desktop` is available to signed-in inactive users.
2. Run the targeted test to watch it fail.
3. Remove the subscription gate from the desktop-download acquisition path only.
4. Update web download handling so inactive users see real download access instead of a subscription block.
5. Update retail copy to reflect free acquisition and premium upsell boundaries.
6. Re-run targeted tests, then broader relevant gates.

### Task 2: Fix release/download/update truth

**Platform:** Shared, macOS-first

**Files:**
- Modify: `apps/api/src/config.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/lib/releases/resolveDesktopAssets.ts`
- Modify: `scripts/release/verify-api-feed.mjs`
- Modify: `scripts/final-smoke.sh`
- Modify: `tests/workflow-desktop-release-command.test.mjs`
- Modify: `tests/api-ready.test.mjs`
- Review: `apps/api/updates/desktop-darwin-aarch64.json`
- Review: `apps/api/updates/desktop-darwin-x86_64.json`
- Review: `apps/api/updates/desktop-windows-x86_64.json`

**Intent:**
- Ensure production launch paths fail loudly instead of serving placeholder release data.
- Make verification reject fake signatures, fake URLs, and stub-friendly smoke settings.

### Task 3: Fix privacy redaction / sensitive persistence

**Platform:** Shared

**Files:**
- Modify: `apps/desktop/src/lib/approvals.ts`
- Modify: `apps/desktop/src/lib/aiAssist.ts`
- Modify: `apps/desktop/src-tauri/src/workspace.rs`
- Modify: `apps/api/src/lib/ws-handler.ts`
- Modify: `apps/api/src/repos/runs.ts`
- Test: `tests/api-redact.test.mjs`
- Test: `tests/desktop-approvals.test.ts`

**Intent:**
- Preserve auditability while removing raw user text, terminal content, file content previews, and sensitive snippets from persisted history and logs.

### Task 4: Fix provider truth

**Platform:** Shared

**Files:**
- Modify: `apps/desktop/src/lib/llmConfig.ts`
- Modify: `apps/desktop/src/lib/advancedAgent.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `tests/desktop-paid-provider-support.test.ts`
- Modify: `tests/desktop-main-flow-provider-runtime.test.mjs`

**Intent:**
- Make retail-visible providers equal to actual primary-flow support.
- Demote or remove misleading launch claims before beta.

## Phase 2: Cross-Platform Execution Blockers

### Task 5: Fix selected-display targeting and multi-monitor correctness

**Platform:** Shared, macOS-first

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/ScreenPanel.tsx`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/agent/mod.rs`
- Modify: `apps/desktop/src-tauri/src/agent/executor.rs`
- Test: `tests/desktop-task-surface.test.mjs`
- Test: `tests/desktop-tauri-commands.test.mjs`

**Intent:**
- Keep screen observation and input execution on the same selected display.

### Task 6: Make Free AI onboarding operationally supportable

**Platform:** Shared, macOS-first

**Files:**
- Modify: `apps/desktop/src/lib/localAi.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/FreeAiSetupCard.tsx`
- Modify: `apps/desktop/src-tauri/src/local_ai.rs`
- Test: `tests/desktop-free-ai-onboarding.test.ts`
- Test: `tests/desktop-local-ai-install-runtime.test.mjs`

**Intent:**
- Improve progress/error signaling and safe diagnostics without changing the local-only AI model.

## Phase 3: Session/Security Hardening

### Task 7: Harden desktop device token/session security

**Platform:** Shared

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/repos/devices.ts`
- Modify: `apps/api/src/lib/desktop-session.ts`
- Modify: `apps/desktop/src/lib/desktopAuth.ts`
- Modify: `apps/desktop/src/App.tsx`
- Test: `tests/api-desktop-session.test.mjs`
- Test: `tests/api-desktop-auth-routes.test.mjs`
- Test: `tests/desktop-ws-client-signout.test.ts`

**Intent:**
- Reduce bearer-token replay risk with a safer lifecycle and cleaner revoke behavior.

### Task 8: Strengthen logout / revoke / rotation semantics

**Platform:** Shared

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/lib/desktop-session.ts`
- Modify: `apps/desktop/src/App.tsx`
- Test: `tests/api-desktop-device-management.test.mjs`
- Test: `tests/api-desktop-auth-routes.test.mjs`

**Intent:**
- Ensure revoked or rotated sessions fail cleanly without cross-device collateral damage.

## Phase 4: Platform-Specific Readiness

### Task 9: Fix macOS-first beta blockers

**Platform:** macOS-first

**Files:**
- Modify: `.github/workflows/desktop-release.yml`
- Modify: `apps/desktop/src/lib/overlayMode.ts`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `tests/desktop-overlay-window-state.test.mjs`
- Modify: `tests/workflow-desktop-release-command.test.mjs`

**Intent:**
- Make the Mac release lane, overlay behavior, and onboarding path credible for external testers.

### Task 10: Fix Windows readiness blockers and misleading permission assumptions

**Platform:** Windows-first

**Files:**
- Modify: `apps/desktop/src/lib/taskReadiness.ts`
- Modify: `apps/desktop/src/lib/permissions.ts`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `tests/desktop-task-readiness.test.ts`

**Intent:**
- Stop treating Windows `unknown` permissions as a hard blocker and replace misleading guidance with grounded expectations.

## Phase 5: UX / Launch-Confidence Cleanup

### Task 11: Reduce run/device/admin jargon in retail surfaces

**Platform:** Shared

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/dashboard/legacy/page.tsx`
- Test: `tests/desktop-retail-ux.test.mjs`
- Test: `tests/web-dashboard-desktop-first.test.mjs`

**Intent:**
- Keep legacy/admin functionality available while making default surfaces feel retail and assistant-led.

### Task 12: Make verification realistic instead of stub-friendly

**Platform:** Shared

**Files:**
- Modify: `scripts/final-smoke.sh`
- Modify: `scripts/release/verify-api-feed.mjs`
- Modify: `.github/workflows/desktop-ci.yml`
- Modify: `tests/workflow-desktop-release-command.test.mjs`

**Intent:**
- Ensure passing gates means something real for launch.

## Verification Strategy

After each completed task:

1. Run the task-specific failing test first.
2. Implement the smallest change that makes it pass.
3. Re-run the targeted tests.
4. Run the relevant broader gates for the current risk surface.

Full gates required before declaring launch-ready:

- `pnpm -w build`
- `pnpm -w typecheck`
- `pnpm -w test`
- `pnpm check:desktop:security`
- `pnpm smoke:final`

## Immediate Execution Order

1. Complete Task 1 only.
2. Verify Task 1 with targeted tests plus relevant workspace gates.
3. Stop and summarize.
4. Only then continue to Task 2.
