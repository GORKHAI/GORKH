# GORKH Conversation-First Assistant Design

## Context

The current desktop assistant flow is only partially aligned with the intended product behavior.

Today the app already has a local `pendingTaskConfirmation` banner in chat, but the larger runtime still behaves like an execution-first assistant:

- `App.tsx` auto-creates a hidden `ai_assist` run for the default local provider once the desktop is signed in, connected, and ready.
- The assistant engine starts from that run, so the app can enter overlay/thinking mode before the user has asked for real work.
- The pre-task confirmation copy is deterministic, not model-generated from the user’s intent.
- Overlay mode still renders a visible fullscreen glass shell and the approval modals still darken the whole screen.
- The window drag region is limited to a small area near the wordmark.
- `open_app` exists in the Rust advanced executor, but it is not carried through the shared protocol, desktop approval UI, TypeScript executors, or the advanced runtime proposal parser/provider prompts.

The approved product behavior is stricter:

1. GORKH greets the user and stays idle.
2. GORKH talks first, understands the task, asks clarifying questions if needed, and then states what it will do.
3. No task run starts until the user explicitly confirms that summary.
4. During execution, every privileged step still requires approval.
5. Overlay mode must be effectively transparent so the user can watch the desktop underneath.
6. The window must be movable outside overlay mode.
7. Opening apps like Photoshop or a browser must be wired end-to-end, not only inside one Rust enum.

## Approaches Considered

### 1. Patch the existing warmup-run flow

Keep the hidden auto-started `ai_assist` run, but try to suppress overlay/execution until the user confirms.

Pros:

- Smallest diff in `App.tsx`.
- Reuses the current assistant run bootstrap.

Cons:

- Keeps the core problem: the assistant lifecycle still starts before task confirmation.
- Leaves “conversation mode” as an implicit state spread across warmup run status, overlay status, and UI flags.
- Relies on the small local model to obey a prompt instead of making the product flow structurally safe.

### 2. Split conversation intake from execution start

Add a separate conversation/preflight path for user chat. Startup greeting stays local and idle. User messages go through a model-backed intake command that can either reply conversationally, ask for clarification, or return a ready-to-confirm task summary. Only confirmed summaries create runs and start the assistant engine.

Pros:

- Matches the intended user experience exactly.
- Removes the accidental overlay/thinking behavior for greetings like “hi”.
- Keeps the small local model useful for understanding intent without letting it silently start execution.
- Makes approvals and overlay entry happen only in execution mode.

Cons:

- Requires a new local model IPC path and new desktop state wiring.
- Touches both TypeScript and Rust LLM layers.

### 3. Full separate chat-agent and execution-agent architecture

Create two independent agents with separate state machines, storage, and prompts.

Pros:

- Strong separation of responsibilities.
- Scales well if conversation memory becomes a larger product feature later.

Cons:

- Too much architecture for the immediate problem.
- Adds unnecessary storage/session complexity before the current assistant lifecycle is stable.

## Recommended Design

Use approach 2: split conversation intake from execution start.

## Approved Behavior

### Conversation Mode

- On desktop sign-in/readiness, GORKH shows a greeting in chat and stays idle.
- The greeting is local, not model-triggered, so startup never begins a hidden run or overlay session.
- Reuse `GORKH_ONBOARDING.firstGreeting` as the default greeting string and adjust the copy to explicitly ask how GORKH can help.
- If Free AI is not ready or no provider is configured, use the existing onboarding/setup copy instead of pretending the model can work.
- In conversation mode, user messages go through a new local model intake command instead of `run.start`.

The intake command returns one of two results:

1. `reply`
   GORKH answers normally or asks a clarifying question.

2. `confirm_task`
   GORKH has understood the task well enough to execute it and returns:
   - a canonical execution goal
   - a plain-language summary
   - a prompt such as “I will open Photoshop, load the selected image, remove the background, add the requested text, and save a new copy. Confirm?”

Conversation mode never starts overlay mode and never creates an execution run by itself.

### Task Confirmation And Execution Mode

- The existing `pendingTaskConfirmation` UI stays, but its content now comes from the model-backed intake result instead of a deterministic helper string.
- If the user says `yes`, clicks `Proceed`, or otherwise confirms, the app creates or resumes the execution run and starts the assistant engine.
- If the user says `no`, clicks `Cancel`, or changes the request, the pending confirmation is cleared and GORKH stays in conversation mode.
- Once execution starts, the existing approval loop remains in place:
  - task summary confirmation before run start
  - approval for every privileged action
  - approval for every privileged tool call
  - approval for `open_app`

The execution path remains desktop-local and still uses the current assistant engine, run creation, action approvals, and tool approvals.

### Readiness And Safety Rules

