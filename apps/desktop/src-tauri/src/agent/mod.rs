//! Advanced Desktop Agent System (Iteration 31)
//!
//! Multi-provider agent with hierarchical planning, vision, and execution.

pub mod executor;
pub mod planner;
pub mod providers;
pub mod recorder;
pub mod vision;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

pub use executor::{ActionExecutor, ExecuteError};
pub use planner::{PlanStep, StepStatus, TaskPlan};
pub use providers::{ProviderCapabilities, ProviderRouter, ProviderType};
pub use vision::{ScreenObservation, VisionEngine, VisionError};

/// Safety level for the agent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SafetyLevel {
    /// Approve every privileged action
    Strict,
    /// Approve sensitive actions, allow low-risk verified repeated actions
    Balanced,
}

impl Default for SafetyLevel {
    fn default() -> Self {
        SafetyLevel::Strict
    }
}

/// Configuration for the advanced agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// Primary provider type
    pub primary_provider: ProviderType,
    /// Fallback provider (usually a paid API)
    pub fallback_provider: Option<ProviderType>,
    /// Safety level
    pub safety_level: SafetyLevel,
    /// Whether to ask before using paid providers
    pub ask_before_paid: bool,
    /// Cost limit per task in USD
    pub cost_limit_per_task: f64,
    /// Maximum steps per task
    pub max_steps: u32,
    /// Maximum retries per step
    pub max_retries: u32,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            primary_provider: ProviderType::NativeQwenOllama,
            fallback_provider: None,
            safety_level: SafetyLevel::Strict,
            ask_before_paid: true,
            cost_limit_per_task: 1.0,
            max_steps: 50,
            max_retries: 3,
        }
    }
}

/// Status of an agent task
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AgentTaskStatus {
    /// Planning the task
    Planning,
    /// Executing steps
    Executing { current_step: usize, total_steps: usize },
    /// Awaiting user approval for an action
    AwaitingApproval { step_id: String },
    /// Awaiting user response to a question
    AwaitingUserInput { question: String },
    /// Task completed successfully
    Completed,
    /// Task failed
    Failed { reason: String },
    /// Task was cancelled
    Cancelled,
}

/// A task being executed by the agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTask {
    pub task_id: String,
    pub goal: String,
    pub status: AgentTaskStatus,
    pub plan: Option<TaskPlan>,
    pub current_cost: f64,
    pub provider_used: Option<ProviderType>,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Event emitted during task execution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event_type", rename_all = "snake_case")]
pub enum AgentEvent {
    /// Task started
    TaskStarted { task_id: String, goal: String },
    /// Plan created
    PlanCreated { task_id: String, plan: TaskPlan },
    /// Step started
    StepStarted {
        task_id: String,
        step_number: usize,
        step: PlanStep,
    },
    /// Screen observed
    ScreenObserved {
        task_id: String,
        observation: ScreenObservation,
    },
    /// Action proposed
    ActionProposed {
        task_id: String,
        step_id: String,
        action_type: String,
        summary: String,
    },
    /// Action approved
    ActionApproved { task_id: String, step_id: String },
    /// Action denied
    ActionDenied { task_id: String, step_id: String, reason: String },
    /// Action executed
    ActionExecuted {
        task_id: String,
        step_id: String,
        success: bool,
        error: Option<String>,
    },
    /// Step completed
    StepCompleted { task_id: String, step_id: String },
    /// Step failed
    StepFailed {
        task_id: String,
        step_id: String,
        error: String,
        will_retry: bool,
    },
    /// Provider switched
    ProviderSwitched {
        task_id: String,
        from: ProviderType,
        to: ProviderType,
        reason: String,
    },
    /// Cost updated
    CostUpdated { task_id: String, total_cost: f64 },
    /// Task completed
    TaskCompleted { task_id: String, summary: String },
    /// Task failed
    TaskFailed { task_id: String, reason: String },
}

/// Current time in seconds
fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Provider error: {0}")]
    Provider(String),
    #[error("Planner error: {0}")]
    Planner(String),
    #[error("Vision error: {0}")]
    Vision(String),
    #[error("Execute error: {0}")]
    Execute(#[from] ExecuteError),
    #[error("Task not found: {0}")]
    TaskNotFound(String),
    #[error("Cancelled")]
    Cancelled,
}
