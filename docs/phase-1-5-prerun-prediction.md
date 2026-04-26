# Phase 1.5 — Prerun Prediction

Predicted outcome for each step of `docs/phase-1-5-test-procedure.md`, based on code review of `feature/agent-phase-1` (commit range `b966ffe..HEAD`).

---

## Build & Install

| Step | Prediction | Reasoning |
|------|------------|-----------|
| 1. Pull branch | ✅ Confident | Standard git operation. |
| 2. `pnpm install` | ✅ Confident | Lockfile is present and consistent. |
| 3. `pnpm --filter @ai-operator/desktop tauri:build` | ✅ Confident | `cargo check` passes; Tauri 2 build is well-tested on macOS. |
| 4. Install DMG | ✅ Confident | Standard macOS app installation. |
| 5. First-launch permissions | ⚠️ Likely works | Screen Recording and Accessibility prompts are standard. User must manually grant Accessibility in System Settings — this is a human step, not a code issue. |

## Configuration

| Step | Prediction | Reasoning |
|------|------------|-----------|
| 6. Paste Claude API key | ✅ Confident | `SettingsPanel.tsx:551-602` → `set_llm_api_key` (`lib.rs:1635`) → keychain. Verified by `has_llm_api_key` (`lib.rs:1649`). |
| 7. Test Connection | ✅ Confident | `SettingsPanel.tsx:239-333` calls `assistant_conversation_turn` with a "Hello" message. Claude provider (`claude.rs:26-114`) uses `messages()` which POSTs to Anthropic API. |
| 8. Switch to Advanced Agent | ✅ Confident | `App.tsx:2996-3009` dropdown sets `assistantEngineId`. `createAssistantEngine()` (`assistantEngine.ts:435`) routes to `AdvancedAssistantEngineAdapter` (`assistantEngine.ts:192`). |
| 9. Configure workspace | ✅ Confident | `SettingsPanel.tsx:769` opens native folder picker. `workspaceState.configured` becomes true. Required because `App.tsx:4184` gates `ToolApprovalModal` on `workspaceState.configured`. |

## Core Demo — "empty my trash"

| Step | Prediction | Reasoning |
|------|------------|-----------|
| 10. Type "empty my trash" | ✅ Confident | Chat input is standard React state. |
| 11. LLM call happens within 1–2 s | ✅ Confident | `AdvancedAssistantEngineAdapter.start()` (`assistantEngine.ts:224-334`) calls `startAgentTask` (`lib.rs:2225`), which calls `agent.start_task()` (`agent/mod.rs`). Planning uses `router.route()` to get Claude provider. Network latency to Anthropic is typically 500–1500 ms. |
| 12. Approval dialog appears with correct title/warning | ✅ Confident | **Critical fix applied.** `agent/mod.rs` emits `proposal_ready` with `RetailToolCall::EmptyTrash`. Frontend `App.tsx:1408-1454` effect creates approval item when `aiState.status === 'awaiting_approval'`. `ToolApprovalModal.tsx` now has explicit `case 'system.empty_trash'` (`ToolApprovalModal.tsx:31-35`) showing "Empty System Trash" with destructive warning. |
| 13. Click Allow | ✅ Confident | `handleAiApproveTool` (`App.tsx:2655`) calls `assistantEngine.approveTool()` → `approveAgentProposal()` (`advancedAgent.ts`) → `approve_agent_proposal` (`lib.rs:2307`) → `agent.approve_proposal()` (`agent/mod.rs`) → resolves `oneshot::Sender<ApprovalDecision>` (`agent/mod.rs:284`). Execution continues. |
| 14. `osascript` executes | ✅ Confident | `agent/tools/mod.rs:29-64` runs `osascript -e 'tell application "Finder" to empty trash'`. No timeout is set (⚠️ see Concerns), but the command normally completes in <1 s. |
| 15. Result returned to LLM | ✅ Confident | Tool result "Trash emptied successfully." is returned. `execute_step` (`agent/mod.rs`) appends result to context. |
| 16. LLM produces final confirmation | ⚠️ Likely works | Claude's `summarize_result` (`claude.rs:201-211`) or the step-execution loop produces a natural-language response. The text-based JSON prompt format is used; Claude is generally reliable for this but not deterministic. |
| 17. Trash verifiably empty | ✅ Confident | `osascript` targeting Finder is the canonical macOS way to empty trash. If Finder is running, it works. |

## Denial-path test

| Step | Prediction | Reasoning |
|------|------------|-----------|
| 18. Click Deny | ✅ Confident | `handleAiRejectTool` (`App.tsx:2681`) calls `approvalController.deny()` → `denyAgentProposal()` → `agent.deny_proposal()` → sends `ApprovalDecision::Deny` through the oneshot channel. `execute_step` receives `Err(AgentError::ApprovalDenied)` and propagates it. `App.tsx` displays the denial reason in chat. No panic path exists. |

## Cost-tracking test

| Step | Prediction | Reasoning |
|------|------------|-----------|
| 19. Observe cost updated | 🔴 Will fail | `AgentEvent::CostUpdated` is emitted from Rust (`agent/mod.rs:248`) but the frontend (`App.tsx`, `assistantEngine.ts`) has **no handler** for this event type. `current_cost` is never displayed to the user. This is a Phase 1.5 gap, not a crash. |

---

## Critical fixes made for this prediction

1. **`packages/shared/src/index.ts`** — Added `EmptyTrashToolCall`, `GetClipboardToolCall`, `SetClipboardToolCall`, `FsMoveFilesToolCall` to the `ToolCall` union and Zod schemas so the frontend type system recognizes Phase 1 tools.
2. **`apps/desktop/src/components/ToolApprovalModal.tsx`** — Added explicit `case 'system.empty_trash'` with "Empty System Trash" title, destructive warning, and HIGH risk label. Without this, the modal showed generic "Tool Request" with no warning.
3. **`apps/desktop/src/lib/approvals.ts`** — Added risk classifications for new tools (`system.empty_trash` → high, `system.get_clipboard` → low, etc.).
4. **`apps/desktop/src/lib/aiAssist.ts`** — Narrowed legacy engine tool checks to only legacy-known tools, preventing type errors from the expanded shared union.

## Remaining concerns (not fixed)

| Concern | Severity | Why not fixed |
|---------|----------|---------------|
| `empty_trash()` has no command timeout | Low | `Command::output()` can hang if Finder is unresponsive. Fixing requires either `tokio::process` + `timeout()` (async refactor of sync tool) or spawning a thread with a join deadline. Both exceed the ~50-line fix threshold for this session. |
| Cost tracking not visible in UI | Low | Frontend needs a new event listener in `AdvancedAssistantEngineAdapter` (`assistantEngine.ts`) and a UI element to display cost. ~30 lines of UI + state. Deferred as UI polish. |
| Workspace required for system tools | Low | `App.tsx:4184` gates `ToolApprovalModal` on `workspaceState.configured`. Removing the gate for system-only tools requires distinguishing workspace vs. system tools in the approval effect. ~20 lines but touches critical path; deferred to avoid regression. |
| Claude uses text-based JSON prompts, not native `tool_use` | Low | `claude.rs:183-199` instructs Claude to return JSON. This works but is less reliable than native Anthropic `tool_use` blocks. Native tool-use support requires refactoring all providers to accept a tool schema parameter. Architectural change, deferred to Phase 2. |

---

## Overall confidence

**HIGH** — All 🔴 blockers were fixed before this document was written. The one remaining 🔴 (cost visibility) is a UI gap, not a functional blocker for the core "empty my trash" demo.
