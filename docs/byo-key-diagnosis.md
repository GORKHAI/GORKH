# BYO-Key Provider Configuration Flow — Diagnosis Report

> **Scope**: Read-only diagnostic analysis of the DeepSeek (and other BYO-key) provider configuration bug where Settings UI shows "configured" but Chat UI shows the empty-state "I don't have an AI provider configured yet."
>
> **Date**: 2026-04-28
> **Branch**: `feature/desktop-ux-fixes`
> **Affected Providers**: DeepSeek, Kimi (Moonshot), MiniMax, OpenAI, Claude

---

## 1. Executive Summary

The contradiction is caused by **two separate bugs** acting together:

1. **Stale `providerConfigured` state in `App.tsx`**. When the user saves an API key in `SettingsPanel`, the panel updates its own local `hasKey` state but never notifies the parent `App.tsx` to re-check `providerConfigured`. The `providerConfigured` flag only refreshes when the provider selection changes or when the local AI runtime status changes — neither of which happens after a simple key save.

2. **Greeting race condition with a permanent guard**. The initial chat greeting is seeded in a `useEffect` that runs while `providerConfigured` is still `false` (its initial value). Once the greeting is seeded, a `useRef` guard (`assistantGreetingSeededRef`) permanently blocks re-evaluation, so even when `providerConfigured` later becomes `true`, the empty-state message remains stuck in the `messages` array.

Keychain naming is **consistent** across all paths (`llm_api_key:deepseek`). There are **no key name mismatches**.

---

## 2. Step-by-Step Data Flow (Settings → Chat)

### Step 1 — Settings UI saves the API key

**File**: `apps/desktop/src/components/SettingsPanel.tsx` (lines 194–219)

```tsx
const result = await invoke<{ ok: boolean; error?: string }>('set_llm_api_key', {
  provider: settings.provider,  // "deepseek"
  key: apiKey.trim(),
});
if (result.ok) {
  setHasKey(true);              // ← local to SettingsPanel only
  setApiKey('');
  setTestResult({ success: true, message: 'API key saved successfully!' });
}
```

- **Rust command**: `set_llm_api_key` (`lib.rs:1696`) writes to the OS keychain under the account name `llm_api_key:deepseek`.
- **Bug**: `SettingsPanel` does **not** call any parent callback (e.g. `onLlmSettingsChange`) after saving the key. `App.tsx` is unaware the keychain changed.

### Step 2 — Settings UI tests the connection

**File**: `apps/desktop/src/components/SettingsPanel.tsx` (lines 239–280)

```tsx
// 1. Check key exists
const has = await invoke<boolean>('has_llm_api_key', { provider: settings.provider });
// 2. Make a real LLM call
const result = await invoke<{ kind: string; message?: string }>(
  'assistant_conversation_turn',
  {
    params: {
      provider: settings.provider,   // "deepseek"
      baseUrl: settings.baseUrl,     // "https://api.deepseek.com"
      model: settings.model,         // "deepseek-chat"
      messages: [{ role: 'user', text: 'Hello' }],
      appContext: null,
      apiKeyOverride: null,
    },
  }
);
```

- Both paths read the keychain directly at call time. They do **not** depend on `App.tsx`'s `providerConfigured` state.
- If the key is valid, the test succeeds and `SettingsPanel` displays a green success message.

### Step 3 — Chat UI checks `providerConfigured`

**File**: `apps/desktop/src/App.tsx` (lines 518–528)

```tsx
const refreshProviderConfigured = useCallback(async () => {
  setProviderCheckBusy(true);
  try {
    const configured = await hasLlMProviderConfigured(llmSettings.provider);
    setProviderConfigured(configured);
  } catch {
    setProviderConfigured(false);
  } finally {
    setProviderCheckBusy(false);
  }
}, [llmSettings.provider]);
```

**File**: `apps/desktop/src/lib/aiAssist.ts` (lines 97–120)

```ts
export async function hasLlMProviderConfigured(provider: LlmProvider): Promise<boolean> {
  if (provider === 'native_qwen_ollama') { /* check local AI runtime */ }
  if (!providerRequiresApiKey(provider)) { return true; }
  return await invoke<boolean>('has_llm_api_key', { provider });
}
```

For DeepSeek:
- `providerRequiresApiKey('deepseek')` → `true` (from `llmConfig.ts` line 96)
- Calls `has_llm_api_key('deepseek')` → reads `llm_api_key:deepseek` from keychain

