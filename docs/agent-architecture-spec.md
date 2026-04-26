# GORKH Advanced Agent — Architecture Specification

> **Version:** 0.1-draft  
> **Date:** 2026-04-24  
> **Scope:** Desktop advanced-agent runtime (`apps/desktop/src-tauri/src/agent/`), shared workflow types (`packages/shared/src/agent/`), and their React/IPC integration surfaces.  
> **Status:** This document describes the *current* architecture as it exists in the codebase. Several subsystems are stubbed or incomplete; gaps are explicitly marked.

---

## 1. Executive Summary

GORKH contains **two parallel agent architectures** that share no runtime code:

| Dimension | System A — Rust Advanced Agent | System B — Shared TypeScript Workflow |
|-----------|--------------------------------|---------------------------------------|
| **Location** | `apps/desktop/src-tauri/src/agent/` | `packages/shared/src/agent/` |
| **Runtime** | Rust (Tauri backend) | TypeScript (frontend + Node) |
| **UI surface** | `assistantEngine.ts` → `App.tsx` chat overlay | `AgentWorkflow.tsx` debug panel |
| **Planning** | `HierarchicalPlanner` (LLM-driven, 1–N steps) | 5 rigid phases (`research` → `specify` → `plan` → `work` → `review`) |
| **Execution** | `ActionExecutor` (desktop input + workspace tools) | Stubbed (`Error('Not implemented')`) |
| **Provider layer** | `agent::providers` (4 providers, router stubbed) | `packages/shared/src/llm-client.ts` (skill reference) |
| **Vision** | Screenshot + LLM `analyze_screen` inline | Not implemented |
| **Approvals** | Built into `AdvancedAgent` loop (`PendingInteraction`) | Not implemented |
| **Maturity** | Partial — core loop works, router is stub | Experimental / debug-only |

**Key insight:** The *production* chat/assist path today lives in `llm::create_provider()` (openai.rs, claude.rs, native_ollama.rs, openai_compat.rs) and is driven by the frontend `AiAssistController`. The Rust Advanced Agent is an *experimental second engine* that shares the same Tauri commands and approval UI but runs a completely different backend loop. It is selectable at runtime via a `<select>` in Settings.

**Critical blockers (P0):**
1. `ProviderRouter::route()` returns `NOT_IMPLEMENTED` for every provider — the advanced agent cannot obtain an LLM provider through the router.
2. `AdvancedAgent::build_provider()` bypasses the router and instantiates providers directly, so the agent *can* run, but fallback logic is dead code.
3. The TypeScript 5-phase executors are all stubs.

---

## 2. System A — Rust Advanced Agent

### 2.1 Module Layout

```
agent/
├── mod.rs                    (1382 lines) — Core runtime, event loop, parsing
├── executor.rs               (187 lines)  — Desktop action primitives
├── planner.rs                (323 lines)  — Hierarchical task planning
├── providers/
│   ├── mod.rs                (377 lines)  — Trait + Router + error types
│   ├── claude.rs             (201 lines)  — Anthropic Messages API
│   ├── local_compat.rs       (273 lines)  — OpenAI-compatible local + hosted fallback
│   ├── native_ollama.rs      (273 lines)  — Ollama /api/generate
│   └── openai.rs             (240 lines)  — OpenAI chat completions
├── recorder.rs               (239 lines)  — Demonstration recording (dead code)
└── vision.rs                 (286 lines)  — VisionEngine + OmniParser adapter (dead code)
```

### 2.2 Provider Layer

#### 2.2.1 Trait Definition (`agent/providers/mod.rs:86-119`)

```rust
#[async_trait]
pub trait LlmProvider: Send + Sync {
    fn provider_type(&self) -> ProviderType;
    fn name(&self) -> &str;
    async fn is_available(&self) -> bool;
    fn capabilities(&self) -> ProviderCapabilities;
    async fn plan_task(&self, request: PlanRequest) -> Result<String, ProviderError>;
    async fn analyze_screen(&self, request: ScreenAnalysisRequest) -> Result<String, ProviderError>;
    async fn propose_next_step(&self, request: ActionRequest) -> Result<String, ProviderError>;
    async fn summarize_result(&self, result_text: &str) -> Result<String, ProviderError>;
    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64;
}
```

The trait is **specialized for agent operations**, not general chat. Each method returns raw `String` content that the caller (`mod.rs` or `planner.rs`) parses as JSON.

**Request types:**
- `PlanRequest { goal, context: Option<String> }`
- `ScreenAnalysisRequest { screenshot_base64, goal, previous_actions }`
- `ActionRequest { observation, goal, step_description }`

