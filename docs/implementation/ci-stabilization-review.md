# CI Stabilization Review — Legacy Computer-Use Reliability Patch v1

Date: 2026-04-28  
Branch: `feature/byo-key-fix`  
Scope: Fix 6 targeted test failures + 1 security-config test drift introduced by the fix.

---

## A. Overlay Changes

### What changed
- **`OverlayController.tsx`**: Removed `backdropFilter: 'blur(12px) saturate(130%)'` and `WebkitBackdropFilter`.
- **`ActiveOverlayShell.tsx`**: Removed the fullscreen translucent dim layer's `backdropFilter: 'blur(20px) saturate(140%)'` and `WebkitBackdropFilter`.

### Why
Tests `desktop-overlay-controller.test.mjs` and `desktop-overlay-visual-shell.test.mjs` assert that the overlay must not use frosted-glass or fullscreen blur treatments. The design intent is a transparent floating control strip, not a centered glass card.

### Validation
- Approval controls (Stop, Pause/Resume, Details, Settings) remain rendered inside `OverlayController`.
- Status label, provider badge, goal text, and message preview remain present.
- `ActiveOverlayShell` still renders the fixed-position top-left status pill with the GORKH brand and green pulse dot.
- No `backdropFilter` or `blur` strings remain in either overlay source file.
- Overlay mode is still toggled by `isOverlayActive` in `App.tsx`; the shell and controller still render only when active.

### Files changed
- `apps/desktop/src/components/OverlayController.tsx`
- `apps/desktop/src/components/ActiveOverlayShell.tsx`

---

## B. Provider List Change

### What changed
- Removed `'gorkh_free'` from `LAUNCH_PROVIDER_ORDER` in `apps/desktop/src/lib/llmConfig.ts`.
- Updated `tests/desktop-paid-provider-support.test.ts` to account for `FREE_AI_ENABLED` gating of `native_qwen_ollama`.

### Why
`gorkh_free` is the **hosted fallback** provider. It is not a user-selectable primary desktop-control provider and should not appear in the launch-facing list. The test expected only launch-ready providers (`native_qwen_ollama`, `openai`, `claude`).

### How hosted fallback remains available
- `gorkh_free` stays in `ALL_PROVIDER_ORDER` and `PROVIDER_DEFINITIONS`.
- `DEFAULT_NEW_USER_PROVIDER` is still `gorkh_free` for onboarding flows that route new users to the hosted path.
- `resolveHostedFreeAiBinding()`, `canUseHostedFreeAiFallback()`, and `shouldRetryWithHostedFreeAiFallback()` are unchanged and continue to work.
- The hosted fallback is triggered automatically when local AI compatibility fails (`LOCAL_AI_COMPATIBILITY_ERROR`) or when the device bootstrap signals `hostedFreeAiEnabled`.

### `native_qwen_ollama` visibility
- When `FREE_AI_ENABLED === true` (build-time flag `VITE_FREE_AI_ENABLED=true`): `native_qwen_ollama` is included in `getSupportedLlmProviders()`.
- When `FREE_AI_ENABLED === false` (default in tests and production builds without the flag): `native_qwen_ollama` is filtered out. This matches the product intent to hide the local Free AI option when the feature is disabled.
- The updated test now dynamically expects `['native_qwen_ollama', 'openai', 'claude']` when `FREE_AI_ENABLED` is true, and `['openai', 'claude']` when false.

### Text-only providers are not advertised as screenshot desktop-control providers
- `openai_compat`, `deepseek`, `minimax`, and `kimi` remain in `getAdvancedLlmProviders()`, not in `LAUNCH_PROVIDER_ORDER`.
- The launch list therefore only contains providers known to support vision + desktop control: `native_qwen_ollama` (local, vision-capable), `openai`, `claude`.

### Files changed
- `apps/desktop/src/lib/llmConfig.ts`
- `tests/desktop-paid-provider-support.test.ts`

---

