# Remove Local AI / Ollama — Removal Map

**Status:** ✅ All items complete  
**Date:** 2026-04-28

---

## TypeScript Source Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `apps/desktop/src/lib/llmConfig.ts` | provider config | Remove `native_qwen_ollama`; make `gorkh_free` default; change `openai_compat` model to `custom-model` | ✅ Done |
| `apps/desktop/src/lib/localAi.ts` | local AI helper | Remove file | ✅ Deleted |
| `apps/desktop/src/state/providerStatus.ts` | provider state | Remove local AI branches | ✅ Done |
| `apps/desktop/src/components/SettingsPanel.tsx` | settings UI | Remove local AI sections; remove dead `LOCAL_AI_COMPATIBILITY_ERROR` handler | ✅ Done |
| `apps/desktop/src/App.tsx` | app routing | Remove local AI setup flow | ✅ Done |
| `apps/desktop/src/lib/assistantEngine.ts` | engine adapter | Remove native_qwen_ollama branch | ✅ Done |
| `apps/desktop/src/lib/aiAssist.ts` | legacy loop | Remove native_qwen_ollama branch; update comment | ✅ Done |
| `apps/desktop/src/lib/freeAiFallback.ts` | fallback | Remove dead `LOCAL_AI_COMPATIBILITY_ERROR` branch | ✅ Done |
| `apps/desktop/src/lib/gorkhKnowledge.ts` | knowledge base | Remove local AI/Ollama mentions | ✅ Done |
| `apps/desktop/src/lib/localPlan.ts` | local plan | Remove file | ✅ Deleted |
| `apps/desktop/src/components/agent/AgentProviderSelector.tsx` | provider selector | Remove native_qwen_ollama option | ✅ Done |
| `apps/desktop/src/lib/desktopTasks.ts` | API types | Rename `localAiPlan` → `hostedFreeAiPlan`, `freeLocalTaskLimit` → `freeHostedTaskLimit`, `visionBoostIncluded` → `visionIncluded` | ✅ Done |

## Rust Source Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `apps/desktop/src-tauri/src/lib.rs` | command registry | Remove `local_ai_*` commands | ✅ Done |
| `apps/desktop/src-tauri/src/local_ai.rs` | Rust module | Remove file | ✅ Deleted |
| `apps/desktop/src-tauri/src/local_ai_manifest.rs` | manifest | Remove file | ✅ Deleted |
| `apps/desktop/src-tauri/src/llm/native_ollama.rs` | LLM provider | Remove file | ✅ Deleted |
| `apps/desktop/src-tauri/src/agent/providers/native_ollama.rs` | agent provider | Remove file | ✅ Deleted |
| `apps/desktop/src-tauri/src/agent/providers/local_compat.rs` | compat wrapper | Remove file | ✅ Deleted |
| `apps/desktop/src-tauri/src/agent/providers/mod.rs` | provider routing | Remove native_ollama references | ✅ Done |
| `apps/desktop/src-tauri/src/agent/mod.rs` | agent module | Remove native_ollama references; update vision error message | ✅ Done |
| `apps/desktop/src-tauri/src/llm/mod.rs` | LLM module | Remove native_ollama references | ✅ Done |
| `apps/desktop/src-tauri/src/llm/error.rs` | error types | Remove Ollama-specific errors | ✅ Done |
| `apps/desktop/src-tauri/src/local_ai/model_compatibility.rs` | model compat | Remove file | ✅ Deleted |
| `apps/desktop/src-tauri/Cargo.toml` | dependencies | Remove `flate2`, `sha2`, `tar`, `zip`; drop `blocking` from `reqwest` | ✅ Done |