**Response type:**
- `LlmResponse { content, input_tokens, output_tokens, model, finish_reason }`

**Error type:**
- `ProviderError { code, message, is_retryable }`

#### 2.2.2 Provider Implementations

All four provider implementations are **complete and functional** when instantiated directly.

| Provider | File | Endpoint | Vision | Default Model | Cost Model |
|----------|------|----------|--------|---------------|------------|
| `NativeOllama` | `native_ollama.rs` | `POST /api/generate` | Yes (if `vl`/`vision`/`llava` in name) | `qwen2.5-vl:7b` | $0.00 |
| `LocalCompat` | `local_compat.rs` | `POST {endpoint}/v1/chat/completions` | Optional flag | User-defined | $0.00 |
| `OpenAi` | `openai.rs` | `POST https://api.openai.com/v1/chat/completions` | Yes (GPT-4o) | `gpt-4o` | $5/M in, $15/M out |
| `Claude` | `claude.rs` | `POST https://api.anthropic.com/v1/messages` | Yes | `claude-3-5-sonnet-20241022` | $3/M in, $15/M out |

**Common implementation pattern:**
1. Build system prompt (planning, screen analysis, or next-step) — each provider has its own prompt strings tailored to its model family.
2. Build user message with optional base64 PNG image.
3. POST to provider endpoint.
4. Parse response text as JSON (via `parse_json_response` from `crate::llm`).
5. Return `LlmResponse` with token usage.

**No native tool/function calling is used.** The model is instructed via system prompt to emit strict JSON. This matches the production `llm` module design.

#### 2.2.3 ProviderRouter (`agent/providers/mod.rs:220-375`) — **STUB**

```rust
pub struct ProviderRouter {
    providers: RwLock<HashMap<ProviderType, Box<dyn LlmProvider>>>,
    default_provider: RwLock<Option<ProviderType>>,
    fallback_order: RwLock<Vec<ProviderType>>,
    user_preferences: RwLock<UserPreferences>,
}
```

The router is designed to:
- Hold registered providers in a `HashMap`.
- Route requests by preference → default → fallback chain.
- Skip paid providers if `ask_before_paid` is true.
- Check `is_available()` before selecting.

**Current implementation gaps:**
- `get_provider()` always returns `None` (`mod.rs:307`).
- `route()` returns `ProviderError::new("NOT_IMPLEMENTED", ...)` for all successful paths (`mod.rs:327`).
- The router is **not used** by `AdvancedAgent`. `mod.rs` calls `build_provider()` directly.

**Root cause:** `Box<dyn LlmProvider>` cannot be cloned, so `get_provider` cannot return an owned box without either (a) re-instantiating the provider from config, or (b) changing the trait to allow borrowed access (e.g., `Arc<dyn LlmProvider>`).

### 2.3 Planner (`agent/planner.rs`)

#### 2.3.1 Types

```rust
pub struct TaskPlan {
    pub goal: String,
    pub steps: Vec<PlanStep>,
    pub estimated_duration_secs: u64,
    pub required_apps: Vec<String>,
}

pub struct PlanStep {
    pub id: String,
    pub title: String,
    pub description: String,
    pub step_type: StepType,
    pub status: StepStatus,
    pub retry_count: u32,
    pub max_retries: u32,
    pub is_critical: bool,
}

pub enum StepType { UiAction, ToolCall, AskUser, Verification }
pub enum StepStatus { Pending, Running, Completed, FailedRetryable, Failed, AwaitingUser }
```

#### 2.3.2 `HierarchicalPlanner`

```rust
pub struct HierarchicalPlanner<'a> {
    provider: &'a dyn super::providers::LlmProvider,
}

pub async fn create_plan(&self, goal: &str) -> Result<TaskPlan, String>
pub async fn revise_plan(&self, current_plan: &TaskPlan, failed_step_id: &str, failure_reason: &str) -> Result<TaskPlan, String>
```

**`create_plan` flow:**
1. Send `PlanRequest { goal, context: None }` to `provider.plan_task()`.
2. Parse response as JSON array of steps (`parse_plan_steps`).
3. Fallback parsing: direct JSON → strip markdown fences → extract first `[...]` array → single-object fallback.
4. Sanitize empty IDs to `step_N`.
5. Estimate duration (`5s * steps + 3s * ui_actions`).
6. Detect required apps via keyword matching against goal (15 hardcoded keywords: `browser`, `chrome`, `safari`, `terminal`, `vscode`, `excel`, `word`, `powerpoint`, `slack`, `discord`, `spotify`, `finder`, `explorer`, `photos`, `mail`).