### Step 4 — `providerConfigured` is only refreshed on specific triggers

**File**: `apps/desktop/src/App.tsx` (lines 756–773)

```tsx
useEffect(() => {
  let cancelled = false;
  void refreshProviderConfigured().catch(() => { /* ... */ });
  if (llmSettings.provider === 'gorkh_free') {
    void refreshFreeTierUsage();
  }
  return () => { cancelled = true; };
}, [
  refreshProviderConfigured,
  localAiStatus?.runtimeRunning,
  llmSettings.provider,
  refreshFreeTierUsage,
]);
```

**Dependency array analysis**:

| Event | Triggers re-check? |
|---|---|
| User changes provider in Settings | ✅ `llmSettings.provider` changes |
| Local AI runtime starts/stops | ✅ `localAiStatus?.runtimeRunning` changes |
| User saves API key for current provider | ❌ **No dependency changes** |
| User clears API key for current provider | ❌ **No dependency changes** |
| Settings panel opens/closes | ❌ **No dependency changes** |

**Result**: After saving a key, `providerConfigured` in `App.tsx` remains `false` until the user switches providers or the local AI runtime changes state.

### Step 5 — Chat send handler blocks on stale `providerConfigured`

**File**: `apps/desktop/src/App.tsx` (lines 2284–2337)

```tsx
if (!providerConfigured) {
  if (llmSettings.provider === DEFAULT_LLM_PROVIDER) {
    // Free AI setup flow
  }
  setMessages((prev) => [
    ...prev,
    createChatItem('agent', GORKH_ONBOARDING.providerNotConfigured),
  ]);
  return;
}
```

Because `providerConfigured` is stale `false`, every user message triggers the empty-state response instead of starting a conversation.

---

## 3. Secondary Bug: Greeting Race Condition

**File**: `apps/desktop/src/App.tsx` (lines 2904–2943)

```tsx
useEffect(() => {
  if (assistantGreetingSeededRef.current || messages.length > 0) return;

  assistantGreetingSeededRef.current = true;   // ← PERMANENT guard
  const setupMessage = !providerConfigured
    ? createChatItem('agent', GORKH_ONBOARDING.providerNotConfigured)
    : null;
  setMessages((prev) => /* seed greeting */);
}, [
  authState, isSignedIn, llmSettings.provider,
  localAiInstallProgress?.message, localAiRecommendation?.reason,
  messages.length, providerConfigured, status,
]);
```

### How the race plays out

1. App mounts → `providerConfigured` initial state is `false`.
2. The `useEffect` runs **synchronously** after paint.
3. `assistantGreetingSeededRef.current` is flipped to `true`.
4. The "not configured" greeting is added to `messages`.
5. A few milliseconds later, `refreshProviderConfigured()` async Promise resolves and sets `providerConfigured = true`.
6. The effect re-runs because `providerConfigured` changed, but returns immediately at the `assistantGreetingSeededRef.current` guard.
7. The stale "not configured" message is now **permanently embedded** in the `messages` array.

**Impact**: Even if the user restarts the app with a valid saved key, the empty-state copy can still appear in the chat history on first load.

---

## 4. Hardcoded Provider Lists

### 4.1 `AgentTaskDialog.tsx` — `isPaidProvider` excludes new BYO-key providers

**File**: `apps/desktop/src/components/agent/AgentTaskDialog.tsx` (line 45)

```tsx
const isPaidProvider = (p: ProviderType | null) => p === 'openai' || p === 'claude';
```

- **Missing**: `deepseek`, `kimi`, `minimax`
- **Effect**: Cost warning modal is not shown for DeepSeek/Kimi/MiniMax in the advanced agent task dialog.
- **Fix**: Replace with `isPaidLlmProvider(p)` from `llmConfig.ts`.

### 4.2 `aiAssist.ts` — `modelSupportsVision` only explicitly handles Claude and OpenAI

**File**: `apps/desktop/src/lib/aiAssist.ts` (lines 85–93)

```ts
if (provider === 'claude') return true;
if (provider === 'openai') return normalized.includes('gpt-4o') || normalized.includes('vision');
return normalized.includes('vl') || normalized.includes('vision') || normalized.includes('llava');
```

- DeepSeek vision models (e.g. `deepseek-vl`) would fall through to the heuristic check, which happens to work for model names containing `"vl"`.
- Not an active bug, but a maintenance risk.

