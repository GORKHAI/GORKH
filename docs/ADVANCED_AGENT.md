# Advanced Agent System (Iteration 31)

## Overview

The Advanced Agent System provides autonomous task execution with multi-provider LLM support, hierarchical planning, vision-based screen understanding, and training data recording for future fine-tuning.

## Architecture

### Backend (Rust)

#### Provider System

```
src/agent/
├── mod.rs           # Core types, Provider trait, error handling
├── providers/
│   ├── mod.rs       # Provider router with fallback logic
│   ├── ollama.rs    # Native Qwen2.5-VL via Ollama (free)
│   ├── openai.rs    # GPT-4o vision support (paid)
│   └── claude.rs    # Claude 3.5 Sonnet (paid)
├── vision.rs        # Screen analysis and UI element detection
├── planner.rs       # Hierarchical task planner & execution loop
└── recorder.rs      # Training data collection for fine-tuning
```

#### Provider Trait

```rust
#[async_trait]
pub trait Provider: Send + Sync {
    async fn plan_task(&self, goal: &str, context: &TaskContext) -> Result<TaskPlan, AgentError>;
    async fn analyze_screen(&self, screenshot_b64: &str, goal: &str) -> Result<ScreenObservation, AgentError>;
    async fn propose_next_step(&self, plan: &TaskPlan, observation: &ScreenObservation) -> Result<StepProposal, AgentError>;
    async fn summarize_result(&self, plan: &TaskPlan, results: &[StepResult]) -> Result<String, AgentError>;
}
```

#### Provider Routing

The system uses a priority-based provider selection:

1. **Primary**: Native Qwen (Ollama) - Free, runs locally on GPU
2. **Fallback**: User-selected paid provider (OpenAI/Claude) with cost warning

```rust
pub enum UsageMode {
    FreeOnly,                              // Never use paid providers
    AskBeforePaid,                         // Show cost warning before switching
    AllowPaidWithLimit(f64),              // Auto-switch with cost limit
}
```

#### Vision Engine

Uses direct model vision capabilities (Qwen2.5-VL) to analyze screens:

```rust
pub struct ScreenObservation {
    pub screen_summary: String,
    pub ui_elements: Vec<UiElement>,
    pub notable_warnings: Vec<String>,
    pub inferred_app: Option<String>,
    pub raw_screenshot_b64: String,  // Memory only, not persisted
}
```

#### Planner/Executor

The `AgentController` implements a state machine:

```
Understanding → Planning → Executing → Observing → Completing
                    ↑_________________________|
```

Supports:
- Retry logic with exponential backoff
- Provider fallback on repeated failures
- Integration with existing approval system

#### Safety Modes

- **Strict**: Approve all actions
- **Balanced**: Auto-approve low-risk actions, require approval for sensitive ones

#### Training Data Recorder

Records demonstrations for future fine-tuning with redaction:

```rust
pub struct DemonstrationStep {
    pub step_number: usize,
    pub screenshot_ref: String,        // Hash reference, not raw image
    pub action_summary: String,        // "click at (0.5, 0.5)"
    pub tool_call_summary: Option<String>,
    pub result_summary: String,        // success/fail, exit code
}
```

Output: JSONL files suitable for Qwen2.5-VL SFT/DPO training.

### Frontend (React)

#### Components

```
src/components/agent/
├── AgentProviderSelector.tsx   # Provider selection UI with test buttons
├── AgentTaskDialog.tsx         # Task creation with cost warnings
├── AgentTaskMonitor.tsx        # Real-time progress monitoring
└── index.ts                    # Component exports
```

#### Library

```typescript
// src/lib/advancedAgent.ts
export async function listProviders(): Promise<ProviderInfo[]>;
export async function testProvider(provider: ProviderType): Promise<boolean>;
export async function setProviderApiKey(provider: ProviderType, apiKey: string): Promise<void>;
export async function startAgentTask(goal: string, preferredProvider?: ProviderType): Promise<string>;
export async function getAgentTaskStatus(): Promise<AgentTask | null>;
export async function onAgentEvent(callback: (event: AgentEvent) => void): Promise<() => void>;
```

## Configuration

### Ollama Setup (Free Provider)

1. Install Ollama: https://ollama.com
2. Pull Qwen2.5-VL:
   ```bash
   ollama pull qwen2.5-vl:7b
   ```
3. Ensure Ollama is running on `http://127.0.0.1:11434`

### API Keys (Paid Providers)

Keys are securely stored in the OS keychain:

- OpenAI: `sk-...`
- Claude: Set via UI or keyring CLI

## Tauri Commands

| Command | Description |
|---------|-------------|
| `list_agent_providers` | List available providers with status |
| `test_provider` | Test provider connectivity |
| `set_provider_api_key` | Store API key in keychain |
| `has_provider_api_key` | Check if API key exists |
| `start_agent_task` | Begin autonomous task execution |
| `get_agent_task_status` | Get current task state |
| `cancel_agent_task` | Stop current task |

## Events

Frontend subscribes to `agent:event` for real-time updates:

```typescript
type AgentEvent =
  | { eventType: 'task_started'; taskId: string; goal: string }
  | { eventType: 'plan_created'; taskId: string; plan: TaskPlan }
  | { eventType: 'step_started'; taskId: string; stepNumber: number; step: PlanStep }
  | { eventType: 'action_proposed'; taskId: string; stepId: string; actionType: string; summary: string }
  | { eventType: 'action_approved'; taskId: string; stepId: string }
  | { eventType: 'step_completed'; taskId: string; stepId: string }
  | { eventType: 'provider_switched'; taskId: string; from: ProviderType; to: ProviderType; reason: string }
  | { eventType: 'cost_updated'; taskId: string; totalCost: number }
  | { eventType: 'task_completed'; taskId: string; summary: string }
  | { eventType: 'task_failed'; taskId: string; reason: string };
```

## Cost Estimation

```typescript
// GPT-4o: $5/M input, $15/M output
// Claude 3.5 Sonnet: $3/M input, $15/M output
// Local Qwen: Free

function estimateCost(provider, inputTokens, outputTokens): number
function formatCost(cost): string  // "Free" or "$0.005"
```

## Usage

### Starting a Task

```typescript
import { AgentTaskDialog } from './components/agent';

// In your component
<AgentTaskDialog trigger={<button>✨ Advanced Agent</button>} />
```

### Monitoring Progress

The `AgentTaskMonitor` component displays:
- Progress bar with step completion
- Individual step status (pending/running/completed/failed)
- Activity log with recent events
- Cost accumulator for paid providers
- Approval pending states

### Provider Selection

Users can select providers with visual indicators:
- Free badge for local providers
- Vision badge for vision-capable models
- Connection status indicator
- Test button for connectivity check
- API key input for paid providers

## Security

- API keys stored in OS keychain, never in plaintext
- Screenshots kept in memory only
- Training data excludes secrets, typed text, file contents
- All actions require approval (configurable)

## Future Enhancements

1. **OmniParser Integration**: Optional adapter for external UI parsing
2. **Fine-tuning Pipeline**: Scripts to train on recorded demonstrations
3. **Multi-step Learning**: Automatically improve from successful runs
4. **Provider Caching**: Cache successful plans for similar tasks