**`create_simple_plan` (fallback):** Returns a single critical `UiAction` step when LLM planning fails.

**`revise_plan`:** Implemented but marked `#[allow(dead_code)]`; the agent loop does not invoke replanning.

### 2.4 Executor (`agent/executor.rs`)

#### 2.4.1 Action Types

```rust
pub enum Action {
    Wait { duration_ms: u64 },
    Click { x: f64, y: f64, button: MouseButton },
    DoubleClick { x: f64, y: f64 },
    Scroll { dx: i32, dy: i32 },
    Type { text: String },
    Hotkey { key: String, modifiers: Option<Vec<String>> },
    OpenApp { app_name: String },
    TakeScreenshot,
}
```

#### 2.4.2 `ActionExecutor`

```rust
pub struct ActionExecutor { display_id: String }

pub async fn execute(&self, action: Action) -> Result<ActionResult, ExecuteError>
```

**Execution mapping:**

| Action | Implementation |
|--------|----------------|
| `Wait` | `tokio::time::sleep` |
| `Click` | `crate::input_click` (Tauri command) |
| `DoubleClick` | `crate::input_double_click` |
| `Scroll` | `crate::input_scroll` |
| `Type` | `crate::input_type` |
| `Hotkey` | `crate::input_hotkey` |
| `OpenApp` | `std::process::Command` (`open -a` macOS, `cmd /C start` Windows) + 2s sleep |
| `TakeScreenshot` | No-op (screenshots handled by vision engine) |

**Policy helpers (dead code):**
- `is_privileged()` — clicks, scrolls, types, hotkeys, open_app are privileged.
- `is_repeatable_safe()` — only `Wait` and small scrolls (`< 100`) are safe to repeat without re-approval.

### 2.5 Vision (`agent/vision.rs`)

**`ScreenObservation`** (used by `mod.rs`):
```rust
pub struct ScreenObservation {
    pub screen_summary: String,
    pub ui_elements: Vec<UiElement>,
    pub notable_warnings: Vec<String>,
    pub inferred_app: Option<String>,
}
```

**`VisionEngine`** (complete but unused):
- `observe()` → capture screenshot (`crate::capture_display_png`) + send to `provider.analyze_screen()`.
- `observe_for_goal(goal, previous_actions)` → same with context.

The core agent loop in `mod.rs` does **not** use `VisionEngine`. Instead, it calls `observe_screen()` directly (an inline free function in `mod.rs` that duplicates the screenshot + analyze logic).

**`OmniParserClient`** (optional adapter):
- Endpoint: `http://127.0.0.1:7861`
- Converts OmniParser `bbox` output to `UiElement` format.
- Never called by the core loop.

### 2.6 Core Runtime (`agent/mod.rs`)

#### 2.6.1 Public Types

```rust
pub enum SafetyLevel { Strict, Balanced }

pub struct AgentConfig {
    pub primary_provider: ProviderType,
    pub fallback_provider: Option<ProviderType>,
    pub safety_level: SafetyLevel,
    pub ask_before_paid: bool,
    pub cost_limit_per_task: f64,
    pub max_steps: u32,
    pub max_retries: u32,
    pub provider_base_url: Option<String>,
    pub provider_model: Option<String>,
    pub display_id: String,
    pub provider_api_key: Option<String>,
    pub provider_supports_vision: Option<bool>,
}

pub enum AgentTaskStatus {
    Planning,
    Executing { current_step, total_steps },
    AwaitingApproval { step_id },
    AwaitingUserInput { question },
    Completed,
    Failed { reason },
    Cancelled,
}

pub struct AgentTask {
    pub task_id: String,
    pub goal: String,
    pub status: AgentTaskStatus,
    pub plan: Option<TaskPlan>,
    pub current_cost: f64,
    pub provider_used: String,
    pub created_at: u64,
    pub updated_at: u64,
}

pub enum AgentEvent {
    TaskStarted, PlanCreated, StepStarted, ScreenObserved,
    ProposalReady, ActionProposed, ActionApproved, ActionDenied,
    ActionExecuted, StepCompleted, StepFailed, ProviderSwitched,
    CostUpdated, TaskCompleted, TaskFailed,
}
```

#### 2.6.2 `AdvancedAgent` Lifecycle

