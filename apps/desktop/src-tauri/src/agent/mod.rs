//! Advanced Desktop Agent System (Iteration 31)
//!
//! Multi-provider agent with hierarchical planning, vision, and execution.

pub mod executor;
pub mod planner;
pub mod providers;
#[allow(dead_code)]
pub mod recorder;
#[allow(dead_code)]
pub mod tools;
#[allow(dead_code)]
pub mod vision;

use crate::llm::{
    AgentProposal as RetailAgentProposal, InputAction as RetailInputAction,
    ToolCall as RetailToolCall,
};
use crate::llm;
use crate::workspace;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tokio::sync::{oneshot, Mutex, RwLock};

pub use executor::{ActionExecutor, ExecuteError};
pub use planner::{PlanStep, StepStatus, TaskPlan};
pub use providers::{ProviderRouter, ProviderType};
pub use vision::ScreenObservation;

/// Safety level for the agent
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum SafetyLevel {
    /// Approve every privileged action
    #[default]
    Strict,
    /// Approve sensitive actions, allow low-risk verified repeated actions
    Balanced,
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
    /// Optional provider endpoint override
    pub provider_base_url: Option<String>,
    /// Optional provider model override
    pub provider_model: Option<String>,
    /// Display used for screenshot observation and input execution
    pub display_id: String,
    /// Optional provider API key for cloud backends
    #[serde(skip_serializing, default)]
    pub provider_api_key: Option<String>,
    /// Optional explicit vision capability override for OpenAI-compatible runtimes
    pub provider_supports_vision: Option<bool>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            primary_provider: ProviderType::GorkhFree,
            fallback_provider: None,
            safety_level: SafetyLevel::Strict,
            ask_before_paid: true,
            cost_limit_per_task: 1.0,
            max_steps: 50,
            max_retries: 3,
            provider_base_url: None,
            provider_model: None,
            display_id: "display-0".to_string(),
            provider_api_key: None,
            provider_supports_vision: None,
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
    Executing {
        current_step: usize,
        total_steps: usize,
    },
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
    /// Proposal ready for retail approval or user response
    ProposalReady {
        task_id: String,
        step_id: String,
        proposal: RetailAgentProposal,
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
    ActionDenied {
        task_id: String,
        step_id: String,
        reason: String,
    },
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
    #[error("Vision error: {0}")]
    Vision(String),
    #[error("Execute error: {0}")]
    Execute(#[from] ExecuteError),
    #[error("Approval error: {0}")]
    Approval(String),
    #[error("Cancelled")]
    Cancelled,
    #[error("Cost limit exceeded: {0}")]
    CostLimitExceeded(String),
}

/// Heuristic check for retryable provider errors based on error codes in the message.
fn is_retryable_provider_error(message: &str) -> bool {
    message.contains("NETWORK_ERROR")
        || message.contains("RATE_LIMITED")
        || message.contains("API_ERROR")
        || message.contains("TIMEOUT")
}

/// Accumulate cost into the current task and emit a CostUpdated event.
async fn update_task_cost(
    current_task: &Arc<RwLock<Option<AgentTask>>>,
    callback: &AgentEventCallback,
    provider: &dyn providers::LlmProvider,
    input_tokens: usize,
    output_tokens: usize,
) {
    let cost = provider.estimate_cost(input_tokens, output_tokens);
    let mut guard = current_task.write().await;
    if let Some(task) = guard.as_mut() {
        task.current_cost += cost;
        let total = task.current_cost;
        let task_id = task.task_id.clone();
        drop(guard);
        (callback)(AgentEvent::CostUpdated {
            task_id,
            total_cost: total,
        });
    }
}

/// Check whether the next LLM call would exceed the cost limit.
/// Uses a conservative $0.01 estimate per call when exact token counts are unknown.
async fn check_cost_limit(
    current_task: &Arc<RwLock<Option<AgentTask>>>,
    config: &AgentConfig,
) -> Result<(), AgentError> {
    const ESTIMATED_CALL_COST: f64 = 0.01;
    let guard = current_task.read().await;
    if let Some(task) = guard.as_ref() {
        if task.current_cost + ESTIMATED_CALL_COST > config.cost_limit_per_task {
            return Err(AgentError::CostLimitExceeded(format!(
                "Estimated cost {:.4} exceeds limit {:.2}",
                task.current_cost + ESTIMATED_CALL_COST,
                config.cost_limit_per_task
            )));
        }
    }
    Ok(())
}

type AgentEventCallback = Arc<dyn Fn(AgentEvent) + Send + Sync + 'static>;

enum ApprovalDecision {
    Approved,
    Denied(String),
}

enum PendingInteraction {
    Approval {
        sender: oneshot::Sender<ApprovalDecision>,
    },
    UserInput {
        sender: oneshot::Sender<String>,
    },
}

enum PendingExecution {
    Action(executor::Action),
    Tool(RetailToolCall),
}

enum StepOutcome {
    Completed { summary: String },
    Done { summary: String },
}

enum NextOperation {
    AutoAction {
        action: executor::Action,
        summary: String,
    },
    Approval {
        proposal: RetailAgentProposal,
        execution: PendingExecution,
    },
    AskUser {
        question: String,
    },
    Done {
        summary: String,
    },
}

#[derive(Debug, Deserialize)]
struct RawProposalEnvelope {
    action_type: String,
    #[serde(default)]
    params: Value,
    #[serde(default)]
    rationale: String,
    confidence: Option<f64>,
    question: Option<String>,
    summary: Option<String>,
    tool: Option<String>,
}

/// Concrete agent runtime used by the desktop command layer.
///
/// This implementation runs a real planning / observation / approval /
/// execution loop while still keeping approvals local and reusing the
/// existing workspace and input primitives.
pub struct AdvancedAgent {
    config: AgentConfig,
    router: Arc<ProviderRouter>,
    callback: AgentEventCallback,
    current_task: Arc<RwLock<Option<AgentTask>>>,
    pending: Arc<Mutex<Option<PendingInteraction>>>,
    cancelled: Arc<AtomicBool>,
}

impl AdvancedAgent {
    pub fn new(
        config: AgentConfig,
        router: Arc<ProviderRouter>,
        callback: Box<dyn Fn(AgentEvent) + Send + Sync + 'static>,
    ) -> Self {
        Self {
            config,
            router,
            callback: Arc::from(callback),
            current_task: Arc::new(RwLock::new(None)),
            pending: Arc::new(Mutex::new(None)),
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn start_task(&self, goal: String) -> Result<String, AgentError> {
        let task_id = uuid::Uuid::new_v4().to_string();
        let created_at = now();
        self.cancelled.store(false, Ordering::SeqCst);

        {
            let mut guard = self.current_task.write().await;
            *guard = Some(AgentTask {
                task_id: task_id.clone(),
                goal: goal.clone(),
                status: AgentTaskStatus::Planning,
                plan: None,
                current_cost: 0.0,
                provider_used: Some(self.config.primary_provider),
                created_at,
                updated_at: created_at,
            });
        }

        let callback = self.callback.clone();
        let current_task = self.current_task.clone();
        let pending = self.pending.clone();
        let cancelled = self.cancelled.clone();
        let config = self.config.clone();
        let task_id_for_runtime = task_id.clone();
        let goal_for_runtime = goal.clone();

        let router = self.router.clone();

        tokio::spawn(async move {
            (callback)(AgentEvent::TaskStarted {
                task_id: task_id_for_runtime.clone(),
                goal: goal_for_runtime.clone(),
            });

            let result = run_task_loop(
                task_id_for_runtime.clone(),
                goal_for_runtime,
                config,
                router,
                callback.clone(),
                current_task.clone(),
                pending.clone(),
                cancelled.clone(),
            )
            .await;

            if let Err(error) = result {
                let reason = error.to_string();
                {
                    let mut guard = current_task.write().await;
                    if let Some(task) = guard.as_mut() {
                        task.status = if cancelled.load(Ordering::SeqCst) {
                            AgentTaskStatus::Cancelled
                        } else {
                            AgentTaskStatus::Failed {
                                reason: reason.clone(),
                            }
                        };
                        task.updated_at = now();
                    }
                }

                if !cancelled.load(Ordering::SeqCst) {
                    (callback)(AgentEvent::TaskFailed {
                        task_id: task_id_for_runtime,
                        reason,
                    });
                }
            }
        });

        Ok(task_id)
    }

    pub async fn get_current_task(&self) -> Option<AgentTask> {
        self.current_task.read().await.clone()
    }

    pub async fn approve_proposal(&self) -> Result<(), AgentError> {
        let mut guard = self.pending.lock().await;
        match guard.take() {
            Some(PendingInteraction::Approval { sender, .. }) => sender
                .send(ApprovalDecision::Approved)
                .map_err(|_| AgentError::Approval("Approval receiver dropped".to_string())),
            Some(other) => {
                *guard = Some(other);
                Err(AgentError::Approval(
                    "No pending approval is waiting for approval".to_string(),
                ))
            }
            None => Err(AgentError::Approval(
                "No pending approval is waiting for approval".to_string(),
            )),
        }
    }

    pub async fn deny_proposal(&self, reason: Option<String>) -> Result<(), AgentError> {
        let mut guard = self.pending.lock().await;
        match guard.take() {
            Some(PendingInteraction::Approval { sender, .. }) => sender
                .send(ApprovalDecision::Denied(
                    reason.unwrap_or_else(|| "User denied the proposal".to_string()),
                ))
                .map_err(|_| AgentError::Approval("Approval receiver dropped".to_string())),
            Some(other) => {
                *guard = Some(other);
                Err(AgentError::Approval(
                    "No pending approval is waiting for denial".to_string(),
                ))
            }
            None => Err(AgentError::Approval(
                "No pending approval is waiting for denial".to_string(),
            )),
        }
    }

    pub async fn submit_user_response(&self, response: String) -> Result<(), AgentError> {
        let mut guard = self.pending.lock().await;
        match guard.take() {
            Some(PendingInteraction::UserInput { sender, .. }) => sender
                .send(response)
                .map_err(|_| AgentError::Approval("User-response receiver dropped".to_string())),
            Some(other) => {
                *guard = Some(other);
                Err(AgentError::Approval(
                    "No pending question is waiting for a user response".to_string(),
                ))
            }
            None => Err(AgentError::Approval(
                "No pending question is waiting for a user response".to_string(),
            )),
        }
    }

    pub async fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);

        let mut pending = self.pending.lock().await;
        if let Some(interaction) = pending.take() {
            match interaction {
                PendingInteraction::Approval { sender, .. } => {
                    let _ = sender.send(ApprovalDecision::Denied("Task cancelled".to_string()));
                }
                PendingInteraction::UserInput { sender, .. } => {
                    let _ = sender.send(String::new());
                }
            }
        }

        let mut guard = self.current_task.write().await;
        if let Some(task) = guard.as_mut() {
            task.status = AgentTaskStatus::Cancelled;
            task.updated_at = now();
        }
    }
}

async fn run_task_loop(
    task_id: String,
    goal: String,
    config: AgentConfig,
    router: Arc<ProviderRouter>,
    callback: AgentEventCallback,
    current_task: Arc<RwLock<Option<AgentTask>>>,
    pending: Arc<Mutex<Option<PendingInteraction>>>,
    cancelled: Arc<AtomicBool>,
) -> Result<(), AgentError> {
    // Use the router instead of build_provider so fallback logic is live.
    let provider = router
        .route(Some(config.primary_provider))
        .await
        .map_err(|e| AgentError::Provider(e.message))?;
    let planner = planner::HierarchicalPlanner::new(provider.as_ref());

    let mut plan = match planner.create_plan(&goal).await {
        Ok((plan, input_tokens, output_tokens)) if !plan.steps.is_empty() => {
            update_task_cost(&current_task, &callback, provider.as_ref(), input_tokens, output_tokens).await;
            plan
        }
        Ok((_, input_tokens, output_tokens)) => {
            update_task_cost(&current_task, &callback, provider.as_ref(), input_tokens, output_tokens).await;
            planner::create_simple_plan(&goal)
        }
        Err(_) => planner::create_simple_plan(&goal),
    };

    if plan.steps.len() > config.max_steps as usize {
        plan.steps.truncate(config.max_steps as usize);
    }

    {
        let mut guard = current_task.write().await;
        if let Some(task) = guard.as_mut() {
            task.plan = Some(plan.clone());
            task.updated_at = now();
        }
    }

    (callback)(AgentEvent::PlanCreated {
        task_id: task_id.clone(),
        plan: plan.clone(),
    });

    let executor = ActionExecutor::new(config.display_id.clone());
    let mut previous_actions: Vec<String> = Vec::new();
    let mut completed_steps: Vec<String> = Vec::new();
    let total_steps = plan.steps.len();
    let mut step_count: u32 = 0;
    let mut current_provider = provider;

    for (index, step) in plan.steps.clone().into_iter().enumerate() {
        step_count += 1;
        if step_count > config.max_steps {
            let msg = format!("Task did not complete in {} steps", config.max_steps);
            {
                let mut guard = current_task.write().await;
                if let Some(task) = guard.as_mut() {
                    task.status = AgentTaskStatus::Failed {
                        reason: msg.clone(),
                    };
                    task.updated_at = now();
                }
            }
            (callback)(AgentEvent::TaskFailed {
                task_id: task_id.clone(),
                reason: msg.clone(),
            });
            return Err(AgentError::Provider(msg));
        }

        if cancelled.load(Ordering::SeqCst) {
            return Err(AgentError::Cancelled);
        }

        update_task_for_step(&current_task, &step.id, StepStatus::Running).await;
        {
            let mut guard = current_task.write().await;
            if let Some(task) = guard.as_mut() {
                task.status = AgentTaskStatus::Executing {
                    current_step: index + 1,
                    total_steps,
                };
                task.updated_at = now();
            }
        }

        (callback)(AgentEvent::StepStarted {
            task_id: task_id.clone(),
            step_number: index + 1,
            step: step.clone(),
        });

        // Execute step with fallback logic on retryable provider errors.
        let outcome = match execute_step(
            &task_id,
            &goal,
            &step,
            current_provider.as_ref(),
            &executor,
            callback.clone(),
            current_task.clone(),
            pending.clone(),
            cancelled.clone(),
            &previous_actions,
            &config,
        )
        .await
        {
            Ok(outcome) => outcome,
            Err(AgentError::Provider(ref msg)) if is_retryable_provider_error(msg) => {
                if let Some(fallback_type) = config.fallback_provider {
                    if let Ok(fallback) = router.route(Some(fallback_type)).await {
                        (callback)(AgentEvent::ProviderSwitched {
                            task_id: task_id.clone(),
                            from: config.primary_provider,
                            to: fallback_type,
                            reason: format!("Primary provider failed: {}", msg),
                        });
                        current_provider = fallback;
                        // Retry the step with the fallback provider.
                        execute_step(
                            &task_id,
                            &goal,
                            &step,
                            current_provider.as_ref(),
                            &executor,
                            callback.clone(),
                            current_task.clone(),
                            pending.clone(),
                            cancelled.clone(),
                            &previous_actions,
                            &config,
                        )
                        .await?
                    } else {
                        return Err(AgentError::Provider(format!(
                            "Primary provider failed and no fallback available: {}",
                            msg
                        )));
                    }
                } else {
                    return Err(AgentError::Provider(format!(
                        "Primary provider failed and no fallback configured: {}",
                        msg
                    )));
                }
            }
            Err(e) => return Err(e),
        };

        match outcome {
            StepOutcome::Completed { summary } => {
                completed_steps.push(summary.clone());
                previous_actions.push(format!("Completed step {}", step.title));
                update_task_for_step(&current_task, &step.id, StepStatus::Completed).await;
                (callback)(AgentEvent::StepCompleted {
                    task_id: task_id.clone(),
                    step_id: step.id.clone(),
                });
            }
            StepOutcome::Done { summary } => {
                update_task_for_step(&current_task, &step.id, StepStatus::Completed).await;
                (callback)(AgentEvent::StepCompleted {
                    task_id: task_id.clone(),
                    step_id: step.id.clone(),
                });
                return complete_task(
                    &task_id,
                    &summary,
                    current_provider.as_ref(),
                    callback,
                    current_task,
                )
                .await;
            }
        }
    }

    let fallback_summary = if completed_steps.is_empty() {
        "Task completed.".to_string()
    } else {
        completed_steps.join("\n")
    };

    complete_task(
        &task_id,
        &fallback_summary,
        current_provider.as_ref(),
        callback,
        current_task,
    )
    .await
}

async fn complete_task(
    task_id: &str,
    raw_summary: &str,
    provider: &dyn providers::LlmProvider,
    callback: AgentEventCallback,
    current_task: Arc<RwLock<Option<AgentTask>>>,
) -> Result<(), AgentError> {
    let result = provider
        .summarize_result(raw_summary)
        .await
        .unwrap_or_else(|_| providers::LlmResult {
            content: raw_summary.to_string(),
            input_tokens: 0,
            output_tokens: 0,
        });
    update_task_cost(&current_task, &callback, provider, result.input_tokens, result.output_tokens).await;
    let summary = result.content;

    {
        let mut guard = current_task.write().await;
        if let Some(task) = guard.as_mut() {
            task.status = AgentTaskStatus::Completed;
            task.updated_at = now();
        }
    }

    (callback)(AgentEvent::TaskCompleted {
        task_id: task_id.to_string(),
        summary,
    });

    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn execute_step(
    task_id: &str,
    goal: &str,
    step: &PlanStep,
    provider: &dyn providers::LlmProvider,
    executor: &ActionExecutor,
    callback: AgentEventCallback,
    current_task: Arc<RwLock<Option<AgentTask>>>,
    pending: Arc<Mutex<Option<PendingInteraction>>>,
    cancelled: Arc<AtomicBool>,
    previous_actions: &[String],
    config: &AgentConfig,
) -> Result<StepOutcome, AgentError> {
    if matches!(step.step_type, planner::StepType::AskUser) {
        let _ = request_user_input(
            task_id,
            &step.id,
            step.description.clone(),
            callback,
            current_task,
            pending,
            cancelled,
        )
        .await?;

        return Ok(StepOutcome::Completed {
            summary: format!("Collected clarification for {}", step.title),
        });
    }

    let needs_vision = task_needs_vision(goal, step);
    let observation = if needs_vision {
        if !provider.capabilities().supports_vision {
            return Err(AgentError::Vision(
                "This task needs a vision-capable provider (OpenAI, Claude, or GORKH Free)."
                    .to_string(),
            ));
        }

        let observation = observe_screen(provider, goal, previous_actions, config, &current_task, &callback).await?;
        (callback)(AgentEvent::ScreenObserved {
            task_id: task_id.to_string(),
            observation: observation.clone(),
        });
        observation
    } else {
        ScreenObservation::empty()
    };

    let operation = propose_next_operation(provider, goal, step, &observation, &current_task, &callback, config).await?;

    match operation {
        NextOperation::AutoAction { action, summary } => {
            let result = executor.execute(action).await?;
            match result {
                executor::ActionResult::Success => {
                    (callback)(AgentEvent::ActionExecuted {
                        task_id: task_id.to_string(),
                        step_id: step.id.clone(),
                        success: true,
                        error: None,
                    });
                    Ok(StepOutcome::Completed { summary })
                }
                executor::ActionResult::Failed { reason } => Err(AgentError::Approval(reason)),
                executor::ActionResult::NeedsUserInput { question } => {
                    let _ = request_user_input(
                        task_id,
                        &step.id,
                        question,
                        callback,
                        current_task,
                        pending,
                        cancelled,
                    )
                    .await?;
                    Ok(StepOutcome::Completed {
                        summary: format!("Resolved follow-up for {}", step.title),
                    })
                }
            }
        }
        NextOperation::Approval {
            proposal,
            execution,
        } => {
            let (action_type, summary) = proposal_metadata(&proposal);
            (callback)(AgentEvent::ActionProposed {
                task_id: task_id.to_string(),
                step_id: step.id.clone(),
                action_type,
                summary: summary.clone(),
            });

            match request_approval(
                task_id,
                &step.id,
                proposal.clone(),
                callback.clone(),
                current_task,
                pending,
                cancelled,
            )
            .await?
            {
                ApprovalDecision::Approved => {
                    (callback)(AgentEvent::ActionApproved {
                        task_id: task_id.to_string(),
                        step_id: step.id.clone(),
                    });

                    let execution_result = execute_pending(execution, executor).await;
                    match execution_result {
                        Ok(_) => {
                            (callback)(AgentEvent::ActionExecuted {
                                task_id: task_id.to_string(),
                                step_id: step.id.clone(),
                                success: true,
                                error: None,
                            });
                            Ok(StepOutcome::Completed { summary })
                        }
                        Err(error) => {
                            (callback)(AgentEvent::ActionExecuted {
                                task_id: task_id.to_string(),
                                step_id: step.id.clone(),
                                success: false,
                                error: Some(error.to_string()),
                            });
                            (callback)(AgentEvent::StepFailed {
                                task_id: task_id.to_string(),
                                step_id: step.id.clone(),
                                error: error.to_string(),
                                will_retry: false,
                            });
                            Err(error)
                        }
                    }
                }
                ApprovalDecision::Denied(reason) => {
                    (callback)(AgentEvent::ActionDenied {
                        task_id: task_id.to_string(),
                        step_id: step.id.clone(),
                        reason: reason.clone(),
                    });
                    Err(AgentError::Approval(reason))
                }
            }
        }
        NextOperation::AskUser { question } => {
            let _ = request_user_input(
                task_id,
                &step.id,
                question,
                callback,
                current_task,
                pending,
                cancelled,
            )
            .await?;

            Ok(StepOutcome::Completed {
                summary: format!("Collected clarification for {}", step.title),
            })
        }
        NextOperation::Done { summary } => Ok(StepOutcome::Done { summary }),
    }
}

async fn request_approval(
    task_id: &str,
    step_id: &str,
    proposal: RetailAgentProposal,
    callback: AgentEventCallback,
    current_task: Arc<RwLock<Option<AgentTask>>>,
    pending: Arc<Mutex<Option<PendingInteraction>>>,
    cancelled: Arc<AtomicBool>,
) -> Result<ApprovalDecision, AgentError> {
    let (sender, receiver) = oneshot::channel();

    {
        let mut guard = pending.lock().await;
        *guard = Some(PendingInteraction::Approval { sender });
    }

    {
        let mut guard = current_task.write().await;
        if let Some(task) = guard.as_mut() {
            task.status = AgentTaskStatus::AwaitingApproval {
                step_id: step_id.to_string(),
            };
            task.updated_at = now();
        }
    }

    (callback)(AgentEvent::ProposalReady {
        task_id: task_id.to_string(),
        step_id: step_id.to_string(),
        proposal,
    });

    let decision = receiver.await.map_err(|_| AgentError::Cancelled)?;
    if cancelled.load(Ordering::SeqCst) {
        return Err(AgentError::Cancelled);
    }

    Ok(decision)
}

async fn request_user_input(
    task_id: &str,
    step_id: &str,
    question: String,
    callback: AgentEventCallback,
    current_task: Arc<RwLock<Option<AgentTask>>>,
    pending: Arc<Mutex<Option<PendingInteraction>>>,
    cancelled: Arc<AtomicBool>,
) -> Result<String, AgentError> {
    let (sender, receiver) = oneshot::channel();

    {
        let mut guard = pending.lock().await;
        *guard = Some(PendingInteraction::UserInput { sender });
    }

    {
        let mut guard = current_task.write().await;
        if let Some(task) = guard.as_mut() {
            task.status = AgentTaskStatus::AwaitingUserInput {
                question: question.clone(),
            };
            task.updated_at = now();
        }
    }

    (callback)(AgentEvent::ProposalReady {
        task_id: task_id.to_string(),
        step_id: step_id.to_string(),
        proposal: RetailAgentProposal::AskUser { question },
    });

    let response = receiver.await.map_err(|_| AgentError::Cancelled)?;
    if cancelled.load(Ordering::SeqCst) {
        return Err(AgentError::Cancelled);
    }

    Ok(response)
}

async fn observe_screen(
    provider: &dyn providers::LlmProvider,
    goal: &str,
    previous_actions: &[String],
    config: &AgentConfig,
    current_task: &Arc<RwLock<Option<AgentTask>>>,
    callback: &AgentEventCallback,
) -> Result<ScreenObservation, AgentError> {
    check_cost_limit(current_task, config).await?;

    let capture = crate::capture_display_png(config.display_id.clone(), Some(1280))
        .map_err(|error| AgentError::Vision(error.message))?;

    let mut last_error = None;
    for attempt in 0..=config.max_retries {
        match provider
            .analyze_screen(providers::ScreenAnalysisRequest {
                screenshot_base64: capture.png_base64.clone(),
                goal: goal.to_string(),
                previous_actions: previous_actions.to_vec(),
            })
            .await
        {
            Ok(result) => {
                update_task_cost(
                    current_task,
                    callback,
                    provider,
                    result.input_tokens,
                    result.output_tokens,
                )
                .await;
                return serde_json::from_str::<ScreenObservation>(&result.content).or_else(|_| {
                    Ok(ScreenObservation {
                        screen_summary: result.content,
                        ui_elements: vec![],
                        notable_warnings: vec![],
                        inferred_app: None,
                    })
                });
            }
            Err(e) if attempt < config.max_retries && e.is_retryable => {
                last_error = Some(e);
                update_task_for_step(current_task, "observe", StepStatus::FailedRetryable).await;
                continue;
            }
            Err(e) => return Err(AgentError::Vision(e.message)),
        }
    }

    Err(AgentError::Vision(
        last_error.map(|e| e.message).unwrap_or_else(|| "Vision analysis failed".to_string()),
    ))
}

fn task_needs_vision(goal: &str, step: &PlanStep) -> bool {
    let combined = format!("{} {}", goal, step.description).to_ascii_lowercase();
    [
        "photoshop",
        "blender",
        "figma",
        "screenshot",
        "screen",
        "window",
        "menu",
        "button",
        "dialog",
        "canvas",
        "ui",
        "gui",
        "image",
        "picture",
        "background",
        "click",
        "look at",
    ]
    .iter()
    .any(|pattern| combined.contains(pattern))
}

async fn propose_next_operation(
    provider: &dyn providers::LlmProvider,
    goal: &str,
    step: &PlanStep,
    observation: &ScreenObservation,
    current_task: &Arc<RwLock<Option<AgentTask>>>,
    callback: &AgentEventCallback,
    config: &AgentConfig,
) -> Result<NextOperation, AgentError> {
    check_cost_limit(current_task, config).await?;

    let mut last_error = None;
    for attempt in 0..=config.max_retries {
        match provider
            .propose_next_step(providers::ActionRequest {
                observation: serde_json::to_string(observation)
                    .unwrap_or_else(|_| observation.screen_summary.clone()),
                goal: goal.to_string(),
                step_description: step.description.clone(),
            })
            .await
        {
            Ok(result) => {
                update_task_cost(
                    current_task,
                    callback,
                    provider,
                    result.input_tokens,
                    result.output_tokens,
                )
                .await;
                return parse_next_operation(&result.content);
            }
            Err(e) if attempt < config.max_retries && e.is_retryable => {
                last_error = Some(e);
                update_task_for_step(current_task, &step.id, StepStatus::FailedRetryable).await;
                continue;
            }
            Err(e) => return Err(AgentError::Provider(e.message)),
        }
    }

    Err(AgentError::Provider(
        last_error.map(|e| e.message).unwrap_or_else(|| "Propose next step failed".to_string()),
    ))
}

async fn execute_pending(
    execution: PendingExecution,
    executor: &ActionExecutor,
) -> Result<String, AgentError> {
    match execution {
        PendingExecution::Action(action) => {
            let summary = action.summary();
            match executor.execute(action).await? {
                executor::ActionResult::Success => Ok(summary),
                executor::ActionResult::Failed { reason } => Err(AgentError::Approval(reason)),
                executor::ActionResult::NeedsUserInput { question } => {
                    Err(AgentError::Approval(question))
                }
            }
        }
        PendingExecution::Tool(tool_call) => {
            // Route workspace tools through workspace module, GORKH tools through tools module.
            match &tool_call {
                RetailToolCall::EmptyTrash
                | RetailToolCall::GetClipboard
                | RetailToolCall::SetClipboard { .. }
                | RetailToolCall::MoveFiles { .. }
                | RetailToolCall::AppGetState => {
                    let result = tools::execute_gorkh_tool(&tool_call);
                    if result.success {
                        Ok(result.message)
                    } else {
                        Err(AgentError::Approval(result.message))
                    }
                }
                _ => {
                    let ws_tool = retail_tool_to_workspace(&tool_call);
                    workspace::tool_execute_for_agent(ws_tool).map_err(AgentError::Approval)
                }
            }
        }
    }
}

fn build_provider(config: &AgentConfig) -> Result<Box<dyn providers::LlmProvider>, AgentError> {
    match config.primary_provider {
        ProviderType::OpenAi => Ok(Box::new(providers::OpenAiProvider::new(
            config.provider_api_key.clone().ok_or_else(|| {
                AgentError::Provider("OpenAI-compatible provider is missing an API key".to_string())
            })?,
            config.provider_base_url.clone(),
            config.provider_model.clone(),
        ))),
        ProviderType::Claude => Ok(Box::new(providers::ClaudeProvider::new(
            config.provider_api_key.clone().ok_or_else(|| {
                AgentError::Provider("Claude provider is missing an API key".to_string())
            })?,
            config.provider_model.clone(),
        ))),
        ProviderType::DeepSeek => Ok(Box::new(providers::DeepSeekProvider::new(
            config.provider_api_key.clone().ok_or_else(|| {
                AgentError::Provider("DeepSeek provider is missing an API key".to_string())
            })?,
            config.provider_base_url.clone(),
            config.provider_model.clone(),
        ))),
        ProviderType::Moonshot => Ok(Box::new(providers::MoonshotProvider::new(
            config.provider_api_key.clone().ok_or_else(|| {
                AgentError::Provider("Moonshot provider is missing an API key".to_string())
            })?,
            config.provider_base_url.clone(),
            config.provider_model.clone(),
        ))),
        ProviderType::GorkhFree => Ok(Box::new(providers::GorkhFreeProvider::new(
            config.provider_base_url.clone().unwrap_or_else(|| "http://localhost:3001".to_string()),
            config.provider_api_key.clone().unwrap_or_default(),
        ))),
    }
}

fn proposal_metadata(proposal: &RetailAgentProposal) -> (String, String) {
    match proposal {
        RetailAgentProposal::ProposeAction { action, .. } => {
            ("ui_action".to_string(), summarize_retail_action(action))
        }
        RetailAgentProposal::ProposeTool { tool_call, .. } => {
            ("tool".to_string(), summarize_retail_tool(tool_call))
        }
        RetailAgentProposal::AskUser { question } => (
            "ask_user".to_string(),
            format!("Question for user: {}", question),
        ),
        RetailAgentProposal::Done { summary } => ("done".to_string(), summary.clone()),
    }
}

fn summarize_retail_action(action: &RetailInputAction) -> String {
    match action {
        RetailInputAction::Click { x, y, button } => {
            format!("Click {} at ({:.2}, {:.2})", button, x, y)
        }
        RetailInputAction::DoubleClick { x, y, button } => {
            format!("Double-click {} at ({:.2}, {:.2})", button, x, y)
        }
        RetailInputAction::Scroll { dx, dy } => format!("Scroll dx={}, dy={}", dx, dy),
        RetailInputAction::Type { text } => format!("Type {} chars", text.len()),
        RetailInputAction::Hotkey { key, modifiers } => match modifiers {
            Some(mods) if !mods.is_empty() => format!("Press {}+{}", mods.join("+"), key),
            _ => format!("Press {}", key),
        },
        RetailInputAction::OpenApp { app_name } => format!("Open app: {}", app_name),
    }
}

fn summarize_retail_tool(tool_call: &RetailToolCall) -> String {
    match tool_call {
        RetailToolCall::FsList { path } => format!("List files in {}", path),
        RetailToolCall::FsReadText { path } => format!("Read {}", path),
        RetailToolCall::FsWriteText { path, .. } => format!("Write {}", path),
        RetailToolCall::FsApplyPatch { path, .. } => format!("Patch {}", path),
        RetailToolCall::FsDelete { path, .. } => format!("Delete {}", path),
        RetailToolCall::TerminalExec { .. } => {
            "Run a terminal command in the workspace".to_string()
        }
        RetailToolCall::AppGetState => "Read GORKH app state".to_string(),
        RetailToolCall::SettingsSet { key, .. } => format!("Update GORKH setting: {}", key),
        RetailToolCall::FreeAiInstall { tier } => {
            format!("Start Free AI installation (tier: {})", tier)
        }
        RetailToolCall::EmptyTrash => "Empty the system Trash".to_string(),
        RetailToolCall::GetClipboard => "Read clipboard contents".to_string(),
        RetailToolCall::SetClipboard { .. } => "Write to clipboard".to_string(),
        RetailToolCall::MoveFiles { paths, destination } => {
            format!("Move {} file(s) to {}", paths.len(), destination)
        }
    }
}

fn parse_next_operation(input: &str) -> Result<NextOperation, AgentError> {
    let proposal = match llm::parse_json_response::<RawProposalEnvelope>(input, "proposed step") {
        Ok(p) => p,
        Err(_) => {
            // Fallback: small models sometimes confuse the step format with the system-prompt AgentProposal format
            let agent_proposal = llm::parse_json_response::<llm::AgentProposal>(input, "proposed step fallback")
                .map_err(|error| AgentError::Provider(format!("Failed to parse proposed step: {}", error.message)))?;
            return agent_proposal_to_next_operation(&agent_proposal);
        }
    };

    match proposal.action_type.as_str() {
        "click" => {
            let action = RetailInputAction::Click {
                x: read_f64(&proposal.params, "x")?,
                y: read_f64(&proposal.params, "y")?,
                button: read_optional_string(&proposal.params, "button")
                    .unwrap_or_else(|| "left".to_string()),
            };
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(&action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "double_click" => {
            let action = RetailInputAction::DoubleClick {
                x: read_f64(&proposal.params, "x")?,
                y: read_f64(&proposal.params, "y")?,
                button: read_optional_string(&proposal.params, "button")
                    .unwrap_or_else(|| "left".to_string()),
            };
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(&action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "scroll" => {
            let action = RetailInputAction::Scroll {
                dx: read_i32(&proposal.params, "dx")?,
                dy: read_i32(&proposal.params, "dy")?,
            };
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(&action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "type" => {
            let action = RetailInputAction::Type {
                text: read_string(&proposal.params, "text")?,
            };
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(&action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "hotkey" => {
            let action = RetailInputAction::Hotkey {
                key: read_string(&proposal.params, "key")?,
                modifiers: read_string_vec(&proposal.params, "modifiers"),
            };
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(&action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "open_app" => {
            let app_name = read_optional_string(&proposal.params, "app_name")
                .or_else(|| read_optional_string(&proposal.params, "appName"))
                .ok_or_else(|| AgentError::Provider("Missing string field 'app_name'".to_string()))?;
            let action = RetailInputAction::OpenApp {
                app_name: app_name.clone(),
            };
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(&action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "wait" => Ok(NextOperation::AutoAction {
            summary: format!(
                "Wait {}ms",
                read_optional_u64(&proposal.params, "duration_ms")
                    .or_else(|| read_optional_u64(&proposal.params, "durationMs"))
                    .unwrap_or(750)
            ),
            action: executor::Action::Wait {
                duration_ms: read_optional_u64(&proposal.params, "duration_ms")
                    .or_else(|| read_optional_u64(&proposal.params, "durationMs"))
                    .unwrap_or(750),
            },
        }),
        "tool" => {
            let tool_call = parse_tool_call(&proposal)?;
            Ok(NextOperation::Approval {
                execution: PendingExecution::Tool(tool_call.clone()),
                proposal: RetailAgentProposal::ProposeTool {
                    tool_call,
                    rationale: proposal.rationale,
                    confidence: proposal.confidence,
                },
            })
        }
        "ask_user" => Ok(NextOperation::AskUser {
            question: proposal.question.unwrap_or_else(|| {
                "The assistant needs clarification before continuing.".to_string()
            }),
        }),
        "done" => Ok(NextOperation::Done {
            summary: proposal
                .summary
                .unwrap_or_else(|| "Task completed.".to_string()),
        }),
        other => Err(AgentError::Provider(format!(
            "Unsupported action type '{}' from provider",
            other
        ))),
    }
}

fn agent_proposal_to_next_operation(proposal: &llm::AgentProposal) -> Result<NextOperation, AgentError> {
    match proposal {
        llm::AgentProposal::ProposeAction { action, rationale, confidence } => {
            Ok(NextOperation::Approval {
                execution: PendingExecution::Action(retail_action_to_executor(action)),
                proposal: RetailAgentProposal::ProposeAction {
                    action: action.clone(),
                    rationale: rationale.clone(),
                    confidence: *confidence,
                },
            })
        }
        llm::AgentProposal::ProposeTool { tool_call, rationale, confidence } => {
            let retail_tool = llm_tool_to_retail(tool_call).ok_or_else(|| {
                AgentError::Provider("This tool is not supported by the advanced agent yet.".to_string())
            })?;
            Ok(NextOperation::Approval {
                execution: PendingExecution::Tool(retail_tool.clone()),
                proposal: RetailAgentProposal::ProposeTool {
                    tool_call: retail_tool,
                    rationale: rationale.clone(),
                    confidence: *confidence,
                },
            })
        }
        llm::AgentProposal::AskUser { question } => {
            Ok(NextOperation::AskUser {
                question: question.clone(),
            })
        }
        llm::AgentProposal::Done { summary } => {
            Ok(NextOperation::Done {
                summary: summary.clone(),
            })
        }
    }
}

fn llm_tool_to_retail(tool_call: &llm::ToolCall) -> Option<RetailToolCall> {
    match tool_call {
        llm::ToolCall::FsList { path } => Some(RetailToolCall::FsList { path: path.clone() }),
        llm::ToolCall::FsReadText { path } => Some(RetailToolCall::FsReadText { path: path.clone() }),
        llm::ToolCall::FsWriteText { path, content } => Some(RetailToolCall::FsWriteText { path: path.clone(), content: content.clone() }),
        llm::ToolCall::FsApplyPatch { path, patch } => Some(RetailToolCall::FsApplyPatch { path: path.clone(), patch: patch.clone() }),
        llm::ToolCall::FsDelete { path } => Some(RetailToolCall::FsDelete { path: path.clone() }),
        llm::ToolCall::TerminalExec { cmd, args, cwd } => Some(RetailToolCall::TerminalExec { cmd: cmd.clone(), args: args.clone(), cwd: cwd.clone() }),
        llm::ToolCall::EmptyTrash => Some(RetailToolCall::EmptyTrash),
        llm::ToolCall::GetClipboard => Some(RetailToolCall::GetClipboard),
        llm::ToolCall::SetClipboard { text } => Some(RetailToolCall::SetClipboard { text: text.clone() }),
        llm::ToolCall::MoveFiles { paths, destination } => Some(RetailToolCall::MoveFiles { paths: paths.clone(), destination: destination.clone() }),
        llm::ToolCall::AppGetState => Some(RetailToolCall::AppGetState),
        _ => None,
    }
}

fn parse_tool_call(proposal: &RawProposalEnvelope) -> Result<RetailToolCall, AgentError> {
    let tool_name = proposal
        .tool
        .as_deref()
        .ok_or_else(|| AgentError::Provider("Tool proposal missing tool name".to_string()))?;

    match tool_name {
        "fs.list" => Ok(RetailToolCall::FsList {
            path: read_string(&proposal.params, "path")?,
        }),
        "fs.read_text" => Ok(RetailToolCall::FsReadText {
            path: read_string(&proposal.params, "path")?,
        }),
        "fs.write_text" => Ok(RetailToolCall::FsWriteText {
            path: read_string(&proposal.params, "path")?,
            content: read_string(&proposal.params, "content")?,
        }),
        "fs.apply_patch" => Ok(RetailToolCall::FsApplyPatch {
            path: read_string(&proposal.params, "path")?,
            patch: read_string(&proposal.params, "patch")?,
        }),
        "fs.delete" => Ok(RetailToolCall::FsDelete {
            path: read_string(&proposal.params, "path")?,
        }),
        "terminal.exec" => Ok(RetailToolCall::TerminalExec {
            cmd: read_string(&proposal.params, "cmd")?,
            args: read_string_vec(&proposal.params, "args").unwrap_or_default(),
            cwd: read_optional_string(&proposal.params, "cwd"),
        }),
        "system.empty_trash" => Ok(RetailToolCall::EmptyTrash),
        "system.get_clipboard" => Ok(RetailToolCall::GetClipboard),
        "system.set_clipboard" => Ok(RetailToolCall::SetClipboard {
            text: read_string(&proposal.params, "text")?,
        }),
        "fs.move_files" => Ok(RetailToolCall::MoveFiles {
            paths: read_string_vec(&proposal.params, "paths").unwrap_or_default(),
            destination: read_string(&proposal.params, "destination")?,
        }),
        "app.get_state" => Ok(RetailToolCall::AppGetState),
        other => Err(AgentError::Provider(format!(
            "Unsupported tool '{}' from provider",
            other
        ))),
    }
}

fn retail_action_to_executor(action: &RetailInputAction) -> executor::Action {
    match action {
        RetailInputAction::Click { x, y, button } => executor::Action::Click {
            x: *x,
            y: *y,
            button: mouse_button(button),
        },
        RetailInputAction::DoubleClick { x, y, .. } => {
            executor::Action::DoubleClick { x: *x, y: *y }
        }
        RetailInputAction::Scroll { dx, dy } => executor::Action::Scroll { dx: *dx, dy: *dy },
        RetailInputAction::Type { text } => executor::Action::Type { text: text.clone() },
        RetailInputAction::Hotkey { key, modifiers } => executor::Action::Hotkey {
            key: key.clone(),
            modifiers: modifiers.clone().unwrap_or_default(),
        },
        RetailInputAction::OpenApp { app_name } => executor::Action::OpenApp {
            app_name: app_name.clone(),
        },
    }
}

fn retail_tool_to_workspace(tool_call: &RetailToolCall) -> workspace::ToolCall {
    match tool_call {
        RetailToolCall::FsList { path } => workspace::ToolCall::FsList { path: path.clone() },
        RetailToolCall::FsReadText { path } => {
            workspace::ToolCall::FsReadText { path: path.clone() }
        }
        RetailToolCall::FsWriteText { path, content } => workspace::ToolCall::FsWriteText {
            path: path.clone(),
            content: content.clone(),
        },
        RetailToolCall::FsApplyPatch { path, patch } => workspace::ToolCall::FsApplyPatch {
            path: path.clone(),
            patch: patch.clone(),
        },
        RetailToolCall::FsDelete { path } => workspace::ToolCall::FsDelete {
            path: path.clone(),
        },
        RetailToolCall::TerminalExec { cmd, args, cwd } => workspace::ToolCall::TerminalExec {
            cmd: cmd.clone(),
            args: args.clone(),
            cwd: cwd.clone(),
        },
        // GORKH system/app tools are handled in execute_pending before reaching workspace dispatch.
        RetailToolCall::AppGetState
        | RetailToolCall::SettingsSet { .. }
        | RetailToolCall::FreeAiInstall { .. }
        | RetailToolCall::EmptyTrash
        | RetailToolCall::GetClipboard
        | RetailToolCall::SetClipboard { .. }
        | RetailToolCall::MoveFiles { .. } => {
            unreachable!("GORKH tools must not reach workspace dispatch")
        }
    }
}

fn mouse_button(button: &str) -> executor::MouseButton {
    match button {
        "right" => executor::MouseButton::Right,
        "middle" => executor::MouseButton::Middle,
        _ => executor::MouseButton::Left,
    }
}

async fn update_task_for_step(
    current_task: &Arc<RwLock<Option<AgentTask>>>,
    step_id: &str,
    status: StepStatus,
) {
    let mut guard = current_task.write().await;
    if let Some(task) = guard.as_mut() {
        if let Some(plan) = task.plan.as_mut() {
            if let Some(step) = plan.steps.iter_mut().find(|step| step.id == step_id) {
                step.status = status;
            }
        }
        task.updated_at = now();
    }
}

fn read_string(params: &Value, key: &str) -> Result<String, AgentError> {
    params
        .get(key)
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .ok_or_else(|| AgentError::Provider(format!("Missing string field '{}'", key)))
}

fn read_optional_string(params: &Value, key: &str) -> Option<String> {
    params
        .get(key)
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

fn read_f64(params: &Value, key: &str) -> Result<f64, AgentError> {
    params
        .get(key)
        .and_then(Value::as_f64)
        .ok_or_else(|| AgentError::Provider(format!("Missing numeric field '{}'", key)))
}

fn read_i32(params: &Value, key: &str) -> Result<i32, AgentError> {
    params
        .get(key)
        .and_then(Value::as_i64)
        .map(|value| value as i32)
        .ok_or_else(|| AgentError::Provider(format!("Missing integer field '{}'", key)))
}

fn read_optional_u64(params: &Value, key: &str) -> Option<u64> {
    params.get(key).and_then(Value::as_u64)
}

fn read_string_vec(params: &Value, key: &str) -> Option<Vec<String>> {
    params.get(key).and_then(Value::as_array).map(|items| {
        items
            .iter()
            .filter_map(Value::as_str)
            .map(ToString::to_string)
            .collect()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_empty_trash_tool_call() {
        let json = r#"{
            "action_type": "tool",
            "tool": "system.empty_trash",
            "params": {},
            "rationale": "User asked to empty trash",
            "confidence": 0.95
        }"#;
        let result = parse_next_operation(json);
        if let Err(ref e) = result {
            panic!("parse failed: {}", e);
        }
        match result.unwrap() {
            NextOperation::Approval { execution, .. } => {
                match execution {
                    PendingExecution::Tool(RetailToolCall::EmptyTrash) => {},
                    _ => panic!("Expected EmptyTrash"),
                }
            }
            _ => panic!("Expected Approval"),
        }
    }

    #[test]
    fn parse_app_get_state_tool_call() {
        let json = r#"{
            "action_type": "tool",
            "tool": "app.get_state",
            "params": {},
            "rationale": "Check app state",
            "confidence": 0.9
        }"#;
        let result = parse_next_operation(json);
        if let Err(ref e) = result {
            panic!("parse failed: {}", e);
        }
        match result.unwrap() {
            NextOperation::Approval { execution, .. } => {
                match execution {
                    PendingExecution::Tool(RetailToolCall::AppGetState) => {},
                    _ => panic!("Expected AppGetState"),
                }
            }
            _ => panic!("Expected Approval"),
        }
    }
}
