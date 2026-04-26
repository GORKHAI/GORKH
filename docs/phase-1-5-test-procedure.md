# Phase 1.5 — Empty-Trash E2E Test Procedure

**Goal:** Verify the GORKH advanced agent can receive a natural-language request ("empty my trash"), route it to the `system.empty_trash` tool, show an approval dialog, execute the macOS `osascript` command, and report success.

**Prerequisites:**
- macOS machine (Apple Silicon or Intel)
- Anthropic Claude API key with available credits
- Git and Node.js installed
- Xcode Command Line Tools installed (for Rust compilation)

---

## Step 1 — Pull the branch

```bash
git clone https://github.com/GORKHAI/GORKH.git
cd GORKH
git checkout main
```

## Step 2 — Build the macOS app

```bash
pnpm install
pnpm --filter @ai-operator/desktop tauri:build
```

Build artifact location after success:
```
apps/desktop/src-tauri/target/release/bundle/dmg/GORKH_*.dmg
```

## Step 3 — Install the DMG

1. Open `apps/desktop/src-tauri/target/release/bundle/dmg/GORKH_*.dmg` in Finder.
2. Drag the GORKH app icon into `/Applications`.
3. Eject the DMG.
4. Launch GORKH from `/Applications` (right-click → Open the first time to bypass Gatekeeper).

## Step 4 — First-launch permissions

On first launch, macOS will prompt for:
- **Screen Recording** — Click "Allow" in System Settings when prompted.
- **Accessibility** — Go to System Settings → Privacy & Security → Accessibility → Add GORKH → Enable.

Verify permissions inside GORKH:
1. Click the **tray icon** (menu bar) → **Open GORKH**.
2. In the main window, click **Settings** (gear icon, top-right).
3. Scroll to the **Permissions** section (`SettingsPanel.tsx:899-999`).
4. Confirm both **Screen Recording** and **Accessibility** show `granted`.

## Step 5 — Configure the Claude API key

1. In **Settings** (`SettingsPanel.tsx:373`), ensure the **Provider** dropdown (`SettingsPanel.tsx:445`) shows `Claude`.
2. Scroll to the **API Key** field (`SettingsPanel.tsx:546`).
3. Paste your Anthropic API key (starts with `sk-ant-`).
4. Click **Save** (`SettingsPanel.tsx:565`).
5. A green checkmark **✓ Saved** appears next to the label.
6. Click **Test Connection** (`SettingsPanel.tsx:680`).
7. Expect green banner: "Connection successful! LLM is responding."

API key storage trace:
- Frontend: `SettingsPanel.tsx:199` invokes `set_llm_api_key` Tauri command.
- Rust: `lib.rs:1635-1646` stores in macOS Keychain under key `llm_api_key:claude`.
- At agent start: `lib.rs:2243-2248` reads from keychain if `provider_api_key` override is not provided.

## Step 6 — Switch to Advanced Agent engine

1. In the main window, scroll to the bottom panel labeled **Debug engine override** (`App.tsx:2996`).
2. Change the dropdown from **GORKH Assistant** to **Advanced Agent (Experimental)** (`App.tsx:3004`).
3. The engine switch is now active for the next task.

Engine routing trace:
- `App.tsx:391` holds `assistantEngineId` state.
- `App.tsx:1535` passes `assistantEngineId` to `createAssistantEngine()` (`assistantEngine.ts:435`).
- When set to `'advanced_agent'`, it instantiates `AdvancedAssistantEngineAdapter` (`assistantEngine.ts:192`).
- `start()` calls `startAgentTask()` (`advancedAgent.ts` → `lib.rs:2225`), which routes to the Phase 1 `agent/mod.rs` runtime.

## Step 7 — Configure workspace (required for tool approval UI)

**Note:** Even though `system.empty_trash` does not touch the workspace, the current UI gates all tool approvals behind `workspaceState.configured` (`App.tsx:4184`).

1. In **Settings** (`SettingsPanel.tsx:373`), scroll to **Workspace Configuration** (`SettingsPanel.tsx:716`).
2. Click **Choose Workspace Folder...** (`SettingsPanel.tsx:769`).
3. Select any empty folder (e.g., `~/gorkh-workspace`).
4. Confirm the status shows **✓ Workspace configured**.

## Step 8 — Put test files in Trash

Open Terminal and run:

```bash
echo "gorkh test file" > /tmp/gorkh_test.txt
mv /tmp/gorkh_test.txt ~/.Trash/
ls ~/.Trash/
```

Confirm you see `gorkh_test.txt` in the output.

## Step 9 — Run the demo

1. In the GORKH chat input, type exactly:
   ```
   empty my trash
   ```
2. Press **Enter**.

### Expected behavior sequence

| # | Visible UI moment | Time |
|---|-------------------|------|
| 1 | A new user message bubble appears: "empty my trash" | Immediate |
| 2 | Agent status changes to **"Planning the next steps…"** | 1–2 s |
| 3 | Agent status changes to **"Working on it…"** | 2–4 s |
| 4 | **Approval dialog appears** in bottom-right corner (`ToolApprovalModal.tsx:122`) | 3–6 s |
|   | Title: **"Empty System Trash"** (`ToolApprovalModal.tsx:31`) | |
|   | Warning banner: **"This will permanently delete all items in the Trash. This action cannot be undone."** (`ToolApprovalModal.tsx:32`) | |
|   | Risk label: **HIGH risk • DESTRUCTIVE** (`ToolApprovalModal.tsx:184`) | |
| 5 | Click **Approve Tool** (`ToolApprovalModal.tsx:277`) | User action |
| 6 | Dialog disappears. Agent status shows **"Working on it…"** | Immediate |
| 7 | Agent status changes to **done** with summary message | 2–4 s |
| 8 | Final message bubble from agent confirms trash was emptied | 2–4 s |

### Verification step

Open Terminal and run:
```bash
ls ~/.Trash/
```

Expected: **no output** (Trash is empty).

## Step 10 — Denial-path test

1. Create a new test file in Trash:
   ```bash
   echo "denial test" > /tmp/gorkh_denial.txt
   mv /tmp/gorkh_denial.txt ~/.Trash/
   ```
2. In GORKH chat, type: `empty my trash`
3. When the approval dialog appears, click **Deny** (`ToolApprovalModal.tsx:260`).
4. Expected: A graceful message appears in chat like "Action denied by user" or "User denied the pending proposal". No crash. The file remains in `~/.Trash/`.

## Step 11 — Cost-tracking observation

**Current limitation:** `current_cost` is tracked in Rust (`agent/mod.rs:124`) and emitted via `AgentEvent::CostUpdated` (`agent/mod.rs:194`), but the frontend does **not** subscribe to or display this event. There is no visible UI for cost during or after the run.

To observe cost manually (for verification only):
1. Enable the **Run Panel** or check the app logs via Console.app.
2. Look for `AgentEvent::CostUpdated` emissions in the Rust-side logs (not visible in standard UI).

**Status:** Cost tracking is implemented server-side but not yet surfaced in the UI. This is a known gap documented in the prediction.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "No active agent task" when approving | Engine switched back to legacy or task timed out | Re-select Advanced Agent in dropdown |
| Approval dialog never appears | Workspace not configured | Complete Step 7 |
| "Connection failed" when testing Claude key | Key invalid or network issue | Verify key at https://console.anthropic.com/ |
| Trash not emptied after approval | `osascript` failed (Finder not running, permissions) | Check Console.app for GORKH logs |
| Agent says "I can't do that" | LLM didn't emit `system.empty_trash` tool call | Retry once; Claude text-based tool prompts are probabilistic |