```rust
pub fn new(config, _router, callback) -> Self
pub async fn start_task(&self, goal) -> Result<String, AgentError>
pub async fn get_current_task(&self) -> Option<AgentTask>
pub async fn approve_proposal(&self) -> Result<(), AgentError>
pub async fn deny_proposal(&self, reason) -> Result<(), AgentError>
pub async fn submit_user_response(&self, response) -> Result<(), AgentError>
pub async fn cancel(&self)
```

**`start_task`:**
1. Spawns a background `tokio::task` running `run_task_loop`.
2. Returns `task_id` immediately.

**`run_task_loop`:**
1. `build_provider(config)` → instantiates concrete provider from config (ignores `_router`).
2. `HierarchicalPlanner::new(provider).create_plan(goal)`.
3. Truncates plan to `config.max_steps`.
4. For each step, calls `execute_step`.
5. On success, calls `complete_task` which emits `TaskCompleted`.
6. On error, emits `TaskFailed`.

**`execute_step`:**
1. If step is `AskUser`, emits `AwaitingUserInput` and blocks on oneshot channel.
2. Otherwise, decides if vision is needed (`task_needs_vision` — keyword heuristic: `screen`, `click`, `ui`, `button`, `window`, `app`, `interface`, `web`, `page`).
3. If vision needed, calls `observe_screen()` → screenshot + `provider.analyze_screen()`.
4. Calls `propose_next_operation(provider, goal, step, observation)`.
5. Parses LLM response into `NextOperation`:
   - `AutoAction { action, summary }`
   - `Approval { proposal, execution }`
   - `AskUser { question }`
   - `Done { summary }`
6. If `Approval`, emits `ProposalReady` + `ActionProposed`, blocks on oneshot for user decision.
7. Executes action/tool via `ActionExecutor` or `workspace::tool_execute_for_agent`.
8. Emits `ActionExecuted`, then `StepCompleted` or `StepFailed`.

**Approval flow:**
- Uses `PendingInteraction::Approval { sender: oneshot::Sender<ApprovalDecision> }`.
- `request_approval` stores pending interaction, emits events, awaits receiver.
- `approve_proposal` / `deny_proposal` resolve the pending interaction.
- Cancellation resolves pending interactions with dummy values so the loop exits cleanly.

**`build_provider`:**
```rust
fn build_provider(config: &AgentConfig) -> Result<Box<dyn providers::LlmProvider>, AgentError>
```
Matches `primary_provider` and constructs:
- `NativeOllamaProvider` → endpoint from config or `http://127.0.0.1:11434`, model from config or `qwen2.5-vl:7b`
- `OpenAiProvider` → API key from config or keychain (`llm_api_key:openai`), base URL or `https://api.openai.com/v1`, model or `gpt-4o`
- `ClaudeProvider` → API key from config or keychain (`llm_api_key:claude`), model or `claude-3-5-sonnet-20241022`
- `LocalCompatProvider` → endpoint, model, optional API key, vision flag

### 2.7 Tauri Command Surface (`lib.rs:2219-2342`)

| Command | Handler | State |
|---------|---------|-------|
| `start_agent_task` | `start_agent_task` | Creates `AdvancedAgent`, stores in `AgentState`, returns `task_id` |
| `get_agent_task_status` | `get_agent_task_status` | Reads `agent.get_current_task()` |
| `cancel_agent_task` | `cancel_agent_task` | Calls `agent.cancel()` |
| `approve_agent_proposal` | `approve_agent_proposal` | Calls `agent.approve_proposal()` |
| `deny_agent_proposal` | `deny_agent_proposal` | Calls `agent.deny_proposal(reason)` |
| `submit_agent_user_response` | `submit_agent_user_response` | Calls `agent.submit_user_response(response)` |
| `list_agent_providers` | `list_agent_providers` | Reads `state.router.list_providers()` (returns static info) |

**`AgentState`:**
```rust
pub struct AgentState {
    router: Arc<ProviderRouter>,
    agent: Arc<RwLock<Option<AdvancedAgent>>>,
}
```
Only one advanced agent task can exist at a time. Starting a new task overwrites the previous agent instance.

### 2.8 Frontend Adapter Layer

#### 2.8.1 `advancedAgent.ts` (`apps/desktop/src/lib/advancedAgent.ts`)

Thin type-safe IPC wrapper (176 lines). Zero business logic.

- Maps `listProviders()` → `invoke('list_agent_providers')`
- Maps `startAgentTask(goal, opts)` → `invoke('start_agent_task', { goal, ...opts })`
- Maps `onAgentEvent(cb)` → `listen('agent:event', cb)`
- Exports TypeScript types mirroring Rust structs (`AgentTaskStatus`, `AgentEvent`, `PlanStep`, etc.)