## C. Updater Permissions

### What changed
- `apps/desktop/src-tauri/capabilities/default.json` replaced `"updater:default"` with:
  - `"updater:allow-check"`
  - `"updater:allow-download"`
  - `"updater:allow-install"`
  - `"process:allow-restart"`
- Updated `tests/desktop-security-config.test.mjs` to match.

### Why
`desktop-background-updater.test.ts` asserts explicit granular permissions. Using explicit permissions is **least privilege** compared to the coarse `updater:default` preset.

### Security confirmation
- No broad `shell`, `fs`, `opener`, or `clipboard` permissions were added.
- The capability still targets only the `main` window.
- The `desktop-ipc` custom permission remains the only non-core permission aside from updater/process.
- `tauri.conf.json` still does not enable `shell`, `fs`, or `cli` plugins.
- The Tauri process plugin is required for `process:allow-restart`, which the in-app updater uses after `updater:allow-install`.

### Files changed
- `apps/desktop/src-tauri/capabilities/default.json`
- `tests/desktop-security-config.test.mjs`

---

## D. Free AI Fallback Endpoint

### What changed
- `apps/desktop/src/lib/freeAiFallback.ts`: `testHostedFreeAiFallback` endpoint changed from `/chat/completions` **back** to `/models`.
- `tests/desktop-free-ai-hosted-fallback.test.ts`: Updated expectation and mock response to match `/models`.

### Why `/models` is correct
`testHostedFreeAiFallback` is a **health / connectivity probe**. The backend exposes:
- `GET /desktop/free-ai/v1/models` — lightweight, authenticated list of available models. Does **not** consume a task quota or invoke an LLM.
- `POST /desktop/free-ai/v1/chat/completions` — full inference endpoint. **Does** consume quota / billing / provider tokens.

Using `/chat/completions` for a connectivity test would waste user quota on every settings-panel "Test Connection" click or bootstrap readiness check. The original source used `/models`; the test incorrectly expected `/chat/completions`. We corrected the test to match the lightweight endpoint.

### Quota / billing / key safety
- No user BYO provider key is sent to the hosted fallback endpoint. The hosted fallback uses the desktop device token (`apiKeyOverride: deviceToken`) as a bearer token for GORKH's own backend proxy.
- No provider key is stored in `localStorage`. Keys are stored in the OS keychain (Tauri `stronghold` / platform keychain APIs).
- The `/models` call is `GET`, carries only the device bearer header, and returns a static model list.

### Files changed
- `apps/desktop/src/lib/freeAiFallback.ts`
- `tests/desktop-free-ai-hosted-fallback.test.ts`

---

## E. Error Wording

### What changed
- `apps/desktop/src-tauri/src/llm/openai_compat.rs`: Added `is_hosted_free_ai_fallback_endpoint()` helper and updated error messages in both `propose_next_action` and `conversation_turn` to distinguish three cases:
  1. **Local Ollama/native model** (`localhost` / `127.0.0.1`) → `"local LLM server"`
  2. **Hosted GORKH Free fallback** (`/desktop/free-ai/v1`) → `"Hosted Free AI fallback"`
  3. **Custom remote provider** (everything else) → `"remote provider"`

### Error differentiation
| Scenario | HTTP 401 message | HTTP 404 message |
|----------|------------------|------------------|
| Local | `"local LLM server requires authentication..."` | `"local LLM server returned 404..."` |
| Hosted fallback | `"Hosted Free AI fallback requires desktop sign-in. Sign out and sign back in, then try again."` | `"Hosted Free AI fallback returned 404. Ensure the desktop API exposes /desktop/free-ai/v1/chat/completions. Error: ..."` |
| Remote provider | `"remote provider requires authentication..."` | `"remote provider returned 404..."` |

### Why
`desktop-tauri-error-handling.test.ts` asserts that hosted fallback errors must use hosted-specific wording so the frontend can surface actionable guidance (e.g., "sign out and sign back in") instead of generic "check your API key" copy. The Rust `local_compat.rs` provider already had this wording; `openai_compat.rs` was missing it.

