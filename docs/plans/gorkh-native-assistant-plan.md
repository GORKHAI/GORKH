# GORKH Native Assistant — Design Plan

**Date:** 2026-03-21
**Status:** Implementing (STEP 1 in progress)

---

## Problem Statement

Today the GORKH desktop assistant is *technically* Qwen + orchestration. It works, but it
does not feel like a GORKH product. Specifically:

- The LLM identifies as a generic "AI assistant" in its system prompt
- It has zero structured knowledge of GORKH itself (features, settings, states)
- It cannot query or mutate GORKH internals — cannot check if Free AI is running,
  cannot change a toggle, cannot explain what a permission does
- The first-run greeting is generic ("Ask the user what they want done on this desktop")
- The Free AI setup UI is a card the user clicks, not something the assistant guides
- Hardware/GPU/runtime truth is surfaced only in the FreeAiSetupCard, not in the chat

---

## Current Code Truth

| Area | File | Current state |
|------|------|---------------|
| System prompt | `llm/mod.rs::build_system_prompt` | "You are an AI assistant helping a user accomplish tasks" |
| Agent provider prompts | `agent/providers/native_ollama.rs` | "You are a computer automation agent" / "You are a computer vision assistant" |
| Opening goal | `chatTaskFlow.ts::ASSISTANT_OPENING_GOAL` | "Ask the user what they want done on this desktop, then wait for their reply" |
| App context in proposals | `ProposalRequest` / `ProposalParams` | No app_context field — none injected |
| Agent task start | `start_agent_task` IPC | No app_context parameter |
| App-internal tools | `llm/mod.rs::ToolCall` | Only fs.list, fs.read_text, fs.write_text, fs.apply_patch, terminal.exec |
| Free AI knowledge | Any prompt | None |
| GORKH feature knowledge | Any file | None |

---

## Design Decisions

### A. Grounding without fine-tuning

Fine-tuning is not shipping today (docs exist but no production path). We can achieve
most of the "feels like GORKH" behaviour through:

1. **Identity** — change system prompt to say "You are GORKH, an AI desktop assistant..."
2. **Structured app context** — inject a concise block of current app state into every
   LLM call: Free AI status, provider, permissions, workspace state, auth state
3. **Static knowledge base** — a TypeScript module with plain-English descriptions of
   every GORKH feature, setting, state label, and common Q&A
4. **Internal tools** (STEP 2) — IPC commands the assistant can call to read/write
   safe GORKH settings

This approach works today with any base model — local Qwen or paid Claude/OpenAI.

### B. App-internal tools (STEP 2)

New `AppToolCall` variants that are GORKH-internal (not workspace file operations):

| Tool | Description | Safe to mutate? |
|------|-------------|-----------------|
| `app.get_state` | Full GORKH app snapshot | Read only |
| `settings.get` | Read a specific setting | Read only |
| `settings.set` | Write a safe setting (provider toggle, tier, autostart) | Yes with approval |
| `permissions.check` | Check Screen Recording / Accessibility status | Read only |
| `free_ai.get_status` | Detailed Free AI runtime status | Read only |
| `free_ai.install` | Trigger Free AI installation | Yes — user sees progress |
| `workspace.get_status` | Workspace configured / root name | Read only |
| `provider.get_status` | Provider type, configured, running | Read only |

Dangerous mutations (changing signed-in account, disabling approvals, deleting data)
remain entirely outside the tool surface.

### C. Local knowledge layer

`gorkhKnowledge.ts` — static, embedded TypeScript module:
- Feature descriptions (Free AI, remote control, screen preview, workspace, approvals)
- Setting descriptions (what each toggle does, how to reach it)
- State label explanations (what each `installStage` value means in plain English)
- Provider descriptions (free vs paid, what model, what key is needed)
- Tier descriptions (light / standard / vision, hardware requirements)
- Common Q&A strings used in greeting and help responses

`gorkhContext.ts` — dynamic context builder:
- Takes `GorkhAppSnapshot` (derived from frontend state available in `App.tsx`)
- Returns a concise, structured plain-text block for LLM injection
- Covers: auth state, provider + config status, Free AI install stage / tier / running,
  permissions (screen recording, accessibility, preview toggle, control toggle),
  workspace configured / root name

### D. Retail-friendly Free AI setup

Today: user reads a card, clicks "Set Up Free AI", watches progress bars.
Target: assistant can also guide setup in chat.

Implementation:
- Greeting message (STEP 3) checks app state and offers to set up Free AI if not ready
- Assistant can answer "what is Free AI?" using knowledge base
- Assistant can call `free_ai.install` tool (STEP 2) to trigger install from within chat
- Language in FreeAiSetupCard and prompts never mentions "Ollama", "Homebrew", or
  binary paths — these are managed details hidden from retail users

### E. Homebrew/Ollama visibility

**Decision: keep hidden.** Ollama is an implementation detail. The user sees:
- "Free AI" (not "Ollama")
- "local engine" (not "Ollama runtime binary")
- "AI model download" (not "ollama pull qwen2.5:3b")
- Progress managed by GORKH

This is already partially true. STEP 3 will audit and clean up any remaining technical
leakage in greetings and setup language.

### F. Runtime truth exposure

Exposed clearly in UI today: install stage, tier, model name, runtime source,
managed runtime dir, runtime running.