#### 2.8.2 `assistantEngine.ts` (`apps/desktop/src/lib/assistantEngine.ts`)

Polymorphic adapter (444 lines) that hides engine differences from `App.tsx`.

```typescript
export type AssistantEngineId = 'advanced_agent' | 'ai_assist_legacy';
export const DEFAULT_ASSISTANT_ENGINE_ID = 'ai_assist_legacy';
```

**`LegacyAiAssistEngineAdapter`** — wraps `AiAssistController`.

**`AdvancedAssistantEngineAdapter`** — wraps Rust advanced agent:
- `start()` → `startAgentTask(goal, mappedSettings)`
- `stop()` → `cancelAgentTask()`
- `approveAction()` / `approveTool()` → both call `approveAgentProposal()` (Rust does not distinguish at IPC level)
- `dismissPendingProposal()` → `denyAgentProposal(reason)`
- `userResponse()` → `submitAgentUserResponse(response)`
- Translates `AgentEvent` stream into `AssistantEngineState` updates

**`App.tsx` integration:**
- Settings UI contains a `<select>` bound to `assistantEngineId` (lines ~2993–3005).
- `startAssistantEngine()` creates the engine via `createAssistantEngine(engineId, options)`.
- Approval bridging: when `aiState.status === 'awaiting_approval'`, `App.tsx` creates approval items in `approvalController` and forwards decisions to the engine.

---

## 3. System B — Shared TypeScript Workflow

### 3.1 Module Layout

```
packages/shared/src/agent/
├── types.ts      (333 lines) — All domain types (WorkflowState, FeatureSpecification, etc.)
├── agents.ts     (386 lines) — Static registry of 16 persona-driven agents
└── workflow.ts   (561 lines) — State machine + phase dispatchers (all stubs)
```

### 3.2 5-Phase Model

```typescript
export const WorkflowPhaseOrder = [
  'research',
  'specify',
  'plan',
  'work',
  'review',
] as const;
```

| Phase | Responsibility | Agent Roles | Current State |
|-------|----------------|-------------|---------------|
| `research` | Explore codebase, identify patterns, surface findings | `ARCHITECT_ADVISOR`, `RESEARCH_ORCHESTRATOR` | Stubbed |
| `specify` | Produce TCRO `FeatureSpecification` | `SPEC_WRITER` | Stubbed (returns minimal spec) |
| `plan` | Produce `ImplementationPlan` with tasks, deps, risks | `BACKEND_ARCHITECT`, `INFRASTRUCTURE_BUILDER` | Stubbed (returns empty plan) |
| `work` | Execute implementation tasks | `FULL_STACK_DEVELOPER`, `API_BUILDER`, `TEST_GENERATOR`, `DEPLOYMENT_ENGINEER`, `MONITORING_EXPERT`, `AI_ENGINEER` | Stubbed |
| `review` | Code review across 7 perspectives | `CODE_REVIEWER`, `SECURITY_SCANNER`, `PERFORMANCE_ENGINEER`, `FRONTEND_REVIEWER`, `DATABASE_OPTIMIZER` | Stubbed |

### 3.3 State Machine

```typescript
export interface WorkflowState {
  currentPhase: WorkflowPhase;
  completedPhases: WorkflowPhase[];
  phaseData: Record<WorkflowPhase, PhaseData>;
  ralphMode: boolean;
  ralphIterations: number;
  createdAt: number;
  updatedAt: number;
}

export interface PhaseData {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  output?: unknown;
  artifacts: string[];
  notes: string[];
}
```

**`createWorkflowState()`** initializes all phases to `pending`.
**`advancePhase(state, output)`** marks current phase `completed`, next phase `in_progress`.
**`failPhase(state, error)`** marks current phase `failed`.

### 3.4 TCRO Specification Framework

```typescript
export interface FeatureSpecification {
  id: string;
  title: string;
  description: string;
  testCases: TestCase[];
  constraints: Constraint[];
  resources: Resource[];
  objectives: Objective[];
  createdAt: number;
  updatedAt: number;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'implemented';
  parentSpec?: string;
  childSpecs: string[];
  relatedFiles: string[];
}
```

The `specify` phase is intended to generate a full TCRO spec. The stub returns a hardcoded minimal spec with a single test case.

### 3.5 Ralph Wiggum Iteration System

```typescript
export interface RalphConfig {
  enabled: boolean;
  maxIterations: number;
  qualityGate: string; // Regex or pattern
  focusArea?: string;
  failOnMaxIterations: boolean;
}
```

