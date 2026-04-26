# Free AI (Local Ollama) Diagnosis Report

Generated: 2026-04-24  
Scope: Read-only trace of the Free AI request path from React chat input through to Ollama HTTP request and back.  
Environment: Linux (Codespace). Ollama not installed.

---

## 1. End-to-end Free AI request flow

### Step 1 — Chat input fires `onSendMessage`
- **Component:** `apps/desktop/src/components/ChatOverlay.tsx` lines 80-85
- `handleSubmit` validates `input.trim()`, then calls `onSendMessage(input)`.
- `onSendMessage` prop is bound to `App.tsx` `handleSendMessage` at line 3939.

### Step 2 — `handleSendMessage` gates on `providerConfigured`
- **File:** `apps/desktop/src/App.tsx` lines 2178-2339
- Line 2181: early return if `assistantConversationBusy || pendingTaskConfirmationBusy || pendingFreeAiSetupBusy`.
- Line 2248: **`if (!providerConfigured)`** — this is the critical gate.
- If provider is Free AI (`DEFAULT_LLM_PROVIDER = 'native_qwen_ollama'`) and `providerConfigured` is `false`, the app does **not** attempt any LLM call. Instead it builds a `PendingFreeAiSetup` object and shows a setup approval card in the chat (lines 2248-2293).
- Only if `providerConfigured === true` does execution reach `startAssistantConversation(nextMessages)` at line 2308.

### Step 3 — Provider state storage
- **File:** `apps/desktop/src/App.tsx` line 395
- `const [llmSettings, setLlmSettings] = useState<LlmSettings>(() => getLlmDefaults(DEFAULT_LLM_PROVIDER));`
- Persistence key: `const LLM_SETTINGS_STORAGE_KEY = 'ai-operator-settings'` (line 149).
- `persistLlmSettings` writes to `localStorage` at lines 248-250.
- On mount, settings are loaded from `localStorage` and merged with defaults via `mergeLlmSettings(parsed)` at lines 1044-1051.
- **There is no Zustand store, Context API, or external state library.** State is plain React `useState` in the monolithic `App.tsx` component.

### Step 4 — Routing logic: "Free AI" vs cloud
- **File:** `apps/desktop/src/App.tsx` lines 1787-1789
```ts
const conversationSettings = llmSettings.provider === DEFAULT_LLM_PROVIDER
  ? resolveManagedLocalLlmBinding(localAiStatus, localAiRecommendation)
  : llmSettings;
```
- For Free AI, `resolveManagedLocalLlmBinding` returns `{ baseUrl, model }` derived from `localAiStatus` (see `apps/desktop/src/lib/localAi.ts` lines 380-395).
- Default base URL: `http://127.0.0.1:11434`.
- Default model: `qwen2.5:1.5b` (light tier), `qwen2.5:3b` (standard), `qwen2.5-vl:3b` (vision).

### Step 5 — Transport: Tauri invoke, not frontend fetch
- **File:** `apps/desktop/src/lib/assistantConversation.ts` lines 31-45
- `assistantConversationTurn` wraps `invoke('assistant_conversation_turn', { params: { provider, baseUrl, model, messages, appContext, apiKeyOverride, correlationId } })`.
- The request **never leaves the React layer as a direct HTTP call**. It goes through the Tauri IPC bridge to Rust.

### Step 6 — Rust command handler
- **File:** `apps/desktop/src-tauri/src/lib.rs` lines 1860-1950
- Command name: `assistant_conversation_turn`
- Registered in `generate_handler!` at line 2461.
- Inside the command:
  - Line 1865-1868: resolves API key (empty string for Free AI, since `resolve_llm_api_key` falls back to empty for `native_qwen_ollama`).
  - Line 1879: `llm::create_provider(&conversation_params.provider)` returns `NativeOllamaProvider`.
  - Line 1881: `provider.conversation_turn(&conversation_params).await`.
  - Lines 1888-1944: special Mac graphics compatibility retry logic for `native_qwen_ollama` only.

