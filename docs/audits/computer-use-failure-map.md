# GORKH Computer-Use Failure Map

> **Scope**: Concrete failure map for natural-language task execution and desktop control.
> **Date**: 2026-04-28
> **Branch**: `feature/byo-key-fix`

---

## 1. Commands Run

All commands executed from repo root `/workspaces/GORKH`.

### Typecheck

```bash
pnpm --filter @ai-operator/desktop typecheck
```
- **Result**: ✅ PASS (`tsc --noEmit`, exit 0)

```bash
pnpm --filter @ai-operator/shared typecheck
```
- **Result**: ✅ PASS (`tsc --noEmit`, exit 0)

### Build

```bash
pnpm --filter @ai-operator/desktop build
```
- **Result**: ✅ PASS (`tsc && vite build`, exit 0)
- **Warning**: `dist/assets/index-DktvZgVA.js 505.06 kB │ gzip: 140.41 kB` — chunk size >500 kB

```bash
cd apps/desktop/src-tauri && cargo check
```
- **Result**: ✅ PASS (exit 0)
- **Warning**: `screenshots v0.8.10` contains code that will be rejected by a future Rust version

### Tests

```bash
pnpm --filter @ai-operator/shared test
```
- **Result**: ✅ PASS (7/7, exit 0)

```bash
node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*
```
- **Result**: ⚠️ 173 pass, 8 fail (exit 0 because Node test runner reports individual failures)
- **Duration**: ~12.8s

> **Note**: Running `node --test` without `tsx` produces 25 failures because Node 24 native strip-only mode cannot parse TypeScript parameter properties (`constructor(private options: ...)`) in `wsClient.ts`. The canonical test command in `package.json` uses `--import tsx`, so the 8 failures below are the **real** ones.

---

## 2. Failing Tests

### 2.1 Exact Failing Files and Errors

| # | Test File | Test Name | Error | Root Cause |
|---|-----------|-----------|-------|------------|
| 1 | `tests/desktop-assistant-engine.test.ts:41` | `desktop chat shell routes through the unified assistant-engine abstraction` | `ENOENT: no such file or directory, open 'apps/desktop/src/components/AgentWorkflow.tsx'` | File `AgentWorkflow.tsx` does not exist; test expects it as part of unified engine abstraction. |
| 2 | `tests/desktop-background-updater.test.ts:51` | `desktop updater wiring enables the Rust process plugin for restart after install` | AssertionError: capability array has `updater:default` but test expects `updater:allow-check`, `updater:allow-download`, `updater:allow-install`, `process:default` | Coarse-grained updater capability instead of fine-grained permissions. |
| 3 | `tests/desktop-free-ai-hosted-fallback.test.ts:5` | `desktop hosted Free AI helper resolves the authenticated OpenAI-compatible fallback binding` | `ERR_MODULE_NOT_FOUND`: Cannot find module `apps/desktop/src/lib/desktopApi.js` imported from `freeAiFallback.ts` | Stale `.js` import left over from `noEmit` migration. `desktopApi.ts` exists but `desktopApi.js` was deleted. |
| 4 | `tests/desktop-overlay-controller.test.mjs:5` | `desktop overlay controller should be a transparent floating control strip, not a glass card` | AssertionError: `controller should not rely on a frosted fullscreen-card treatment` | `OverlayController.tsx` uses `backdropFilter: 'blur(12px) saturate(130%)'` which the test regex rejects. |
| 5 | `tests/desktop-overlay-visual-shell.test.mjs:5` | `desktop overlay shell should be transparent and avoid a centered glass card` | AssertionError: `overlay shell should not use a fullscreen blur/dimming layer` | `ActiveOverlayShell.tsx` uses `backdropFilter: 'blur(20px) saturate(140%)'` and a dim layer which the test rejects. |
| 6 | `tests/desktop-paid-provider-support.test.ts:15` | `desktop launch-facing provider list exposes only launch-ready providers` | AssertionError: expected `['native_qwen_ollama', 'openai', 'claude']`, actual `['gorkh_free', 'openai', 'claude']` | BYO-key refactor changed the default provider list; test expects the old default. |
| 7 | `tests/desktop-runtime-js-error-sync.test.mjs:5` | `desktop runtime JS uses the shared Tauri error parser for settings and chat failures` | `ENOENT: no such file or directory, open 'apps/desktop/src/App.js'` | Stale emitted `.js` file reference. `App.tsx` exists but emitted `App.js` was deleted during `noEmit` cleanup. |
| 8 | `tests/desktop-tauri-error-handling.test.ts:40` | `desktop chat and settings use the shared Tauri error parser for user-facing failures` | AssertionError: `hosted fallback errors should use hosted wording instead of generic local-server wording` | `openai_compat.rs` error messages say `"remote provider"` / `"local LLM server"` instead of `"Hosted Free AI fallback"`. |

### 2.2 Categorization

**A) Code-level failures detectable in CI/Codespace:**
- All 8 failures above are detectable in CI (no OS-level desktop interaction required).
- TypeScript build, typecheck, and Rust `cargo check` all pass.