### 4.3 `llmConfig.ts` — `LAUNCH_PROVIDER_ORDER` is intentionally limited

**File**: `apps/desktop/src/lib/llmConfig.ts` (lines 149–154)

```ts
const LAUNCH_PROVIDER_ORDER: LlmProvider[] = [
  'gorkh_free',
  'native_qwen_ollama',
  'openai',
  'claude',
];
```

- Advanced providers (`deepseek`, `minimax`, `kimi`, `openai_compat`) are deliberately excluded from the "launch" tier.
- **Risk**: Any UI code that iterates `LAUNCH_PROVIDER_ORDER` and assumes it covers all providers will silently omit advanced providers.
- `getSupportedLlmProviders()` and `getAllLlmProviders()` already handle this correctly.

---

## 5. Keychain Naming Audit

| Command | File | Keychain account pattern | DeepSeek account name |
|---|---|---|---|
| `set_llm_api_key` | `lib.rs:1697` | `llm_api_key:{provider}` | `llm_api_key:deepseek` |
| `has_llm_api_key` | `lib.rs:1711` | `llm_api_key:{provider}` | `llm_api_key:deepseek` |
| `clear_llm_api_key` | `lib.rs:1716` | `llm_api_key:{provider}` | `llm_api_key:deepseek` |
| `resolve_llm_api_key` | `lib.rs:1782–1794` | `llm_api_key:{provider}` | `llm_api_key:deepseek` |
| `set_provider_api_key` | `lib.rs:2281` | `llm_api_key:{provider_type}` | `llm_api_key:deepseek` |
| `has_provider_api_key` | `lib.rs:2287` | `llm_api_key:{provider_type}` | `llm_api_key:deepseek` |
| `is_agent_provider_available` | `lib.rs:2231` | `llm_api_key:{provider_type}` | `llm_api_key:deepseek` |

**Verdict**: ✅ **No mismatches**. All commands use the same `llm_api_key:deepseek` naming convention.

---

## 6. "Free AI" Copy Bug

**File**: `apps/desktop/src/lib/gorkhKnowledge.ts` (lines 208–210)

```ts
providerNotConfigured:
  "I don't have an AI provider configured yet. To get started, " +
  "you can set up Free AI (runs locally on your Mac, no fees) or enter an API key for a paid provider like OpenAI or Claude.",
```

### Issues

1. **Provider-specificity**: When the user has selected **DeepSeek** (or Kimi / MiniMax) but has not configured it, the message still says "OpenAI or Claude". It never mentions the provider the user actually chose.
2. **Feature-flag gate**: The message is **not** gated behind `FREE_AI_ENABLED`. If the free tier is disabled at compile time, the user is still told to "set up Free AI".
3. **Platform assumption**: "runs locally on your Mac" assumes macOS; the desktop app also targets Windows.

---

## 7. Forward Compatibility — `feature/gorkh-free-tier`

The in-flight `feature/gorkh-free-tier` branch adds `ProviderType::GorkhFree` to the Rust agent system. The current codebase already has partial `gorkh_free` support. Here are the forward-compatibility gaps:

| Layer | `gorkh_free` handled? | Notes |
|---|---|---|
| Rust `llm::create_provider` | ✅ Yes | `llm/mod.rs:638` |
| Rust `agent_provider_kind` | ✅ Yes | `lib.rs:2216` |
| Rust `is_agent_provider_available` | ✅ Yes | `lib.rs:2234` |
| Rust `resolve_llm_api_key` | ✅ Yes (fallback) | `_ => Ok(String::new())` returns empty key |
| TS `llmConfig.ts` `LlmProvider` | ✅ Yes | Included in union type and all lists |
| TS `llmConfig.ts` `PROVIDER_DEFINITIONS` | ✅ Yes | `requiresApiKey: false` |
| TS `aiAssist.ts` `hasLlMProviderConfigured` | ✅ Yes | Falls through to `!providerRequiresApiKey` → `true` |
| TS `advancedAgent.ts` `ProviderType` | ❌ **Missing** | Only has `native_qwen_ollama`, `local_openai_compat`, `openai`, `claude`, `deepseek`, `kimi` |
| TS `assistantEngine.ts` `mapAdvancedProvider` | ❌ **Missing** | No `case 'gorkh_free'`; falls through to `default` → `{ provider: 'openai', credentialProvider: 'openai' }` which is wrong |
| TS `AgentTaskDialog.tsx` `isPaidProvider` | ✅ N/A | `gorkh_free` is free, so exclusion is correct behavior |