### Step 7 — Exact HTTP request to Ollama
- **File:** `apps/desktop/src-tauri/src/llm/native_ollama.rs` lines 170-271 (`conversation_turn`)

**Method:** `POST`  
**URL:** `{base_url}/api/generate` (line 197)  
**Headers:**
- `Content-Type: application/json` (line 198)
- `x-request-id: {correlation_id}` (lines 201-203) — optional

**Request body** (`OllamaRequest`, lines 27-34):
```json
{
  "model": "qwen2.5:1.5b",
  "prompt": "<system_prompt>\n\n<user_prompt>",
  "stream": false,
  "options": {
    "temperature": 0.2,
    "num_predict": 600
  },
  "images": null
}
```

*(For the action-proposal path via `llm_propose_next_action`, `num_predict` is `1000` and `images` may contain a base64 screenshot.)*

**Timeout:** 120 seconds overall, 10 seconds connect timeout (`apps/desktop/src-tauri/src/llm/mod.rs` lines 61, 64).

### Step 8 — Response handling
- **Non-streaming** — `stream: false` in request body.
- **File:** `apps/desktop/src-tauri/src/llm/native_ollama.rs`
  - Lines 205-227: `reqwest` send. Connection errors classified into `LlmErrorCode::ConnectionFailed` or `Timeout`.
  - Lines 229-245: HTTP status check. `404` -> `"Ollama could not find model 'x'. Run \`ollama pull x\` and try again."`
  - Lines 247-250: Parse JSON into `OllamaResponse` (`response`, `prompt_eval_count`, `eval_count`).
  - Line 270: Parse text content into `ConversationTurnResult` via `parse_conversation_turn_result`.
- **File:** `apps/desktop/src-tauri/src/lib.rs` lines 1882-1947
  - On failure for `native_qwen_ollama`, calls `local_ai::compatibility_disposition(...)` to detect macOS Metal graphics crash.
  - If `RetryManagedRuntime`, enables CPU compatibility mode and retries once.
  - If still fails, returns a `compatibility_proposal_error` with user-facing message.

### Step 9 — UI surfacing
- **File:** `apps/desktop/src/App.tsx` lines 1926-1938
- Errors caught in the outer `try/catch` of `startAssistantConversation`.
- `parseDesktopError(err, 'The assistant could not respond right now.')` extracts code + message.
- The parsed `message` is appended to chat as an agent bubble via `createChatItem('agent', parsedError.message)`.

### Definite failure point
**The `providerConfigured` gate at `App.tsx:2248` is a definite failure point.** If `providerConfigured` is `false`, the app **never attempts** an LLM call. It unconditionally shows the Free AI setup card instead. OpenAI/Claude bypass this gate because they are considered "configured" as soon as an API key exists in the keychain.

---

## 2. Free AI runtime detection and lifecycle

### 2.1 "Is Ollama installed?"
- **Frontend wrapper:** `apps/desktop/src/lib/localAi.ts` line 219 — `getLocalAiStatus()` invokes `'local_ai_status'`.
- **Rust command:** `apps/desktop/src-tauri/src/lib.rs` lines 1952-1956.
- **Core logic:** `apps/desktop/src-tauri/src/local_ai.rs` lines 222-228.
```rust
let runtime_binary_path = expected_runtime_binary_path(&managed_runtime_dir);
let runtime_present = runtime_binary_path.as_ref().map(|path| path.exists()).unwrap_or(false);
```
- The app first checks for its **managed** binary at `{data_local_dir}/GORKH/local-ai/runtime/ollama`.
- If the managed binary is missing, it falls back to `find_system_ollama_binary()` at line 1199.

### 2.2 Binary path resolution
**System binary search** (`local_ai.rs` lines 1627-1668):

