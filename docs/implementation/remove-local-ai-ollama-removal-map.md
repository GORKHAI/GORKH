# Remove Local AI / Ollama — Removal Map

## TypeScript Source Files

| File | Reference Type | Decision | Reason |
|------|---------------|----------|--------|
| `apps/desktop/src/lib/llmConfig.ts` | provider config | **remove/replace** | Remove `native_qwen_ollama` from `LlmProvider`, `LlmRuntimeProvider`, `DEFAULT_LLM_PROVIDER`, `PROVIDER_DEFINITIONS`, `LAUNCH_PROVIDER_ORDER`, `ALL_PROVIDER_ORDER`. Make `gorkh_free` the default. |
| `apps/desktop/src/lib/localAi.ts` | local AI helper | **remove file** | Entire file is local AI runtime helpers. Delete and update imports. |
| `apps/desktop/src/state/providerStatus.ts` | provider state | **remove local AI branches** | Remove `native_qwen_ollama` status tracking, local AI readiness checks. |
| `apps/desktop/src/components/SettingsPanel.tsx` | settings UI | **remove local AI sections** | Remove install/repair/start/stop UI, local model tier selector, Vision Boost toggle, Ollama-specific setup copy. |
| `apps/desktop/src/App.tsx` | app routing | **remove local AI setup flow** | Remove FreeAiSetupCard, local AI onboarding gating, managed runtime status checks. |
| `apps/desktop/src/lib/assistantEngine.ts` | engine adapter | **remove native_qwen_ollama branch** | Clean up provider routing for removed local provider. |
| `apps/desktop/src/lib/aiAssist.ts` | legacy loop | **remove native_qwen_ollama branch** | Clean up provider routing for removed local provider. |
| `apps/desktop/src/lib/freeAiFallback.ts` | fallback | **keep** | Hosted fallback is preserved. Minor copy updates if needed. |
| `apps/desktop/src/lib/gorkhKnowledge.ts` | knowledge base | **update copy** | Remove local AI/Ollama mentions from provider explanations. |
| `apps/desktop/src/lib/localPlan.ts` | local plan | **remove file** | Entire file is local AI plan/entitlement logic. |
| `apps/desktop/src/components/agent/AgentProviderSelector.tsx` | provider selector | **remove native_qwen_ollama option** | Clean up provider list rendering. |

## Rust Source Files

| File | Reference Type | Decision | Reason |
|------|---------------|----------|--------|
| `apps/desktop/src-tauri/src/lib.rs` | command registry | **remove local AI commands** | Remove `local_ai_*` command functions and Tauri command registration. Keep screen capture and input injection. |
| `apps/desktop/src-tauri/src/local_ai.rs` | Rust module | **remove file** | Entire module is Ollama/local AI runtime management. |
| `apps/desktop/src-tauri/src/local_ai_manifest.rs` | manifest | **remove file** | Local model manifest for managed installs. |
| `apps/desktop/src-tauri/src/llm/native_ollama.rs` | LLM provider | **remove file** | Native Ollama LLM provider implementation. |
| `apps/desktop/src-tauri/src/agent/providers/native_ollama.rs` | agent provider | **remove file** | Agent-specific Ollama provider wrapper. |
| `apps/desktop/src-tauri/src/agent/providers/mod.rs` | provider routing | **remove native_ollama references** | Clean up provider enum/factory. |
| `apps/desktop/src-tauri/src/agent/mod.rs` | agent module | **remove native_ollama references** | Clean up provider imports. |
| `apps/desktop/src-tauri/src/llm/mod.rs` | LLM module | **remove native_ollama references** | Clean up provider imports, build_user_prompt if needed. |
| `apps/desktop/src-tauri/src/llm/error.rs` | error types | **remove Ollama-specific errors if any** | Keep general errors. |
| `apps/desktop/src-tauri/src/local_ai/model_compatibility.rs` | model compat | **remove file** | Ollama model compatibility checking. |
| `apps/desktop/src-tauri/Cargo.toml` | dependencies | **audit** | Check if `enigo`/`screenshots` are only deps used by non-local-AI code. Keep them. Do not remove them. |

## Test Files

| File | Reference Type | Decision | Reason |
|------|---------------|----------|--------|
| `tests/desktop-local-ai-profile.test.ts` | local AI tests | **remove file** | Entire file tests local AI profile behavior. |
| `tests/desktop-gorkh-ux-honesty.test.ts` | UX honesty | **update** | Remove local AI mentions, update provider expectations. |
| `tests/desktop-gorkh-grounding.test.ts` | grounding | **update** | Remove local AI context block expectations. |
| `tests/desktop-gorkh-integration.test.ts` | integration | **update** | Remove `native_qwen_ollama` from expected providers. |
| `tests/desktop-provider-default.test.ts` | provider default | **update** | Change default from `native_qwen_ollama` to `gorkh_free`. |
| `tests/desktop-free-ai-onboarding.test.ts` | onboarding | **update** | Remove Ollama setup expectations. |
| `tests/desktop-chat-free-ai-setup.test.ts` | chat setup | **update** | Remove local AI setup card expectations. |
| `tests/desktop-paid-provider-support.test.ts` | paid providers | **update** | Remove `native_qwen_ollama` from launch list expectations. |
| `tests/desktop-tauri-error-handling.test.ts` | error handling | **update** | Remove Ollama-specific error expectations if any. |
| `tests/desktop-free-ai-hosted-fallback.test.ts` | hosted fallback | **keep** | Preserved. Minor copy updates if needed. |
| `tests/desktop-agent-pipeline.diagnostic.ts` | pipeline | **update** | Remove `native_qwen_ollama` provider references. |
| `tests/desktop-agent-verification.diagnostic.ts` | verification | **update** | Remove `native_qwen_ollama` provider references. |

## Documentation Files

| File | Reference Type | Decision | Reason |
|------|---------------|----------|--------|
| `docs/implementation/legacy-computer-use-reliability-patch-v1.md` | impl doc | **update** | Remove local AI validation steps. |
| `docs/testing/native-desktop-computer-use-validation.md` | validation checklist | **update** | Remove Ollama/local AI sections. Add GORKH Free hosted tier tests. |
| `README.md` | readme | **update** | Remove local AI setup instructions. |
| `AGENTS.md` | agent guidance | **update** | Remove local AI/Ollama references. |
| Various docs in `docs/` | product docs | **audit/update** | Remove local AI claims. |

## Backend/API Files

| File | Reference Type | Decision | Reason |
|------|---------------|----------|--------|
| `apps/api/src/routes/free.ts` | free tier | **keep** | DeepSeek free tier proxy is preserved. |
| `apps/api/src/config.ts` | config | **keep** | `DEEPSEEK_FREE_TIER_API_KEY` is preserved. |
| `apps/api/src/index.ts` | free AI routes | **keep** | Hosted free AI routes preserved. |

## Package/Build Files

| File | Reference Type | Decision | Reason |
|------|---------------|----------|--------|
| `package.json` | scripts | **audit** | Remove local-AI-specific scripts if any. |
| `apps/desktop/package.json` | scripts | **audit** | Remove local-AI-specific scripts if any. |
| `apps/desktop/src-tauri/Cargo.toml` | deps | **audit** | Check if any deps are local-AI-only. `enigo` and `screenshots` stay for capture/input. |