**B) Local-machine failures requiring Mac/Windows validation:**
- **Screenshot capture accuracy**: No test verifies that `capture_display_png` produces a valid PNG with correct pixel dimensions. The `screenshots` crate warning about future Rust incompatibility is a compile-time signal, not a runtime validation.
- **Input injection coordinate mapping**: `tests/desktop-multi-display-control.test.mjs` validates `resolve_display_point` structurally (regex), but there is no runtime test that clicks a known screen coordinate and verifies the cursor landed there.
- **App focus behavior after `open_app`**: `ActionExecutor::execute` for `OpenApp` sleeps 2s but does not wait for window focus. No automated test verifies frontmost window state.
- **Multi-monitor display hot-plug**: `list_displays()` enumerates displays but has no hot-plug detection or graceful disconnect handling.
- **Permission dialog interactions**: Tests verify guidance text exists, but no test exercises the actual macOS Screen Recording / Accessibility grant flow.
- **`enigo` input reliability**: No test verifies that `input_type` or `input_click` actually produce OS-level events.

---

## 3. Passing Tests (Relevant to Agent/Screenshots/Approvals/Tools/Tauri)

The following tests **pass** and confirm that these subsystems are structurally sound:

| Test File | What It Validates |
|-----------|-------------------|
| `desktop-advanced-runtime.test.mjs` | Advanced agent no longer hard-fails; exposes retail approval loop; `open_app` wiring through parser and executor |
| `desktop-approvals.test.ts` | Approval controller expiration, redaction of sensitive content, tool call redaction, diagnostic export sanitization |
| `desktop-action-status-ordering.test.mjs` | Action status state machine ordering |
| `desktop-tauri-commands.test.mjs` | `input_click`, `input_double_click`, `input_scroll`, `input_type`, `input_hotkey` are allowlisted; `capture_display_png` command exists; native commands target selected `display_id` |
| `desktop-multi-display-control.test.mjs` | `resolve_display_point` helper exists; `DisplayBounds` struct exists; display origin/size reading exists |
| `desktop-open-app-action.test.mjs` | `open_app` action handled in `actionExecutor.ts`; `open_application` Tauri command registered; prompts mention `open_app` |
| `desktop-overlay-approvals.test.mjs` | Overlay approval modals support `overlayMode`, `onStopAll`, compact floating cards |
| `desktop-vision-escalation.test.mjs` | Vision Boost path; `taskLikelyNeedsVision` heuristic; advanced agent `task_needs_vision` gating |
| `desktop-gorkh-tools.test.ts` | `isGorkhReadOnlyToolCall`, `isGorkhWriteToolCall`, sanitization/redaction for GORKH tools |
| `desktop-security-config.test.mjs` | CSP is locked down (`default-src 'self'`, no `unsafe-eval`); capabilities narrowly scoped |
| `desktop-local-ai-*.test.mjs` | Managed install, manifest, tier recommendation, bindings, error handling |
| `shared-protocol.test.mjs` | Zod schemas accept/reject correct payloads; `open_app` actions accepted |
| `shared-privacy-redaction.test.ts` | `sanitizeRunLogLine`, `redactToolCallForLog`, `sanitizeAgentProposalForPersistence` |

---

## 4. Diagnostic Test: Agent Action Pipeline

Created: `tests/desktop-agent-pipeline.diagnostic.ts`

### What It Does

Runs the legacy `AiAssistController` loop with a **mocked Tauri invoke bridge** (no real OS input or screenshots):

1. Mocks `window.__TAURI_INTERNALS__.invoke` to return:
   - Fake screenshot (`capture_display_png`)
   - First LLM proposal: `propose_action` → `click` at `(0.5, 0.5)`
   - Second LLM proposal: `done`
2. Creates `AiAssistController` with the mocked bridge
3. Calls `controller.start()`
4. Waits for `awaiting_approval`
5. Calls `controller.approveAction()`
6. Verifies:
   - `input_click` was executed with correct coordinates
   - **Two** `capture_display_png` calls occurred (initial + re-observation)
   - Loop reached `done` status

### Run Command

```bash
node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts
```

### Current Result