| Path | Line | Searched? |
|------|------|-----------|
| `$PATH` entries + `ollama` | 1636-1639 | Yes |
| `/opt/homebrew/bin/ollama` | 1644 | Yes |
| `/usr/local/bin/ollama` | 1645 | Yes |
| `%ProgramFiles%\Ollama\ollama.exe` | 1651-1654 | Yes (Windows) |
| `%LocalAppData%\Programs\Ollama\ollama.exe` | 1657-1663 | Yes (Windows) |
| `/Applications/Ollama.app/Contents/Resources/ollama` | — | **NO** |
| `~/.ollama/bin/ollama` | — | **NO** |

**Finding:** The two most common install paths for the official Ollama macOS app are **not searched.** A user who installed Ollama via the official `.dmg` or `brew install ollama` (which symlinks to `/opt/homebrew/bin/ollama` on Apple Silicon) may or may not be found depending on PATH. A user who installed Ollama via the macOS app bundle but does not have it in PATH will appear as "not installed" to GORKH.

### 2.3 Starting the Ollama service
- **File:** `apps/desktop/src-tauri/src/local_ai.rs` lines 1679-1742 (`ensure_service_running`)
- If the app decides to start Ollama, it spawns a **managed child process**:
```rust
let mut command = managed_ollama_command(runtime_binary, managed_dir, compatibility_mode);
command.arg("serve")
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null());
let child = command.spawn()?;
```
- **Environment variables set:**
  - `OLLAMA_HOST` = `127.0.0.1:11434` (line 1769)
  - `OLLAMA_MODELS` = `{managed_dir}/models` (line 1770)
  - `OLLAMA_KEEP_ALIVE` = `10m` (line 1771)
  - `NO_COLOR` = `1` (line 1772)
  - If compatibility mode: `OLLAMA_LLM_LIBRARY` = `cpu` (line 1774)

**Detached?** No. Standard `std::process::Command::spawn()`. No `setsid()`, `detach()`, or `CREATE_NEW_PROCESS_GROUP`.

**Kill-on-quit?** **No automatic cleanup.** The tray "Quit" handler (`lib.rs` lines 2530-2531) only calls `app.exit(0)`. The managed child is killed only in these explicit paths:
1. User explicitly clicks "Stop Free AI" -> `local_ai_stop` -> `stop_runtime()` (lines 664-672)
2. `reset_to_managed()` or `enable_managed_runtime_compatibility_mode()` (lines 726-728, 752-754)
3. Startup failure inside `ensure_service_running()` — kills child if `wait_for_service_port()` fails (lines 1732-1737)

If the app crashes or is force-quit, the Ollama child may be left running as an orphan.

### 2.4 Polling for "service is up"
- **File:** `apps/desktop/src-tauri/src/local_ai.rs` lines 1798-1842 (`wait_for_service_port`)
- **Timeout:** 20 seconds (called at line 1732)
- **Retry interval:** 500ms (line 1839)
- **Port check:** `TcpStream::connect_timeout(..., Duration::from_millis(250))` to `127.0.0.1:11434` (lines 1844-1852)
- **Child death detection:** Inside the loop, calls `child.try_wait()`. If the child exits before the port opens, it immediately returns an error (lines 1827-1838) and kills the child (lines 1733-1736).
- **Timeout error message:** `"Managed local AI runtime did not become ready in time. Refresh status, then try Repair Free AI."` (line 1841)

### 2.5 Model presence check
- **File:** `apps/desktop/src-tauri/src/local_ai.rs` lines 1973-1990 (`is_service_running`), lines 1992-2023 (`fetch_installed_models`)
- Hits `GET {base_url}/api/tags` and parses `TagsResponse { models: Vec<ModelInfo> }` where `ModelInfo { name: String }`.
- **Hardcoded model names** (lines 1065-1080):
  - Light tier: `qwen2.5:1.5b`
  - Standard tier: `qwen2.5:3b`
  - Vision tier: `qwen2.5-vl:3b`
- **Compatibility fallback:** `model_compatibility.rs` lines 90-117 accepts any model whose name starts with `qwen2.5`, `qwen2_5`, or `qwen-2.5` (for text) or `qwen2.5-vl`, `qwen2_5_vl`, `qwen-2.5-vl` (for vision).