**Risk**: If the advanced agent system is ever invoked with `gorkh_free` selected, it will mis-route the provider to OpenAI and fail.

---

## 8. Hypothesis Ranking

| Rank | Hypothesis | Evidence | Likelihood |
|---|---|---|---|
| **1** | **Stale `providerConfigured` after key save** | `SettingsPanel` saves key locally only; `App.tsx` effect has no keychain-related dependencies. Test Connection reads keychain directly and succeeds. | **Confirmed** |
| **2** | **Greeting race with permanent `useRef` guard** | `assistantGreetingSeededRef.current` is set on first run and never cleared. Effect deps include `providerConfigured` but guard blocks re-evaluation. | **Confirmed** |
| **3** | Keychain key name mismatch | Audit shows all paths use `llm_api_key:deepseek`. Test Connection and `has_llm_api_key` both succeed when key is present. | Ruled out |
| **4** | Stale compiled `.js` files | `.js` timestamps are newer than `.ts` sources (Apr 28 10:02 vs Apr 27 23:13). `pnpm build` runs `tsc && vite build`, so emitted JS is up-to-date. | Ruled out |
| **5** | `llmSettings.provider` is not `"deepseek"` in App.tsx | `localStorage` load uses `mergeLlmSettings` which preserves valid providers. `isLlmProvider('deepseek')` is `true`. | Ruled out |

---

## 9. Recommended Fix Scope

### 9.1 Critical — Fix stale `providerConfigured` state

**Option A (minimal)**: Add an `onProviderConfiguredChange` callback prop to `SettingsPanel`.

- In `SettingsPanel.tsx`, after `handleSaveKey` succeeds and after `handleClearKey` succeeds, call a new prop such as `onApiKeySaved?.()`.
- In `App.tsx`, implement `onApiKeySaved` to call `refreshProviderConfigured()`.

**Option B (robust)**: Move `providerConfigured` (and the keychain check) into a reactive store or React context that both `App.tsx` and `SettingsPanel` subscribe to. This eliminates the parent-child notification problem entirely.

### 9.2 Critical — Fix greeting race condition

**Option A (minimal)**: Make the greeting effect reactive to `providerConfigured` changes by removing or resetting the `assistantGreetingSeededRef` guard when `providerConfigured` transitions from `false` to `true`.

**Option B (cleaner)**: Do not persist the setup message in the `messages` array. Instead, render it dynamically as an inline banner when `!providerConfigured && messages.length === 0`. This makes it automatically disappear when the provider becomes configured.

### 9.3 High — Fix empty-state copy

- Rewrite `GORKH_ONBOARDING.providerNotConfigured` to be provider-agnostic, or interpolate the currently selected provider label.
- Gate the "Free AI" sentence behind `FREE_AI_ENABLED`.
- Remove the hardcoded "Mac" reference or make it platform-aware.

### 9.4 Medium — Fix hardcoded paid-provider check

- Replace `AgentTaskDialog.tsx` line 45 with `isPaidLlmProvider(selectedProvider)` from `llmConfig.ts`.

### 9.5 Medium — Forward-compat `gorkh_free` in advanced agent

- Add `'gorkh_free'` to `advancedAgent.ts` `ProviderType`.
- Add `case 'gorkh_free':` to `assistantEngine.ts` `mapAdvancedProvider` returning the correct provider mapping (or throw if unsupported).

---

## 10. Open Questions

1. **Test Connection uses `assistant_conversation_turn` instead of `test_provider`** — Is this intentional? `test_provider` exists in Rust (`lib.rs:2274`) and is simpler (just checks keychain + provider availability). Using the full conversation turn for a connectivity test is heavier and can fail for reasons unrelated to key configuration (e.g. rate limits, model availability).

2. **Why does `providerConfigured` live in `App.tsx` local state instead of a shared store?** — A shared store would naturally solve the cross-panel sync issue. Is there a historical reason for this architecture?

3. **Should `assistantGreetingSeededRef` be reset on sign-out / session change?** — Currently it appears to be a mount-once flag. If a user signs out and a new user signs in, the greeting may not re-seed.

4. **Is the `.js` file generation in the source tree intentional?** — `tsc` emits `.js` files into `apps/desktop/src/lib/` because `noEmit` is not set in `tsconfig.json`. This creates a risk of Vite resolving to stale `.js` files during production builds if `tsc` is ever skipped or fails silently.