```
✔ agent pipeline: observe → propose → approve → execute → re-observe (516ms)
✔ agent pipeline should fail diagnostic if loop stops after single proposal (maxActions=1) (510ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

**State sequence observed:**
```
capturing → capturing → thinking → awaiting_approval → executing → capturing → capturing → thinking → done
```

### What the Diagnostic Exposes

The legacy loop **does** re-observe after execution (two screenshot captures). The diagnostic will **fail** if:
- `approveAction()` does not trigger `input_click`
- `resumeLoop()` is broken and no second `capture_display_png` occurs
- `maxActions` constraint prematurely halts the loop (demonstrated in test 2)

The diagnostic **does not** expose the deeper audit finding that the loop re-observes without *verifying* the action had the intended effect (no before/after comparison).

---

## 5. Prioritized Bug List

### P0 — Blocks Real Task Execution

| Bug | Evidence | Impact |
|-----|----------|--------|
| **Stale `.js` import crashes Free AI fallback** | `tests/desktop-free-ai-hosted-fallback.test.ts:5` — `ERR_MODULE_NOT_FOUND` for `desktopApi.js` | If the hosted Free AI fallback path is triggered at runtime, the module resolution throws and the task aborts. |
| **Stale `.js` reference in runtime error sync test** | `tests/desktop-runtime-js-error-sync.test.mjs:5` — `ENOENT` for `App.js` | Code that references emitted JS siblings will fail in production where only `.ts` source exists. |
| **Missing `AgentWorkflow.tsx` component** | `tests/desktop-assistant-engine.test.ts:41` — `ENOENT` for `AgentWorkflow.tsx` | The unified assistant-engine abstraction references a component that does not exist; may cause runtime import errors if that code path is reached. |

### P1 — Causes Unreliable Operation

| Bug | Evidence | Impact |
|-----|----------|--------|
| **Error wording mismatch in `openai_compat.rs`** | `tests/desktop-tauri-error-handling.test.ts:40` — expects `"Hosted Free AI fallback"`, gets `"remote provider"` | Users see confusing generic error messages instead of branded fallback wording, making troubleshooting harder. |
| **Provider default list drift** | `tests/desktop-paid-provider-support.test.ts:15` — expects `native_qwen_ollama`, gets `gorkh_free` | Test and source disagree on the launch-ready provider list. Indicates configuration drift between `llmConfig.ts` and tests. |
| **Updater capability too coarse** | `tests/desktop-background-updater.test.ts:51` — `updater:default` vs expected granular permissions | Uses blanket `updater:default` instead of explicit `allow-check`/`allow-download`/`allow-install`, violating the principle of least privilege. |
| **`screenshots` crate future incompatibility** | `cargo check` warning: `screenshots v0.8.10` | Future Rust versions may reject this dependency. Not immediate but needs tracking. |

### P2 — UX / Security Hardening

| Bug | Evidence | Impact |
|-----|----------|--------|
| **Overlay controller uses frosted glass** | `tests/desktop-overlay-controller.test.mjs:5` — rejects `backdropFilter: blur(...)` | `OverlayController.tsx` uses `backdropFilter: 'blur(12px) saturate(130%)'` when the design spec expects a transparent floating strip. |
| **Overlay shell uses fullscreen dim layer** | `tests/desktop-overlay-visual-shell.test.mjs:5` — rejects `backdropFilter: blur(...)` | `ActiveOverlayShell.tsx` uses `backdropFilter: 'blur(20px) saturate(140%)'` and `background: 'rgba(0,0,0,0.12)'` when the spec expects no fullscreen blur/dimming. |
| **No runtime coordinate math tests** | `tests/desktop-multi-display-control.test.mjs` only regex-checks code | Coordinate normalization (`resolve_display_point`) is not verified with actual numbers at runtime. |
| **No screenshot dimension validation tests** | `capture_display_png` resize ratio math is untested | Resizing from 2560×1440 → 1280×720 could have off-by-one or aspect-ratio bugs not caught in CI. |

---

## 6. Diagnostic Wiring Notes

The diagnostic test required **no source code modifications**. It works by:

1. Setting `globalThis.window.__TAURI_INTERNALS__.invoke` to a mock function before importing `aiAssist.ts`
2. `AiAssistController` calls `invoke` which delegates to `window.__TAURI_INTERNALS__.invoke`, so the mock intercepts all IPC
3. Mock returns fake screenshots and deterministic LLM proposals
4. Test drives the full state machine and asserts on call sequences

This pattern can be extended to test:
- Tool execution pipelines (mock `tool_execute` returns)
- Scroll/type/hotkey actions (mock `input_scroll`, `input_type`, `input_hotkey`)
- Multi-step loops (return sequences of 3+ proposals)
- Error recovery (mock `llm_propose_next_action` to throw, then succeed)

---

## 7. Summary Table

| Layer | Build | TypeCheck | Tests Pass | Tests Fail | Not Tested in CI |
|-------|-------|-----------|------------|------------|------------------|
| Desktop React | ✅ | ✅ | 173 | 8 | Screenshot pixel accuracy, input injection accuracy, app focus, multi-monitor hot-plug |
| Desktop Rust | ✅ | N/A | N/A | N/A | `capture_display_png` at runtime, `enigo` click accuracy, `ProviderRouter` (stubbed) |
| Shared TS | ✅ | ✅ | 7 | 0 | — |
| Agent Loop (legacy) | ✅ | ✅ | Diagnostic passes | — | Execution verification (before/after comparison) |
| Agent Loop (advanced) | ✅ | ✅ | Structural only | ProviderRouter stub | End-to-end advanced agent flow |

---

*End of failure map. No source files were modified except the addition of `tests/desktop-agent-pipeline.diagnostic.ts`.*