### 2.6 Model pull
- **File:** `apps/desktop/src-tauri/src/local_ai.rs` lines 1744-1764 (`pull_model`)
- Spawns `ollama pull <model>` with **stdout/stderr fully discarded** (`Stdio::null()`).
- Runs **synchronously** (`.status()` blocks until completion).
- **No real-time progress streaming.** The frontend only sees coarse manually-set progress stages:
  - `run_install_worker()` line 915-930: sets progress to 65% with message `"Downloading the default free model {model}..."`
  - Line 932: calls `pull_model(...)` — blocks the worker thread
  - Lines 951-963: after success, jumps to 100% / `Ready`
- **Failure:** if `ollama pull` exits non-zero, returns error: `"Managed local AI could not download model {model} (...). Check disk space and network access, then try again."` (lines 1754-1760)

---

## 3. Settings panel and "test connection" path

### 3.1 Audit P2 #23 — Verification
The audit flagged:
> "Undefined variable references in SettingsPanel" at lines 270-295, claiming `runtimeConfig` and `sessionDeviceToken` are referenced but not declared.

**Verdict: The audit finding is INCORRECT.**

- **Props declaration:** `apps/desktop/src/components/SettingsPanel.tsx` lines 70-71:
```ts
runtimeConfig?: import('../lib/desktopRuntimeConfig.js').DesktopApiRuntimeConfig | null;
sessionDeviceToken?: string | null;
```
- **Destructured from props:** lines 101-102:
```ts
runtimeConfig,
sessionDeviceToken,
```
- **Usage in `handleTest`:** line 274:
```ts
if (runtimeConfig && sessionDeviceToken) {
```
- **Call site in App.tsx:** lines 4222-4223:
```tsx
runtimeConfig={runtimeConfig}
sessionDeviceToken={sessionDeviceToken}
```

Both variables are **genuinely in scope**. They may be `null`/`undefined` at runtime (e.g., user is not signed in), but the code correctly guards against that with the `if` check at line 274.

**This is NOT the cause of the user-visible Free AI failure.** It is a separate latent bug report that turned out to be a false positive.

### 3.2 Test button path vs. chat send path

| Aspect | SettingsPanel Test (`handleTest`) | Chat Send (`startAssistantConversation`) |
|--------|-----------------------------------|------------------------------------------|
| **Entry** | `SettingsPanel.tsx:238` | `App.tsx:1779` |
| **Rust command** | `invoke('assistant_conversation_turn', ...)` directly | `assistantConversationTurn()` wrapper -> same invoke |
| **Message** | Hard-coded `[{ role: 'user', text: 'Hello' }]` | Actual user messages |
| **`correlationId`** | **Not passed** | Passed |
| **`appContext`** | `null` | `gorkhAppContext ?? undefined` |
| **Free AI fallback** | On error, checks `runtimeConfig && sessionDeviceToken` and calls `testHostedFreeAiFallback()` | On error, checks `shouldRetryWithHostedFreeAiFallback(error)` then resolves hosted binding and retries |
| **`providerConfigured` gate** | **No gate** — the test button calls the Rust command even if `providerConfigured` is false | **Gated** — if `providerConfigured` is false, shows setup card instead |

**Critical difference:** The SettingsPanel "Test Connection" button **bypasses** the `providerConfigured` gate. It will attempt to hit Ollama (or the hosted fallback) regardless of whether the app thinks Free AI is ready. The chat send path is **blocked** by the `providerConfigured` gate.

This means:
- If the user clicks "Test Connection" in Settings and sees `"Free AI is not ready. Use 'Set Up Free AI'..."`, the failure is at the Rust/Ollama layer.
- If the user sends a chat message and sees a setup card ("I need your approval before I install anything..."), the failure is at the `providerConfigured` gate in React.

---

## 4. Configuration and environment

### Environment variables affecting Free AI