- Conversation mode works even when desktop control is not ready.
- Missing screen permission: GORKH can still talk and plan, but must say it cannot inspect the screen yet.
- Missing accessibility/control permission: GORKH can still talk and plan, but must say it cannot click or type yet.
- Missing workspace: GORKH can still do GUI tasks, but must not imply it can read or edit local project files.
- Missing provider/local model: GORKH stays in onboarding/help mode and offers setup guidance.
- The product logic must enforce these boundaries. The small local Qwen model should not be trusted to “do the right thing” without UI/runtime gating.

### Window Dragging

- Outside overlay mode, the desktop window must be easy to reposition.
- Expand the Tauri drag region from the current small wordmark area into a larger non-interactive window chrome/header shell.
- Buttons, text fields, and other interactive controls must remain clickable and must not become accidental drag handles.
- Overlay mode keeps fullscreen execution behavior and does not need normal drag handling.

### Overlay And Approval Presentation

- Overlay mode activates only during confirmed execution.
- The fullscreen shell must become visually transparent:
  - no centered glass card
  - no fullscreen dim layer
  - no atmospheric blur that hides the desktop underneath
- Keep only a compact floating control surface for:
  - status
  - short conversation preview
  - pause/resume
  - stop
  - details
- Approval surfaces in overlay mode must also stop darkening the full screen. They should become compact floating cards so the user can still watch what GORKH is doing underneath.

### App-Launch Capability

`open_app` must be wired end-to-end.

That requires changes in all of these layers:

- shared protocol `InputAction` and Zod schemas
- desktop approval summaries and action approval modal
- TypeScript action executor for non-advanced action paths
- Rust `llm::InputAction`
- advanced runtime parser in `agent/mod.rs`
- advanced runtime action summaries and executor mapping
- provider prompts so the model is actually told `open_app` exists

After this work, requests like “Open Photoshop” or “Open Gmail in my browser” become structurally supported, not only “supported if the model guesses a click sequence”.

## Error Handling

- Pending confirmation clears on:
  - sign out
  - stop all
  - stop AI
  - confirmed task start
  - task-start failure
- If the intake call fails, GORKH should append a visible chat error and remain in conversation mode.
- If execution fails after confirmation, the assistant error still appears in chat and overlay exits cleanly.
- If an approval expires or is denied during execution, the assistant should surface the reason and remain paused/stopped instead of silently continuing.

## Testing Strategy

Add or update source-based regressions for:

- no hidden warmup run at startup
- startup greeting sourced from onboarding copy
- fresh chat messages route through the new intake helper
- model-backed task summary confirmation before any run starts
- transparent overlay shell with compact controller only
- compact transparent approval cards in overlay mode
- larger normal-mode drag region
- `open_app` in shared protocol, approval UI, TypeScript execution, Rust LLM types, advanced runtime parser, and provider prompts

Run focused tests first, then broader desktop regressions, then desktop typecheck and Rust `cargo check`.

## Expected Files

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/components/ChatOverlay.tsx`
- `apps/desktop/src/components/ActiveOverlayShell.tsx`
- `apps/desktop/src/components/OverlayController.tsx`
- `apps/desktop/src/components/ApprovalModal.tsx`
- `apps/desktop/src/components/ActionApprovalModal.tsx`
- `apps/desktop/src/components/ToolApprovalModal.tsx`
- `apps/desktop/src/lib/chatTaskFlow.ts`
- `apps/desktop/src/lib/assistantConversation.ts`
- `apps/desktop/src/lib/gorkhKnowledge.ts`
- `apps/desktop/src/lib/actionExecutor.ts`
- `apps/desktop/src/lib/approvals.ts`
- `packages/shared/src/index.ts`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/llm/mod.rs`
- `apps/desktop/src-tauri/src/llm/native_ollama.rs`
- `apps/desktop/src-tauri/src/llm/openai.rs`
- `apps/desktop/src-tauri/src/llm/openai_compat.rs`
- `apps/desktop/src-tauri/src/llm/claude.rs`
- `apps/desktop/src-tauri/src/agent/mod.rs`
- `apps/desktop/src-tauri/src/agent/executor.rs`
- `apps/desktop/src-tauri/src/agent/providers/native_ollama.rs`
- `apps/desktop/src-tauri/src/agent/providers/local_compat.rs`
- `apps/desktop/src-tauri/src/agent/providers/openai.rs`
- `apps/desktop/src-tauri/src/agent/providers/claude.rs`
- `tests/desktop-conversation-intake.test.mjs`
- `tests/desktop-chat-entry.test.ts`
- `tests/desktop-gorkh-grounding.test.ts`
- `apps/desktop/src/lib/chatTaskFlow.test.mjs`
- `tests/desktop-overlay-visual-shell.test.mjs`
- `tests/desktop-overlay-controller.test.mjs`
- `tests/desktop-overlay-approvals.test.mjs`
- `tests/desktop-overlay-window-state.test.mjs`
- `tests/desktop-open-app-action.test.mjs`
- `tests/desktop-approvals.test.ts`
- `tests/shared-protocol.test.mjs`