Gaps to fix:
- CPU vs GPU execution: `gpuClass` field exists (`unknown | integrated | discrete`)
  but is not clearly surfaced as "running on GPU" vs "running on CPU"
- "unknown" GPU should say "CPU only (GPU not detected)" not "GPU: unknown"
- `runtimeSource` can be "managed" or "external" — should be surfaced as
  "Managed by GORKH" vs "External Ollama (not managed)"

**Rule:** never claim GPU unless `gpuClass === 'discrete'`. `integrated` or `unknown`
= "CPU" from the user's perspective to avoid overclaiming.

### G. Retail-friendly language

Current technical leakage to fix:
- "Ollama" in error messages → "local AI engine"
- "ollama pull" in model-not-found error → "GORKH can set this up for you"
- Generic "ask what they want done" greeting → GORKH-branded greeting
- `ASSISTANT_OPENING_GOAL` constant → updated to GORKH voice

### H. Safety/privacy implications

- App context block injected into system prompt contains NO sensitive data:
  no API keys, no file contents, no typed text, no absolute paths
  (workspace root name only, not full path)
- `settings.set` tool (STEP 2) will be approval-gated for any mutation
- `free_ai.install` tool (STEP 2) shows existing FreeAiSetupCard progress — no new
  side-channel
- No new data leaves the device — context block is sent to the locally running LLM
  (for native_qwen_ollama) or to the already-configured paid API

### I. Now vs deferred

**Now (this plan):**
- STEP 1: Grounding layer (knowledge base + context injection + identity)
- STEP 2: Internal app tools
- STEP 3: First-run / setup flow improvements
- STEP 4: Runtime truth polish
- STEP 5: Integrate everything into main assistant path
- STEP 6: Provider/runtime UX honesty

**Deferred:**
- Model fine-tuning / LoRA training (docs exist, no production path yet)
- vLLM / openai_compat local model tier (referenced but not a retail path today)
- Multi-device presence for Free AI status

---

## Architecture After STEP 1

```
App.tsx
  ├─ buildGorkhContext(snapshot)           ← NEW: gorkhContext.ts
  │    └─ uses gorkhKnowledge.ts           ← NEW: static knowledge base
  │
  ├─ AssistantEngineOptions.appContext     ← NEW field (optional string)
  │
  ├─ AdvancedAssistantEngineAdapter
  │    └─ startAgentTask(goal, { appContext })   ← threads appContext
  │         └─ invoke('start_agent_task', { ..., appContext })
  │              └─ Rust: prepends context to goal for planner
  │
  └─ LegacyAiAssistEngineAdapter
       └─ AiAssistController
            └─ invoke('llm_propose_next_action', { ..., appContext })
                 └─ Rust: injects into build_system_prompt(ctx)

Rust llm/mod.rs
  └─ build_system_prompt(constraints, workspace_configured, app_context)
       ├─ "You are GORKH, an AI desktop assistant..."   ← NEW identity
       └─ [GORKH APP STATE]\n{app_context}\n[/GORKH APP STATE]  ← NEW section
```

---

## Implementation Plan

### STEP 1 — GORKH grounding layer

**Files created:**
- `apps/desktop/src/lib/gorkhKnowledge.ts` — static knowledge base
- `apps/desktop/src/lib/gorkhContext.ts` — dynamic context builder
- `tests/desktop-gorkh-grounding.test.ts` — grounding layer tests

**Files modified (TypeScript):**
- `apps/desktop/src/lib/advancedAgent.ts` — add `appContext` to `StartAgentTaskOptions`
- `apps/desktop/src/lib/aiAssist.ts` — add `gorkhContext` to `AiAssistOptions`, pass to proposal
- `apps/desktop/src/lib/assistantEngine.ts` — thread `appContext` through adapter options
- `apps/desktop/src/lib/chatTaskFlow.ts` — update `ASSISTANT_OPENING_GOAL` to GORKH voice
- `apps/desktop/src/App.tsx` — build gorkhContext, pass to engine options

**Files modified (Rust):**
- `apps/desktop/src-tauri/src/llm/mod.rs` — update `build_system_prompt` signature + identity; add `app_context` to `ProposalParams`
- `apps/desktop/src-tauri/src/llm/openai.rs` — update `build_system_prompt` call
- `apps/desktop/src-tauri/src/llm/claude.rs` — update `build_system_prompt` call
- `apps/desktop/src-tauri/src/llm/openai_compat.rs` — update `build_system_prompt` call
- `apps/desktop/src-tauri/src/llm/native_ollama.rs` — update `build_system_prompt` call
- `apps/desktop/src-tauri/src/lib.rs` — add `app_context` to `ProposalRequest`; add `app_context` to `start_agent_task`
- `apps/desktop/src-tauri/src/agent/providers/native_ollama.rs` — update plan/propose system prompts to GORKH identity

### STEP 2 — Internal app tools
New `AppToolCall` variants + Tauri IPC commands for app state read/write.

### STEP 3 — Retail-friendly first-run / setup flow
Updated greeting, guided Free AI setup in chat, cleaned-up language.

### STEP 4 — Runtime truth + diagnostics
GPU/CPU labeling, install stage polish, diagnostics export improvements.

### STEP 5 — Integrate grounding into main assistant path
Wire everything into real assistant flows, not just side systems.

### STEP 6 — Provider/runtime UX honesty
Free vs paid clarity, remove unshipped training claims, accurate docs.