| Variable | Read in | Purpose |
|----------|---------|---------|
| `VITE_API_HTTP_BASE` | `desktopRuntimeConfig.ts:43` | API base URL (for hosted fallback) |
| `VITE_API_WS_URL` | `desktopRuntimeConfig.ts:44` | WebSocket URL |
| `VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST` | `desktopRuntimeConfig.ts:42` | Allow localhost in prod |
| `VITE_DESKTOP_UPDATER_ENABLED` | `App.tsx:151`, `SettingsPanel.tsx:42` | Updater toggle |
| `PATH` | `local_ai.rs:1636` | Find system Ollama binary |
| `ProgramFiles` | `local_ai.rs:1650` | Windows Ollama path |
| `LocalAppData` | `local_ai.rs:1657` | Windows Ollama path |

### Ollama endpoint URL
- **Hardcoded** as `http://127.0.0.1:11434` in:
  - `apps/desktop/src/lib/llmConfig.ts` line 40 (`baseUrl` for `native_qwen_ollama`)
  - `apps/desktop/src/lib/localAi.ts` line 392 (fallback in `resolveManagedLocalLlmBinding`)
  - `apps/desktop/src-tauri/src/local_ai.rs` line 1769 (`OLLAMA_HOST` env var for managed spawn)
- **Not configurable by the user** in the UI when `native_qwen_ollama` is selected. The Base URL input is hidden for Free AI (`SettingsPanel.tsx` lines 497-542).

### Build-time differences
- **None** for Free AI specifically. There is no feature flag or conditional compilation affecting the Ollama path.
- The `VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST` env var affects `desktopRuntimeConfig.ts` validation, but only for API URLs, not the Ollama localhost URL.

---

## 5. Live probe

Environment: Linux (GitHub Codespace). Ollama is **not installed**.

```
$ which ollama
ollama not available

$ ollama --version
ollama not available

$ curl -sS -i http://127.0.0.1:11434/api/version
curl: (7) Failed to connect to 127.0.0.1 port 11434 after 0 ms: Couldn't connect to server
Ollama not running

$ curl -sS -i http://127.0.0.1:11434/api/tags
curl: (7) Failed to connect to 127.0.0.1 port 11434 after 0 ms: Couldn't connect to server
Ollama not running
```

**Conclusion from host:** Cannot baseline a working Ollama installation from this environment. The user's Mac must be probed directly.

---

## 6. Tauri permissions and CSP

### CSP `connect-src`
- **Production CSP** (`tauri.conf.json` line 37):
```
connect-src 'self' https: wss:;
```
- **Does NOT allow `http://127.0.0.1:11434`.**

- **Dev CSP** (`tauri.conf.json` line 38):
```
connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https: wss:;
```
- **Dev CSP DOES allow `http://127.0.0.1:*`**, which covers Ollama.

### Does the CSP matter?
**No.** The Ollama HTTP request is made from **Rust via `reqwest`**, not from the frontend renderer via `fetch` or `tauri-plugin-http`.

Evidence:
- `apps/desktop/src-tauri/Cargo.toml` line 28: `reqwest = { version = "0.12", features = ["blocking", "json"] }`
- **No `tauri-plugin-http`** in `Cargo.toml`.
- All LLM provider HTTP calls are executed in Rust (`native_ollama.rs` lines 196-207, `openai.rs`, `claude.rs`, etc.).
- The frontend only uses `fetch` for HTTPS calls to the public API (`desktopApi.ts`), which is permitted by the production CSP.

**Verdict:** CSP is not the cause of Free AI failure.

---

## 7. Error surface — what does the user actually see

There are **three distinct failure surfaces** depending on where the failure occurs:

### Failure surface A: `providerConfigured` gate (React, before any LLM call)
**Trigger:** `hasLlMProviderConfigured('native_qwen_ollama')` returns `false`.

**User-visible strings:**
1. If install is in progress:
   - `"Free AI setup is already in progress on this desktop. I will resume your task as soon as it is ready."` (`App.tsx` line 2287)
