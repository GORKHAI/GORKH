# GORKH Conversation-First Assistant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make GORKH greet users locally, stay in conversation mode until a model-generated task summary is confirmed, keep overlay/approval UI transparent during execution, allow easy normal-mode window dragging, and wire `open_app` end-to-end.

**Architecture:** Split the desktop assistant into two explicit phases. A new local-model intake/preflight path handles conversation, clarification, and “I will do X” task summaries without creating runs. The existing execution engine remains the only place that creates runs, enters overlay mode, and performs approval-gated actions, with `open_app` added across the protocol, UI, and Rust runtimes.

**Tech Stack:** React, TypeScript, Tauri, Rust, Zod, Node test runner, tsup

---

### Task 1: Write The Failing Intake Bridge Tests

**Files:**
- Create: `tests/desktop-conversation-intake.test.mjs`
- Test: `apps/desktop/src/lib/assistantConversation.ts`
- Test: `apps/desktop/src-tauri/src/lib.rs`
- Test: `apps/desktop/src-tauri/src/llm/mod.rs`
- Test: `apps/desktop/src-tauri/src/llm/native_ollama.rs`
- Test: `apps/desktop/src-tauri/src/llm/openai.rs`
- Test: `apps/desktop/src-tauri/src/llm/openai_compat.rs`
- Test: `apps/desktop/src-tauri/src/llm/claude.rs`

**Step 1: Add failing source assertions for the new intake/result contract**

Assert that the new flow defines a result shaped like:

```json
{ "kind": "reply", "message": "..." }
```

or

```json
{ "kind": "confirm_task", "goal": "...", "summary": "...", "prompt": "I will ... Confirm?" }
```

**Step 2: Add failing source assertions for the new desktop IPC**

Assert that `apps/desktop/src-tauri/src/lib.rs` exposes a dedicated `assistant_conversation_turn` command and that `apps/desktop/src/lib/assistantConversation.ts` invokes it.

**Step 3: Add failing provider-prompt assertions**

Assert that each main LLM adapter prompt explicitly says:

- do not start execution from the intake turn
- ask clarifying questions when details are missing
- return a plain-language “I will …” summary before `confirm_task`

**Step 4: Run the targeted intake bridge test**

Run:

```bash
node --test tests/desktop-conversation-intake.test.mjs
```

Expected: FAIL because the intake IPC, TypeScript helper, and provider prompts do not exist yet.

### Task 2: Implement The Intake Bridge

**Files:**
- Create: `apps/desktop/src/lib/assistantConversation.ts`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/llm/mod.rs`
- Modify: `apps/desktop/src-tauri/src/llm/native_ollama.rs`
- Modify: `apps/desktop/src-tauri/src/llm/openai.rs`
- Modify: `apps/desktop/src-tauri/src/llm/openai_compat.rs`
- Modify: `apps/desktop/src-tauri/src/llm/claude.rs`

**Step 1: Add the Rust intake request/response types**

Define conversation-turn request and response types in `apps/desktop/src-tauri/src/llm/mod.rs`, including recent chat messages and the two allowed result variants.

**Step 2: Add a provider-level conversation method**

Extend the main Rust LLM provider trait with a dedicated conversation/intake method instead of reusing the action-proposal prompt.

**Step 3: Implement conversation prompts for every supported main LLM adapter**

Update the four adapter files so they can:

- chat naturally
- ask clarifying questions
- return `confirm_task` only when the task is specific enough to execute

**Step 4: Expose the new Tauri command**

Add `assistant_conversation_turn` in `apps/desktop/src-tauri/src/lib.rs` and keep the credential lookup rules aligned with `llm_propose_next_action`.

**Step 5: Add the TypeScript client helper**

Create `apps/desktop/src/lib/assistantConversation.ts` with the invoke wrapper and TypeScript result types.

**Step 6: Run the intake bridge test again**

Run:

```bash
node --test tests/desktop-conversation-intake.test.mjs
```

Expected: PASS.

### Task 3: Write The Failing Conversation-First App Tests

**Files:**
- Modify: `tests/desktop-chat-entry.test.ts`
- Modify: `tests/desktop-gorkh-grounding.test.ts`
- Modify: `apps/desktop/src/lib/chatTaskFlow.test.mjs`
- Test: `apps/desktop/src/App.tsx`
- Test: `apps/desktop/src/lib/chatTaskFlow.ts`
- Test: `apps/desktop/src/lib/gorkhKnowledge.ts`

**Step 1: Replace the old hidden-warmup expectations**

Remove assertions that the first message creates a hidden opening run, and replace them with assertions that startup greeting is local and no warmup run is auto-created.

**Step 2: Add failing greeting assertions**

Assert that `App.tsx` sources startup greeting from `GORKH_ONBOARDING.firstGreeting` or the existing setup-specific onboarding strings.

**Step 3: Add failing conversation-routing assertions**

Assert that fresh user messages route through the new intake helper before `dispatchConfirmedAssistantTask`, and that confirmation state is populated from intake output instead of `createAssistantTaskConfirmation`.

**Step 4: Add failing helper assertions**

Update `apps/desktop/src/lib/chatTaskFlow.test.mjs` and `tests/desktop-gorkh-grounding.test.ts` so the helper contract focuses on active-run reuse and confirmation-response parsing, not `ASSISTANT_OPENING_GOAL`.

**Step 5: Run the targeted conversation-flow tests**

Run:

```bash
node --import tsx --test tests/desktop-chat-entry.test.ts tests/desktop-gorkh-grounding.test.ts apps/desktop/src/lib/chatTaskFlow.test.mjs
```

Expected: FAIL because `App.tsx` still auto-starts the warmup flow and the helper/tests still assume opening-goal behavior.

### Task 4: Implement The Conversation-First App Flow

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/ChatOverlay.tsx`
- Modify: `apps/desktop/src/lib/chatTaskFlow.ts`
- Modify: `apps/desktop/src/lib/gorkhKnowledge.ts`

