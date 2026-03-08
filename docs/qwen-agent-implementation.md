# Qwen Agent Implementation Details

## Project Structure

```
apps/desktop/src-tauri/src/
├── agent/                    # NEW: Autonomous agent module
│   ├── mod.rs               # Main agent controller
│   ├── vision.rs            # Screen analysis with Qwen
│   ├── planner.rs           # Task planning
│   ├── executor.rs          # Action execution
│   ├── memory.rs            # Context memory
│   ├── safety.rs            # Safety guardrails
│   └── omniparser.rs        # UI element detection
├── llm/                     # EXISTING: LLM integration
├── workspace.rs             # EXISTING: File operations
└── lib.rs                   # UPDATED: Add agent module
```

## 1. Agent Module (`agent/mod.rs`)

```rust
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

pub mod executor;
pub mod memory;
pub mod omniparser;
pub mod planner;
pub mod safety;
pub mod vision;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub llm_endpoint: String,
    pub model_name: String,
    pub max_iterations: u32,
    pub safety_level: SafetyLevel,
    pub enable_vision: bool,
    pub enable_omniparser: bool,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            llm_endpoint: "http://localhost:11434".to_string(),
            model_name: "qwen2.5-vl:7b".to_string(),
            max_iterations: 100,
            safety_level: SafetyLevel::Balanced,
            enable_vision: true,
            enable_omniparser: true,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum SafetyLevel {
    Strict,     // Approve every action
    Balanced,   // Approve sensitive actions
    Autonomous, // Learn from approvals
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub task_id: String,
    pub goal: String,
    pub context: Option<String>,
    pub max_duration_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Planning,
    Executing { current_step: usize, total_steps: usize },
    AwaitingApproval { action: Action },
    Paused,
    Completed { result: TaskResult },
    Failed { error: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    pub success: bool,
    pub actions_taken: Vec<ActionRecord>,
    pub final_screenshot: Option<String>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionRecord {
    pub step_number: usize,
    pub action: Action,
    pub timestamp: u64,
    pub screenshot_before: Option<String>,
    pub screenshot_after: Option<String>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "params")]
pub enum Action {
    Click { x: f64, y: f64, button: MouseButton },
    DoubleClick { x: f64, y: f64 },
    Type { text: String },
    Hotkey { keys: Vec<String> },
    Scroll { dx: i32, dy: i32 },
    Wait { seconds: f64 },
    FindAndClick { description: String },
    OpenApp { name: String },
    TakeScreenshot,
    // File operations
    ReadFile { path: String },
    WriteFile { path: String, content: String },
    ListDirectory { path: String },
    MoveFile { from: String, to: String },
    // App-specific
    ExecuteAppleScript { script: String },
    ExecutePowerShell { command: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

pub struct ComputerAgent {
    config: AgentConfig,
    vision: vision::VisionEngine,
    planner: planner::TaskPlanner,
    executor: executor::ActionExecutor,
    memory: Arc<Mutex<memory::AgentMemory>>,
    safety: safety::SafetyGuard,
    current_task: Arc<Mutex<Option<AgentTask>>>,
    task_status: Arc<Mutex<TaskStatus>>,
}

impl ComputerAgent {
    pub fn new(config: AgentConfig) -> Self {
        Self {
            vision: vision::VisionEngine::new(&config.llm_endpoint, &config.model_name),
            planner: planner::TaskPlanner::new(),
            executor: executor::ActionExecutor::new(),
            memory: Arc::new(Mutex::new(memory::AgentMemory::new())),
            safety: safety::SafetyGuard::new(config.safety_level),
            current_task: Arc::new(Mutex::new(None)),
            task_status: Arc::new(Mutex::new(TaskStatus::Paused)),
            config,
        }
    }

    pub async fn start_task(&self, task: AgentTask) -> Result<(), AgentError> {
        // Set current task
        *self.current_task.lock().await = Some(task.clone());
        *self.task_status.lock().await = TaskStatus::Planning;

        // Run task in background
        let agent = self.clone();
        tokio::spawn(async move {
            if let Err(e) = agent.run_task_loop(task).await {
                *agent.task_status.lock().await = TaskStatus::Failed {
                    error: e.to_string(),
                };
            }
        });

        Ok(())
    }

    async fn run_task_loop(&self, task: AgentTask) -> Result<TaskResult, AgentError> {
        // 1. Create plan
        let plan = self.planner.create_plan(&task.goal).await?;
        let total_steps = plan.steps.len();

        // 2. Execute each step
        let mut actions_taken = Vec::new();

        for (step_idx, step) in plan.steps.iter().enumerate() {
            // Update status
            *self.task_status.lock().await = TaskStatus::Executing {
                current_step: step_idx + 1,
                total_steps,
            };

            // Take screenshot before action
            let screenshot_before = self.executor.take_screenshot().await.ok();

            // Analyze current state
            let state = if self.config.enable_vision {
                let screenshot = self.executor.take_screenshot().await?;
                Some(self.vision.analyze_screen(&screenshot, &step.description).await?)
            } else {
                None
            };

            // Determine action
            let action = if let Some(ref state) = state {
                self.decide_action(state, step).await?
            } else {
                // Fallback: parse action from step description
                self.parse_action(&step.action_description).await?
            };

            // Safety check
            let approval_required = self.safety.requires_approval(&action);
            if approval_required {
                *self.task_status.lock().await = TaskStatus::AwaitingApproval {
                    action: action.clone(),
                };
                // Wait for approval via WebSocket
                self.wait_for_approval().await?;
            }

            // Execute action
            let result = self.executor.execute(action.clone()).await;

            // Take screenshot after
            let screenshot_after = self.executor.take_screenshot().await.ok();

            // Record action
            let record = ActionRecord {
                step_number: step_idx + 1,
                action,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                screenshot_before,
                screenshot_after,
                success: result.is_ok(),
                error: result.as_ref().err().map(|e| e.to_string()),
            };
            actions_taken.push(record);

            // Check for error
            if let Err(e) = result {
                // Try to recover
                if !self.try_recover(&e, step).await? {
                    return Ok(TaskResult {
                        success: false,
                        actions_taken,
                        final_screenshot: screenshot_after,
                        summary: format!("Failed at step {}: {}", step_idx + 1, e),
                    });
                }
            }

            // Verify step completion
            if step.verification_required {
                if !self.verify_step_completion(step).await? {
                    // Retry or skip
                }
            }
        }

        let final_screenshot = self.executor.take_screenshot().await.ok();

        Ok(TaskResult {
            success: true,
            actions_taken,
            final_screenshot,
            summary: format!("Completed task: {}", task.goal),
        })
    }

    async fn decide_action(
        &self,
        state: &vision::ScreenState,
        step: &planner::PlanStep,
    ) -> Result<Action, AgentError> {
        // Use LLM to decide next action based on current state
        // This is where Qwen2.5-VL shines
        todo!()
    }

    async fn parse_action(&self, description: &str) -> Result<Action, AgentError> {
        // Parse action from natural language description
        todo!()
    }

    async fn wait_for_approval(&self) -> Result<(), AgentError> {
        // Wait for user approval via WebSocket
        todo!()
    }

    async fn try_recover(&self, error: &AgentError, step: &planner::PlanStep) -> Result<bool, AgentError> {
        // Try to recover from error
        todo!()
    }

    async fn verify_step_completion(&self, step: &planner::PlanStep) -> Result<bool, AgentError> {
        // Verify that step was completed successfully
        todo!()
    }

    pub async fn get_status(&self) -> TaskStatus {
        self.task_status.lock().await.clone()
    }

    pub async fn approve_action(&self, approved: bool) -> Result<(), AgentError> {
        // Called from WebSocket handler when user approves/denies
        todo!()
    }

    pub async fn pause(&self) {
        *self.task_status.lock().await = TaskStatus::Paused;
    }

    pub async fn resume(&self) {
        // Resume from paused state
    }

    pub async fn stop(&self) {
        *self.task_status.lock().await = TaskStatus::Failed {
            error: "Stopped by user".to_string(),
        };
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Vision error: {0}")]
    Vision(String),
    #[error("Planning error: {0}")]
    Planning(String),
    #[error("Execution error: {0}")]
    Execution(String),
    #[error("Safety check failed: {0}")]
    Safety(String),
    #[error("LLM error: {0}")]
    Llm(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