2. If install errored:
   - `"Free AI setup needs attention before I can continue. Use Retry Free AI, Cancel this task, or Open Settings."` (`App.tsx` line 2289)
3. If no install in progress and no error:
   - `"{report.summary} {report.prompt} I need your approval before I install anything on this desktop."` (`App.tsx` line 2290)
   - `report.summary` and `report.prompt` come from `buildFreeAiSetupPreflightReport()` (`localAi.ts` lines 280-358). Examples:
     - `"Free AI is not installed on this desktop."`
     - `"Free AI is installed but not running."`
     - `"Free AI is running, but the required model is not available."`

**Code path:** `App.tsx:2248` -> `App.tsx:2250-2293` -> chat bubble with setup approval card.

### Failure surface B: Ollama HTTP request fails (Rust -> reqwest error)
**Trigger:** `providerConfigured` is `true`, but the Ollama HTTP request fails.

**User-visible strings (propagated through `parseDesktopError`):**
1. Connection refused / not running:
   - `"Cannot connect to Ollama at {base_url}. Start Ollama and ensure it is listening on that address."` (`native_ollama.rs` lines 217-219)
2. Timeout:
   - `"Ollama at {base_url} timed out (120s). The model may be loading or the system is busy. Try again in a moment."` (`native_ollama.rs` lines 212-214)
3. Model not found (404):
   - `"Ollama could not find model '{model}'. Run \`ollama pull {model}\` and try again."` (`native_ollama.rs` lines 232-236)
4. Generic Ollama error:
   - `"Ollama error {status}: {text}"` (`native_ollama.rs` lines 238)
5. Parse error:
   - `"Failed to parse Ollama response: {e}"` (`native_ollama.rs` lines 247-250)

**Code path:** `native_ollama.rs` -> `lib.rs:1881` -> `proposal_error_from_llm(error)` -> Tauri command error -> `parseDesktopError()` in React -> `App.tsx:1931-1938` -> chat bubble.

### Failure surface C: Mac graphics compatibility error (Rust, special path)
**Trigger:** `native_qwen_ollama` fails with a message containing Metal/MTL/ggml_metal signatures.

**User-visible strings:**
1. `"Free AI hit a Mac graphics compatibility problem, but GORKH could not inspect the local runtime state: {state_error}"` (`lib.rs` lines 1896-1899)
2. `"Free AI hit a Mac graphics compatibility problem. GORKH could not restart the managed local runtime in compatibility mode: {restart_error}"` (`lib.rs` lines 1920-1923)
3. `"Free AI reached a Mac graphics compatibility problem. GORKH restarted the local engine in compatibility mode, but it still failed. This Mac may need a software update, or Free AI may not be supported on this hardware configuration."` (`local_ai.rs` — `managed_runtime_compatibility_failure_message()`)
4. `"Free AI found an external Ollama service on this Mac, but it is hitting a graphics compatibility error. Switch to GORKH-managed Free AI so compatibility mode can be applied automatically."` (`local_ai.rs` — `external_service_compatibility_message()`)

**Code path:** `lib.rs:1888` -> `local_ai::compatibility_disposition()` -> `compatibility_proposal_error(message)` -> Tauri command error -> `parseDesktopError()` -> chat bubble.

### Failure surface D: Hosted Free AI fallback fails
**Trigger:** Local Ollama fails, app retries with hosted fallback, and that also fails.

**User-visible strings:**
1. `"Free AI could not respond because the local engine is not ready, and the hosted Free AI fallback is not available for this desktop right now."` (`App.tsx` lines 1818-1820)
2. `"Your daily Free AI fallback limit has been reached. Try again tomorrow, or set up local Free AI in Settings."` (`App.tsx` lines 1847-1849)
3. `"The hosted Free AI fallback is temporarily unavailable. This may be due to a cold start or service issue. Please try again in a moment."` (`App.tsx` lines 1856-1858)
4. `"The hosted Free AI fallback could not reach the upstream AI service. Please try again in a moment."` (`App.tsx` lines 1865-1867)
5. `"Free AI could not respond, and the hosted fallback also failed: {parsed.message}"` (`App.tsx` lines 1869-1871)