**Step 1: Remove the warmup-run auto-start path**

Delete the `assistantAutoStart*` refs and the effect that creates `buildAssistantOpeningGoal(...)` runs automatically.

**Step 2: Seed a local greeting**

When the desktop becomes signed in and ready, append one onboarding greeting message if chat is still empty:

- `GORKH_ONBOARDING.firstGreeting` when conversation can begin
- existing setup guidance when Free AI/provider is not ready

**Step 3: Route fresh chat through intake**

Update `handleSendMessage` so a fresh message with no active execution run calls `assistantConversationTurn(...)` and then:

- appends a normal agent reply for `reply`
- stages `pendingTaskConfirmation` for `confirm_task`

**Step 4: Keep confirmation explicit**

Retain button-based `Proceed` and `Cancel`, plus yes/no text shortcuts, but only start `dispatchConfirmedAssistantTask` from those confirmation paths.

**Step 5: Simplify `chatTaskFlow.ts`**

Remove the opening-goal marker logic, keep `ensureAssistantRunForMessage(...)` for confirmed tasks, and keep confirmation-response parsing helpers.

**Step 6: Clear local conversation state on lifecycle resets**

Clear pending confirmation and in-flight intake state on sign-out, stop-all, stop-AI, confirmed task start, and task-start failure.

**Step 7: Run the conversation-flow tests**

Run:

```bash
node --import tsx --test tests/desktop-chat-entry.test.ts tests/desktop-gorkh-grounding.test.ts apps/desktop/src/lib/chatTaskFlow.test.mjs
```

Expected: PASS.

### Task 5: Write The Failing Overlay, Approval, And Drag Tests

**Files:**
- Modify: `tests/desktop-overlay-visual-shell.test.mjs`
- Modify: `tests/desktop-overlay-controller.test.mjs`
- Modify: `tests/desktop-overlay-approvals.test.mjs`
- Modify: `tests/desktop-overlay-window-state.test.mjs`
- Test: `apps/desktop/src/components/ActiveOverlayShell.tsx`
- Test: `apps/desktop/src/components/OverlayController.tsx`
- Test: `apps/desktop/src/components/ApprovalModal.tsx`
- Test: `apps/desktop/src/components/ActionApprovalModal.tsx`
- Test: `apps/desktop/src/components/ToolApprovalModal.tsx`
- Test: `apps/desktop/src/App.tsx`

**Step 1: Add failing shell transparency assertions**

Assert that `ActiveOverlayShell.tsx` no longer renders a centered glass card and no longer applies fullscreen blur/dimming layers.

**Step 2: Add failing main-content transparency assertions**

Assert that `App.tsx` no longer uses overlay blur/dim styling like `filter: isOverlayActive ? 'blur(...)'` on the hidden home shell.

**Step 3: Add failing approval-modal assertions**

Assert that the three overlay approval surfaces stop using fullscreen black backdrops in overlay mode and instead render compact floating cards.

**Step 4: Add failing drag-region assertions**

Assert that normal-mode chrome exposes a larger `data-tauri-drag-region` wrapper than the current small wordmark-only handle.

**Step 5: Run the targeted overlay tests**

Run:

```bash
node --test tests/desktop-overlay-visual-shell.test.mjs tests/desktop-overlay-controller.test.mjs tests/desktop-overlay-approvals.test.mjs tests/desktop-overlay-window-state.test.mjs
```