When `ralphMode` is enabled, each phase can be retried up to `maxIterations` times until the output matches the `qualityGate` regex. This is an iterative refinement loop named after the Simpson's character who "tries again until it looks right."

Current stub behavior: `checkQualityGate` returns `true` on first iteration, so no actual iteration occurs.

### 3.6 Phase Executors

All executors are `async` functions that return `PhaseResult`:

```typescript
export interface PhaseResult {
  success: boolean;
  output: string;
  artifacts: string[];
  nextPhase?: WorkflowPhase;
  ralphSession?: RalphSession;
  error?: string;
}
```

**Current implementations:**

| Executor | Line | Behavior |
|----------|------|----------|
| `executeResearchPhase` | 188 | `throw new Error('Not implemented')` |
| `executeSpecifyPhase` | 237 | Returns hardcoded minimal `FeatureSpecification` as markdown |
| `executePlanPhase` | 311 | `throw new Error('Not implemented')` |
| `executeWorkPhase` | 389 | `throw new Error('Not implemented')` |
| `executeReviewPhase` | 424 | `throw new Error('Not implemented')` |

**`runCompleteWorkflow(context, ralphMode)`** (line ~516):
1. Creates `WorkflowState`.
2. Iterates `WorkflowPhaseOrder`.
3. Calls `executePhase(phase, context, previousOutput, ralphConfig)`.
4. Will always fail because executors throw.

### 3.7 Agent Registry (`agents.ts`)

16 static agent definitions with `promptTemplate`, `expertise`, `phase`, and `tools`. Example:

```typescript
export const AGENTS: Record<AgentRole, Agent> = {
  [AgentRole.FULL_STACK_DEVELOPER]: {
    id: AgentRole.FULL_STACK_DEVELOPER,
    name: 'Full Stack Developer',
    description: 'End-to-end implementation specialist...',
    expertise: ['TypeScript', 'React', 'Node.js', 'Rust', 'System Design'],
    phase: 'work',
    promptTemplate: `You are a Full Stack Developer. {{input}}`,
    tools: ['fs.read_text', 'fs.write_text', 'fs.apply_patch', 'terminal.exec'],
  },
  // ... 15 more
};
```

Used only by `AgentWorkflow.tsx` for sidebar display and agent selection.

### 3.8 UI Surface (`AgentWorkflow.tsx`)

- **Not connected to Tauri.** Pure React component running workflow logic in the browser/webkit process.
- Calls `executePhase` and `runCompleteWorkflow` directly.
- Sidebar: phase navigation, agent groups, Ralph mode toggle.
- Never imported by `App.tsx`. Exists as a standalone debug surface.

---

## 4. Integration Points & Boundaries

### 4.1 Rust Agent ↔ Frontend IPC

```
Rust AdvancedAgent
  ├─ emits AgentEvent ──► Tauri emit("agent:event")
  │                        ▼
  │                   advancedAgent.ts onAgentEvent()
  │                        ▼
  │                   AdvancedAssistantEngineAdapter
  │                        ▼
  │                   App.tsx (aiState, currentProposal)
  │                        ▼
  │                   approvalController (approval items)
  │                        ▼
  │                   User clicks Approve/Deny
  │                        ▼
  │                   App.tsx → assistantEngine.approveAction()/deny...
  │                        ▼
  │                   advancedAgent.ts approveAgentProposal()
  │                        ▼
  └─◄───────────────── Tauri invoke("approve_agent_proposal")
```

### 4.2 Rust Agent ↔ Tool Execution

**Desktop actions** (`Click`, `Type`, `Hotkey`, etc.):
- `ActionExecutor::execute` → `crate::input_*` Tauri commands → macOS Accessibility API / Windows SendInput.

**Workspace tools** (`fs.*`, `terminal.exec`):
- `mod.rs` → `workspace::tool_execute_for_agent(tool_call)` → `workspace.rs`.
- Path resolution: `resolve_workspace_path` prevents directory traversal; rejects absolute paths.
- Limits: 1MB read, 100KB terminal output, 1000 directory entries.
- Risk classification: `ToolRiskLevel` (Low/Medium/High). Destructive terminal commands (`rm`, `del`, `format`, `dd`) flagged.

**GORKH internal tools** (`app.get_state`, `settings.set`, `free_ai.install`):
- These exist in `llm::ToolCall` (deserialization) but are **not** handled by `workspace::ToolCall`.
- The Rust advanced agent loop does **not** currently route GORKH tools. It only handles workspace tools via `tool_execute_for_agent`.
- In the legacy `AiAssistController`, GORKH tools are handled by `gorkhTools.ts`.