### Files changed
- `apps/desktop/src-tauri/src/llm/openai_compat.rs`

---

## Patch v1 Regression Guards

Diagnostics run:

```bash
node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts
node --import tsx --test tests/desktop-agent-verification.diagnostic.ts
```

Results: **7/7 pass**

| Guard | Status |
|-------|--------|
| Screenshot dimensions sent to `llm_propose_next_action` | ✅ |
| Coordinate clamp / rejection prevents out-of-bounds native input | ✅ |
| NaN / Infinity cannot reach `input_click` / `input_double_click` | ✅ |
| Raw screenshot base64 is not stored in `actionResults` / history / logs | ✅ |
| Verification failure context is included in next LLM proposal request | ✅ |
| Missed click does not mark task done blindly | ✅ |
| Repeated same action triggers stuck-loop protection | ✅ |

---

## Commands Run with Pass/Fail

| Command | Result |
|---------|--------|
| `pnpm --filter @ai-operator/desktop typecheck` | ✅ Pass |
| `pnpm --filter @ai-operator/shared typecheck` | ✅ Pass |
| `pnpm --filter @ai-operator/desktop build` | ✅ Pass |
| `cd apps/desktop/src-tauri && cargo check` | ✅ Pass |
| `cd apps/desktop/src-tauri && cargo clippy --all-targets -- -D warnings` | ✅ Pass |
| `node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts` | ✅ Pass |
| `node --import tsx --test tests/desktop-agent-verification.diagnostic.ts` | ✅ Pass |
| `node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*` | ✅ 181/181 pass |
| `node --import tsx --test --test-force-exit tests/*.test.mjs tests/*.test.ts` | ✅ 291 pass / 7 fail / 1 skip |

---

## Files Changed in This Stabilization Pass

1. `apps/desktop/src/components/OverlayController.tsx`
2. `apps/desktop/src/components/ActiveOverlayShell.tsx`
3. `apps/desktop/src/lib/llmConfig.ts`
4. `apps/desktop/src/lib/freeAiFallback.ts`
5. `apps/desktop/src-tauri/capabilities/default.json`
6. `apps/desktop/src-tauri/src/llm/openai_compat.rs`
7. `tests/desktop-paid-provider-support.test.ts`
8. `tests/desktop-free-ai-hosted-fallback.test.ts`
9. `tests/desktop-security-config.test.mjs`
10. `docs/testing/full-suite-failure-accounting.md` (new)
11. `docs/implementation/ci-stabilization-review.md` (new)

---

## Remaining Risks

1. **7 pre-existing test failures remain** (see `docs/testing/full-suite-failure-accounting.md`). None are in computer-use, provider, or desktop-security surfaces, but they indicate drift in web portal copy, API session management, and release workflow YAML.
2. **AdvancedAgent is still non-functional** — the `ProviderRouter` stub was not addressed in this patch and remains out of scope.
3. **`cargo test` for Rust was not run** in this pass. The Tauri command tests should be run before merging to ensure no Rust-side regressions from the coordinate clamping and prompt changes in Patch v1.
4. **Packaged app validation** (`smoke:final`) was not re-run. The overlay visual changes and permission changes should be validated in a real packaged build before release.
5. **`desktop-session` API test failure** (`api-desktop-session.test.mjs`) suggests a possible auth-layer regression unrelated to our changes, but it could block CI if the full suite is treated as mandatory.

---

## Recommended Next Prompt

> Run `cargo test` in `apps/desktop/src-tauri`, then run `pnpm smoke:final`. If any failures appear in computer-use runtime, provider fallback, or desktop security, fix them. Otherwise, summarize the Rust test results and packaged smoke status, and flag whether the 7 pre-existing web/API/workflow failures should be addressed before merging `feature/byo-key-fix`.