Expected: FAIL because overlay shell, approval cards, and drag region still use the current partial implementation.

### Task 6: Implement The Transparent Overlay And Movable Window Shell

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/ActiveOverlayShell.tsx`
- Modify: `apps/desktop/src/components/OverlayController.tsx`
- Modify: `apps/desktop/src/components/ApprovalModal.tsx`
- Modify: `apps/desktop/src/components/ActionApprovalModal.tsx`
- Modify: `apps/desktop/src/components/ToolApprovalModal.tsx`
- Optionally modify: `apps/desktop/src/components/OverlayDetailsPanel.tsx`

**Step 1: Make the overlay shell visually transparent**

Keep `ActiveOverlayShell` as the fixed pointer-through layer, but remove the centered card and fullscreen atmospheric gradients.

**Step 2: Remove overlay blur/dim from `App.tsx`**

Keep the app window transparent in overlay mode and hide the normal home shell without adding visual haze over the real desktop.

**Step 3: Keep only a compact overlay controller**

Tighten `OverlayController.tsx` into the primary visible control surface for execution state, pause/resume, stop, details, and short chat preview.

**Step 4: Restyle overlay approvals into compact cards**

Update the three approval modals so overlay mode uses compact translucent cards with no fullscreen dark backdrop.

**Step 5: Expand the normal-mode drag region**

Move `data-tauri-drag-region` to a larger non-interactive chrome/header wrapper while keeping buttons, inputs, and text selection functional.

**Step 6: Run the overlay tests again**

Run:

```bash
node --test tests/desktop-overlay-visual-shell.test.mjs tests/desktop-overlay-controller.test.mjs tests/desktop-overlay-approvals.test.mjs tests/desktop-overlay-window-state.test.mjs
```

Expected: PASS.

### Task 7: Write The Failing `open_app` Protocol And Runtime Tests

**Files:**
- Create: `tests/desktop-open-app-action.test.mjs`
- Modify: `tests/shared-protocol.test.mjs`
- Modify: `tests/desktop-approvals.test.ts`
- Modify: `tests/desktop-advanced-runtime.test.mjs`
- Test: `packages/shared/src/index.ts`
- Test: `apps/desktop/src/lib/approvals.ts`
- Test: `apps/desktop/src/lib/actionExecutor.ts`
- Test: `apps/desktop/src-tauri/src/lib.rs`
- Test: `apps/desktop/src-tauri/src/llm/mod.rs`
- Test: `apps/desktop/src-tauri/src/agent/mod.rs`
- Test: `apps/desktop/src-tauri/src/agent/executor.rs`
- Test: `apps/desktop/src-tauri/src/agent/providers/native_ollama.rs`
- Test: `apps/desktop/src-tauri/src/agent/providers/local_compat.rs`
- Test: `apps/desktop/src-tauri/src/agent/providers/openai.rs`
- Test: `apps/desktop/src-tauri/src/agent/providers/claude.rs`

**Step 1: Add a failing shared-protocol regression**

Assert that the shared `InputAction` schema accepts:

```json
{ "kind": "open_app", "appName": "Photoshop" }
```

**Step 2: Add a failing approval-summary regression**

Assert that `summarizeInputAction(...)` and the action approval UI produce an “Open app” summary instead of falling through to unknown action behavior.

**Step 3: Add failing runtime/planner assertions**

Assert that the Rust LLM types, advanced runtime parser, executor mapping, and provider prompts all mention `open_app`.

**Step 4: Run the targeted `open_app` tests**

Run:

```bash
node --import tsx --test tests/shared-protocol.test.mjs tests/desktop-approvals.test.ts tests/desktop-advanced-runtime.test.mjs tests/desktop-open-app-action.test.mjs
```

Expected: FAIL because `open_app` is still only partially implemented.

### Task 8: Implement `open_app` End-To-End

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/desktop/src/lib/approvals.ts`
- Modify: `apps/desktop/src/lib/actionExecutor.ts`
- Modify: `apps/desktop/src/components/ActionApprovalModal.tsx`
- Modify: `apps/desktop/src/components/RunPanel.tsx`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/llm/mod.rs`
- Modify: `apps/desktop/src-tauri/src/llm/native_ollama.rs`
- Modify: `apps/desktop/src-tauri/src/llm/openai.rs`
- Modify: `apps/desktop/src-tauri/src/llm/openai_compat.rs`
- Modify: `apps/desktop/src-tauri/src/llm/claude.rs`
- Modify: `apps/desktop/src-tauri/src/agent/mod.rs`
- Modify: `apps/desktop/src-tauri/src/agent/executor.rs`
- Modify: `apps/desktop/src-tauri/src/agent/providers/native_ollama.rs`
- Modify: `apps/desktop/src-tauri/src/agent/providers/local_compat.rs`
- Modify: `apps/desktop/src-tauri/src/agent/providers/openai.rs`
- Modify: `apps/desktop/src-tauri/src/agent/providers/claude.rs`

**Step 1: Add `open_app` to the shared action model**

Extend `packages/shared/src/index.ts` with:

- `OpenAppAction`
- Zod schema support
- log redaction/sanitization compatibility

Use `appName` as the serialized field name.

**Step 2: Update desktop approval and display helpers**

Teach `apps/desktop/src/lib/approvals.ts`, `ActionApprovalModal.tsx`, and `RunPanel.tsx` to summarize and render `open_app` cleanly.

**Step 3: Update the TypeScript execution path**

Teach `apps/desktop/src/lib/actionExecutor.ts` to execute `open_app` through a Tauri command instead of returning `UNKNOWN_ACTION`.

**Step 4: Expose a Tauri app-launch command**

Add a desktop command in `apps/desktop/src-tauri/src/lib.rs` that opens an application by name and can be reused by the TypeScript action executor.

**Step 5: Update Rust LLM action types and prompts**

Add `OpenApp` to the Rust `llm::InputAction` enum and document it in the main system prompt and the four main LLM adapters.

**Step 6: Update the advanced runtime parser and executor mapping**

Teach `apps/desktop/src-tauri/src/agent/mod.rs` to parse and summarize `open_app`, then map it into `executor::Action::OpenApp`.

**Step 7: Update the advanced-provider prompts**

Tell the advanced runtime provider prompts that `open_app` is a valid first-class action when the task requires opening a desktop application or browser.

**Step 8: Rebuild the shared package dist output**

Run:

```bash
pnpm --filter @ai-operator/shared build
```

Expected: exit 0 and refresh `packages/shared/dist/*` from the updated source.

**Step 9: Run the `open_app` tests again**

Run:

```bash
node --import tsx --test tests/shared-protocol.test.mjs tests/desktop-approvals.test.ts tests/desktop-advanced-runtime.test.mjs tests/desktop-open-app-action.test.mjs
```

Expected: PASS.

### Task 9: Run Full Verification

**Files:**
- Test: `tests/desktop-conversation-intake.test.mjs`
- Test: `tests/desktop-chat-entry.test.ts`
- Test: `tests/desktop-gorkh-grounding.test.ts`
- Test: `apps/desktop/src/lib/chatTaskFlow.test.mjs`
- Test: `tests/desktop-overlay-visual-shell.test.mjs`
- Test: `tests/desktop-overlay-controller.test.mjs`
- Test: `tests/desktop-overlay-approvals.test.mjs`
- Test: `tests/desktop-overlay-window-state.test.mjs`
- Test: `tests/desktop-open-app-action.test.mjs`
- Test: `tests/desktop-approvals.test.ts`
- Test: `tests/shared-protocol.test.mjs`
- Test: `tests/desktop-assistant-engine.test.ts`
- Test: `tests/desktop-advanced-runtime.test.mjs`
- Test: `tests/desktop-gorkh-integration.test.ts`
- Test: `tests/desktop-retail-ux.test.mjs`
- Test: `tests/desktop-task-surface.test.mjs`

**Step 1: Rebuild shared dist before final test runs**

Run:

```bash
pnpm --filter @ai-operator/shared build
```

Expected: exit 0.

**Step 2: Run the focused feature regressions**

Run:

```bash
node --import tsx --test tests/desktop-conversation-intake.test.mjs tests/desktop-chat-entry.test.ts tests/desktop-gorkh-grounding.test.ts apps/desktop/src/lib/chatTaskFlow.test.mjs tests/desktop-overlay-visual-shell.test.mjs tests/desktop-overlay-controller.test.mjs tests/desktop-overlay-approvals.test.mjs tests/desktop-overlay-window-state.test.mjs tests/desktop-open-app-action.test.mjs tests/desktop-approvals.test.ts tests/shared-protocol.test.mjs
```

Expected: all pass.

**Step 3: Run the broader desktop assistant regressions**

Run:

```bash
node --import tsx --test tests/desktop-assistant-engine.test.ts tests/desktop-advanced-runtime.test.mjs tests/desktop-gorkh-integration.test.ts tests/desktop-retail-ux.test.mjs tests/desktop-task-surface.test.mjs
```

Expected: all pass.

**Step 4: Run desktop TypeScript typecheck**

Run:

```bash
pnpm --filter @ai-operator/desktop typecheck
```

Expected: exit 0.

**Step 5: Run desktop Rust check**

Run:

```bash
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected: exit 0.