### Failure surface E: Settings "Test Connection" button
**Trigger:** User clicks "Test Connection" in Settings with provider = Free AI.

**User-visible strings:**
1. `"Free AI is not ready. Use 'Set Up Free AI' in the main assistant view to start the local engine."` (`SettingsPanel.tsx` lines 313-314)
2. `"Free AI local engine is unavailable right now, but the hosted fallback is ready."` (`SettingsPanel.tsx` lines 278-280)
3. `"Free AI local engine is unavailable, and the hosted fallback is not ready: {parsedHostedError.message}"` (`SettingsPanel.tsx` lines 287-290)
4. `"Free AI local engine is unavailable. Sign in to let GORKH verify the hosted fallback."` (`SettingsPanel.tsx` lines 296-298)

---

## 8. Hypothesis ranking

### Hypothesis 1: `providerConfigured` is permanently `false` because Ollama is not installed, not running, or missing the required model.
**Evidence:**
- `hasLlMProviderConfigured('native_qwen_ollama')` requires `status.runtimeRunning && status.targetModelAvailable === true && (Boolean(status.selectedModel) || status.externalServiceDetected)` (`aiAssist.ts` lines 98-105).
- If ANY of these three conditions is false, `providerConfigured` is `false`.
- When `providerConfigured` is `false`, the chat path shows a setup card and **never attempts** an LLM call (`App.tsx:2248`).
- The user says "Free AI always fails" but OpenAI/Claude work. This is consistent with a permanently unready local runtime.

**Test to confirm:** Ask the user to run these on their Mac terminal:
```bash
which ollama
curl -sS http://127.0.0.1:11434/api/tags | head -c 500
```
If `which ollama` returns nothing, Ollama is not installed or not in PATH. If `/api/tags` returns empty or no `qwen2.5` model, the model is missing.

---

### Hypothesis 2: Ollama is installed via official Ollama.app, but GORKH doesn't detect it because `/Applications/Ollama.app/Contents/Resources/ollama` and `~/.ollama/bin/ollama` are not in the search paths.
**Evidence:**
- `find_system_ollama_binary()` searches PATH, `/opt/homebrew/bin/ollama`, `/usr/local/bin/ollama`, and Windows paths (`local_ai.rs` lines 1627-1668).
- It does **not** search `/Applications/Ollama.app/Contents/Resources/ollama` or `~/.ollama/bin/ollama`.
- The official Ollama macOS app installs to `/Applications/Ollama.app` and may not add itself to PATH.
- If GORKH can't find the binary, it treats Ollama as "not installed" and tries to download its own managed runtime. If the download fails (network, disk space), the user sees "Free AI setup needs attention."

**Test to confirm:**
```bash
ls -la /Applications/Ollama.app/Contents/Resources/ollama 2>/dev/null || echo "not at app path"
ls -la ~/.ollama/bin/ollama 2>/dev/null || echo "not at home path"
```

---

### Hypothesis 3: Ollama is running externally with the wrong model (e.g., only `llama3` installed, no `qwen2.5`).
**Evidence:**
- `targetModelAvailable` is determined by `model_compatibility::find_compatible_model(&live_models, &target_model)` (`local_ai.rs` line 256).
- If the user has Ollama running but only non-Qwen models, `targetModelAvailable` is `false`.
- `externalServiceDetected` would be `true`, but the third condition in `hasLlMProviderConfigured` also requires `targetModelAvailable === true`.
- The user would see: `"Free AI is running, but the required model is not available."`

**Test to confirm:**
```bash
curl -sS http://127.0.0.1:11434/api/tags
```
Check if any model name contains `qwen2.5`.

---