### 4.3 Shared Workflow ↔ Anything Else

The TypeScript workflow module (`packages/shared/src/agent/`) has **no runtime integration** with:
- The Rust advanced agent
- The production `llm::` provider path
- The Tauri command surface
- The workspace tool execution layer

It is a self-contained type system + state machine used only by `AgentWorkflow.tsx`.

---

## 5. Security & Privacy Boundaries

| Boundary | Rule | Enforcement |
|----------|------|-------------|
| API keys | Never leave the machine | Keychain storage via `keyring` crate. Only Rust backend reads keys. |
| Screen data | Ephemeral, 60s expiry | Screenshots taken in-memory only. Never persisted to disk by agent loop. |
| Approvals | Local, mandatory | `AdvancedAgent` blocks on oneshot channel. No auto-execution of privileged actions. |
| Workspace path traversal | Prevented | `resolve_workspace_path` rejects absolute paths and canonicalizes parents. |
| Cost limits | Configurable but unenforced | `AgentConfig::cost_limit_per_task` exists; `current_cost` is never updated. |
| Paid provider gating | Configurable but unenforced | `ask_before_paid` exists; router fallback logic is dead code. |

---

## 6. Known Gaps & Blockers

### P0 — Prevents advanced agent from being the default engine

1. **ProviderRouter is a total stub** (`agent/providers/mod.rs:307,327`)
   - `get_provider` returns `None`.
   - `route` returns `NOT_IMPLEMENTED`.
   - The agent works only because `build_provider` bypasses the router entirely.

2. **Fallback provider logic is dead code**
   - `AgentConfig::fallback_provider` is never read.
   - If `build_provider` fails (e.g., Ollama not running), the task fails immediately with no retry.

3. **Cost tracking is unimplemented**
   - `AgentTask::current_cost` is initialized to `0.0` and never updated.
   - `estimate_cost` is called on providers but results are discarded.

4. **Max retries is unimplemented**
   - `AgentConfig::max_retries` exists but `execute_step` has no retry loop.
   - `StepStatus::FailedRetryable` is never produced.

5. **SafetyLevel::Balanced is unimplemented**
   - All actions go through the same approval path regardless of `SafetyLevel`.
   - `Action::is_repeatable_safe` and `is_privileged` are dead code.

6. **Shared TypeScript phase executors are stubs**
   - `executeResearchPhase`, `executePlanPhase`, `executeWorkPhase`, `executeReviewPhase` throw.
   - `runCompleteWorkflow` always fails.

### P1 — Degraded experience / tech debt

7. **VisionEngine and DemonstrationRecorder are dead code**
   - Both modules are marked `#[allow(dead_code)]` and never instantiated by the core loop.
   - `VisionEngine` logic is duplicated inline in `mod.rs::observe_screen`.

8. **No GORKH tool support in Rust agent**
   - The advanced agent cannot call `app.get_state`, `settings.set`, or `free_ai.install`.
   - It only handles workspace tools.

9. **Replanning on step failure is not implemented**
   - `HierarchicalPlanner::revise_plan` exists but is never called.
   - If a step fails, the task fails.

10. **AgentWorkflow.tsx components are orphaned**
    - `AgentTaskDialog`, `AgentTaskMonitor`, `AgentProviderSelector` are defined but never imported by `App.tsx`.
    - Users can only access the advanced agent through the generic `assistantEngineId` selector in Settings.

11. **Terminal tool execution has no timeout in Rust**
    - `workspace.rs` comment claims 30s timeout, but no `tokio::time::timeout` is applied.

---

## 7. Recommended Implementation Priority

To make the advanced agent production-ready, work should proceed in this order:

### Phase 1 — Router & Fallback (unblock reliability)
1. **Fix `ProviderRouter`** to return providers without cloning `Box<dyn LlmProvider>`. Options:
   - Change router storage to `HashMap<ProviderType, Arc<dyn LlmProvider>>` and return `Arc<dyn LlmProvider>` from `get_provider`.
   - Or store factory closures/configs and re-instantiate on demand.
2. **Wire `ProviderRouter` into `AdvancedAgent`** instead of `build_provider`.
3. **Implement fallback logic** in `run_task_loop`: on provider failure, try `fallback_provider`.
4. **Implement cost tracking**: accumulate `estimate_cost` results into `AgentTask::current_cost`.
5. **Implement `max_steps` enforcement** and `max_retries` loop in `execute_step`.