## Test Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `tests/desktop-local-ai-profile.test.ts` | local AI tests | Remove file | ✅ Deleted |
| `tests/desktop-local-ai-install-runtime.test.mjs` | install tests | Remove file | ✅ Deleted |
| `tests/desktop-local-ai-manager.test.mjs` | manager tests | Remove file | ✅ Deleted |
| `tests/desktop-local-plan-gating.test.ts` | plan gating | Remove file | ✅ Deleted |
| `tests/desktop-local-provider-runtime.test.mjs` | runtime tests | Remove file | ✅ Deleted |
| `tests/desktop-vision-escalation.test.mjs` | vision tests | Remove file; coverage replaced | ✅ Deleted |
| `tests/desktop-gorkh-ux-honesty.test.ts` | UX honesty | Update | ✅ Done |
| `tests/desktop-gorkh-grounding.test.ts` | grounding | Update | ✅ Done |
| `tests/desktop-gorkh-integration.test.ts` | integration | Update | ✅ Done |
| `tests/desktop-provider-default.test.ts` | provider default | Update | ✅ Done |
| `tests/desktop-free-ai-onboarding.test.ts` | onboarding | Update | ✅ Done |
| `tests/desktop-chat-free-ai-setup.test.ts` | chat setup | Update | ✅ Done |
| `tests/desktop-paid-provider-support.test.ts` | paid providers | Update | ✅ Done |
| `tests/desktop-tauri-error-handling.test.ts` | error handling | Update | ✅ Done |
| `tests/desktop-free-ai-hosted-fallback.test.ts` | hosted fallback | Replace `LOCAL_AI_COMPATIBILITY_ERROR` assertion | ✅ Done |
| `tests/desktop-agent-pipeline.diagnostic.ts` | pipeline | Update | ✅ Done |
| `tests/desktop-agent-verification.diagnostic.ts` | verification | Update | ✅ Done |
| `tests/desktop-provider-capabilities-after-local-ai-removal.test.ts` | provider capabilities | **New** — coverage for vision, launch list, enum, marketing, error codes | ✅ Added |

## Documentation Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `docs/implementation/legacy-computer-use-reliability-patch-v1.md` | impl doc | Historical; no action needed | ✅ Keep historical |
| `docs/testing/native-desktop-computer-use-validation.md` | validation checklist | Historical; no action needed | ✅ Keep historical |
| `README.md` | readme | Rewrite Free AI section; remove local AI setup | ✅ Done |
| `AGENTS.md` | agent guidance | Remove Ollama + Qwen from tech stack; update skill description | ✅ Done |
| `docs/implementation/local-ai-removal-final-report.md` | final report | Update with cleanup pass results | ✅ Done |
| `docs/implementation/no-local-ai-final-reference-audit.md` | audit | **New** — documents all remaining references and decisions | ✅ Added |
| `docs/implementation/native-validation-checklist.md` | checklist | Updated with current status | ✅ Done |

## Backend/API Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `apps/api/src/routes/free.ts` | free tier | Keep hosted fallback | ✅ Preserved |
| `apps/api/src/config.ts` | config | Keep | ✅ Preserved |
| `apps/api/src/index.ts` | free AI routes | Keep; rename billing fields | ✅ Done |
| `apps/api/src/lib/desktop-account.ts` | account snapshot | Rename billing fields | ✅ Done |
| `apps/api/src/lib/error-tracking.ts` | error tracking | Update provider example comment | ✅ Done |

## Shared Package Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `packages/shared/src/llm-error.ts` | error codes | Remove `LOCAL_AI_ERROR` (unreferenced) | ✅ Done |

## Generated Artifacts

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `apps/desktop/src/lib/*.d.ts` | stale declarations | Delete (tsconfig has `noEmit: true`) | ✅ Deleted |
| `apps/desktop/src/lib/*.d.ts.map` | stale source maps | Delete | ✅ Deleted |
| `apps/desktop/src/components/*.d.ts` | stale declarations | Delete | ✅ Deleted |
| `apps/desktop/src/components/*.d.ts.map` | stale source maps | Delete | ✅ Deleted |
| `apps/desktop/src/state/*.d.ts` | stale declarations | Delete | ✅ Deleted |
| `apps/desktop/src/state/*.d.ts.map` | stale source maps | Delete | ✅ Deleted |
| `packages/shared/dist/*` | generated dist | Regenerate | ✅ Regenerated |
| `apps/desktop/dist/*` | generated dist | Regenerate | ✅ Regenerated |
| `apps/api/dist/*` | generated dist | Regenerate | ✅ Regenerated |

## Package/Build Files

| File | Reference Type | Decision | Status |
|------|---------------|----------|--------|
| `package.json` | scripts | Audit — no local-AI-specific scripts found | ✅ Verified |
| `apps/desktop/package.json` | scripts | Audit — no local-AI-specific scripts found | ✅ Verified |
| `apps/desktop/src-tauri/Cargo.toml` | deps | `enigo` and `screenshots` kept for capture/input | ✅ Verified |

---

## Open Items

None. All items are complete.

## Historical Docs (Intentionally Preserved)

- `docs/plans/2026-03-*.md`
- `docs/plans/adaptive-local-ai-runtime.md`
- `docs/audits/computer-use-runtime-audit.md`
- `docs/audits/computer-use-failure-map.md`
- `docs/qwen-agent-integration.md`
- `docs/qwen-vision-engine.md`
- `docs/byo-key-diagnosis.md`
- `docs/implementation/ci-stabilization-review.md`

These documents describe historical architecture and decisions. They are clearly historical and do not affect runtime.