### Hypothesis 4: GORKH's managed Ollama install/download failed silently, leaving no binary and no error surfaced to the user.
**Evidence:**
- The managed install worker runs in a background thread (`local_ai.rs` lines 460-965).
- Model pull (`local_ai.rs` lines 1744-1764) runs with stdout/stderr discarded and blocks synchronously.
- If the download or pull fails, `last_error` is set and the install stage becomes `Error`.
- However, the user must explicitly trigger setup. If they triggered it once and it failed, subsequent chat sends will show the setup card again with the error message.

**Test to confirm:** Ask the user if they ever clicked "Set Up Free AI" and what happened. Check the GORKH app for any error message in the Free AI status area.

---

### Hypothesis 5: macOS Metal graphics compatibility error on Apple Silicon.
**Evidence:**
- `lib.rs` lines 1888-1944 contain special handling for Mac Metal compatibility errors.
- If Ollama crashes with `MTLLibraryErrorDomain` / `ggml_metal_init`, GORKH tries to restart in CPU compatibility mode.
- If the retry also fails, the user sees: `"Free AI reached a Mac graphics compatibility problem..."`
- This only affects the managed runtime path, not external Ollama.

**Test to confirm:** Check if the user sees any message about "Mac graphics compatibility" or "compatibility mode."

---

### Hypothesis 6: The app does not auto-start Ollama on chat send — the user expects it to "just work" without explicit setup.
**Evidence:**
- The chat send path is **gated** by `providerConfigured` (`App.tsx:2248`).
- There is **no automatic start-Ollama logic** in the chat send handler.
- The user must explicitly approve setup via the Free AI setup card, which triggers `beginPendingFreeAiSetup()` -> `local_ai_install_start()` -> download + pull.
- A user who expects Free AI to "just work" like OpenAI/Claude (which only need an API key) may perceive the setup card as "failure."

**Test to confirm:** Ask the user what they see in the chat when they send a message with Free AI selected. If they see a setup approval card, this is working-as-designed UX, not a technical failure.

---

## 9. What we need from the human

1. **The exact error message visible in the UI when Free AI fails.**
   - Is it a setup card ("I need your approval before I install anything...")?
   - Is it a chat bubble ("Cannot connect to Ollama...")?
   - Is it a Settings test result ("Free AI is not ready...")?
   - Screenshot preferred.

2. **Whether Ollama is installed on the user's Mac, and where.**
   ```bash
   which ollama
   ls -la /Applications/Ollama.app/Contents/Resources/ollama 2>/dev/null
   ls -la ~/.ollama/bin/ollama 2>/dev/null
   ```

3. **Whether Ollama is running and what models are available.**
   ```bash
   curl -sS http://127.0.0.1:11434/api/version
   curl -sS http://127.0.0.1:11434/api/tags
   ```

4. **Whether the user has ever gone through the "Set Up Free AI" flow in the app.**
   - Did they see a download progress bar?
   - Did it complete or error?
   - What error message, if any?

5. **Browser/devtools console output from the desktop app at the moment of failure.**
   - Open Tauri devtools (usually Cmd+Option+I or right-click -> Inspect).
   - Look for red error logs.

6. **macOS Console.app output filtered by the GORKH process at the moment of failure.**
   - Open Console.app, search for "GORKH" or `com.ai-operator.desktop`.
   - Reproduce the failure and capture logs.

7. **The output of `ollama --version` and `ollama list` from the user's terminal.**
   ```bash
   ollama --version
   ollama list
   ```

---

## DIAGNOSIS COMPLETE

**Most likely cause:** `providerConfigured` is permanently `false` because Ollama is either (a) not installed, (b) not running, (c) missing the required `qwen2.5` model, or (d) installed in a path GORKH does not search (e.g., `/Applications/Ollama.app/Contents/Resources/ollama`). The `providerConfigured` gate at `App.tsx:2248` blocks all generation attempts before they reach Ollama.

**Confidence:** Medium — the code path is clear, but without the user's terminal output we cannot distinguish between "not installed," "not running," "wrong model," or "wrong install path."

**Required from human:** 7 items (see section 9).