### Phase 2 — Safety & UX (match legacy parity)
6. **Implement `SafetyLevel::Balanced`**:
   - Auto-approve `Wait` and small `Scroll` actions.
   - Auto-approve repeated actions that are `is_repeatable_safe`.
7. **Add GORKH tool routing** in `execute_pending` so the agent can read app state and install Free AI.
8. **Unify vision code**: replace inline `observe_screen` with `VisionEngine::observe_for_goal`.
9. **Add terminal execution timeout** in `workspace.rs` (use `tokio::time::timeout`).

### Phase 3 — Replanning & Resilience
10. **Implement replanning**: on `StepStatus::FailedRetryable`, call `planner.revise_plan()` and continue.
11. **Demonstration recording**: wire `DemonstrationRecorder` into `execute_step` to capture successful task traces.

### Phase 4 — TypeScript Workflow (optional, future)
12. **Decide fate of `packages/shared/src/agent/workflow.ts`**. Options:
    - Deprecate and remove (it is debug-only and has no consumers).
    - Or implement real phase executors backed by LLM calls via the Rust agent IPC surface.
    - Or repurpose as a server-side CI/CD agent workflow (API backend).

---

## 8. Cross-Reference Tables

### 8.1 Type Mapping: Rust ↔ TypeScript

| Rust (`agent/mod.rs` / `llm/mod.rs`) | TypeScript (`packages/shared/src/index.ts`) | Usage |
|--------------------------------------|---------------------------------------------|-------|
| `AgentProposal` (retail) | `AgentProposal` | Shared wire format |
| `InputAction` (retail) | `InputAction` | Shared wire format |
| `ToolCall` (retail) | `ToolCall` | Shared wire format |
| `AgentEvent` | `AgentEvent` (in `advancedAgent.ts`) | Tauri event stream |
| `AgentTask` | `AgentTask` (in `advancedAgent.ts`) | Tauri invoke response |
| `PlanStep` | — | Rust-only |
| `TaskPlan` | — | Rust-only |
| `ScreenObservation` | — | Rust-only |
| `ProviderType` | `ProviderType` (in `advancedAgent.ts`) | Settings mapping |
| `LlmErrorCode` | `LlmErrorCode` | Error codes kept in sync |

### 8.2 File-to-Concern Matrix

| Concern | Primary File | Secondary Files |
|---------|--------------|-----------------|
| Agent event loop | `agent/mod.rs` | `lib.rs:2219-2342` |
| Task planning | `agent/planner.rs` | `agent/mod.rs` (calls create_plan) |
| Desktop action execution | `agent/executor.rs` | `lib.rs` (input_* commands) |
| LLM provider trait | `agent/providers/mod.rs` | — |
| OpenAI provider | `agent/providers/openai.rs` | — |
| Claude provider | `agent/providers/claude.rs` | — |
| Local/Ollama provider | `agent/providers/native_ollama.rs` | `local_ai.rs` (binary management) |
| Local compat provider | `agent/providers/local_compat.rs` | — |
| Vision / screenshot | `agent/vision.rs` | `agent/mod.rs` (inline observe_screen) |
| Tool execution (workspace) | `workspace.rs` | `agent/mod.rs` (tool_execute_for_agent) |
| Approval state machine | `lib/approvals.ts` | `App.tsx` (bridging) |
| Engine abstraction | `lib/assistantEngine.ts` | `App.tsx` |
| IPC wrapper | `lib/advancedAgent.ts` | — |
| Debug workflow UI | `components/AgentWorkflow.tsx` | `components/agent/*.tsx` |
| Shared agent types | `packages/shared/src/agent/types.ts` | `packages/shared/src/index.ts` |
| Shared workflow engine | `packages/shared/src/agent/workflow.ts` | `AgentWorkflow.tsx` |

---

## 9. Appendix: Exact Stub Locations

For quick reference during implementation:

```
apps/desktop/src-tauri/src/agent/providers/mod.rs
  307-311    get_provider() -> always None
  327-331    route() -> NOT_IMPLEMENTED

packages/shared/src/agent/workflow.ts
  188        executeResearchPhase -> throw new Error('Not implemented')
  237        executeSpecifyPhase -> hardcoded minimal spec
  311        executePlanPhase -> throw new Error('Not implemented')
  389        executeWorkPhase -> throw new Error('Not implemented')
  424        executeReviewPhase -> throw new Error('Not implemented')

apps/desktop/src-tauri/src/agent/mod.rs
  ~1170      build_provider() ignores _router parameter
  ~1200      cost tracking not updated
  ~1250      max_retries not read
  ~1280      SafetyLevel::Balanced not implemented
```
