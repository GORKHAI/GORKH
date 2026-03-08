# Task Planner & Action Executor

## Task Planner (`agent/planner.rs`)

The planner breaks down high-level goals into executable steps.

```rust
use serde::{Deserialize, Serialize};

pub struct TaskPlanner {
    llm_endpoint: String,
    model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPlan {
    pub goal: String,
    pub steps: Vec<PlanStep>,
    pub estimated_duration_secs: u64,
    pub required_apps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanStep {
    pub step_number: usize,
    pub description: String,
    pub action_description: String, // Natural language action
    pub expected_outcome: String,
    pub verification_required: bool,
    pub retry_count: u32,
    pub max_retries: u32,
    pub is_critical: bool, // If true, failure stops the task
}

impl TaskPlanner {
    pub fn new() -> Self {
        Self {
            llm_endpoint: "http://localhost:11434".to_string(),
            model: "qwen2.5:14b".to_string(),
        }
    }

    /// Create a plan for achieving the goal
    pub async fn create_plan(&self, goal: &str) -> Result<TaskPlan, PlannerError> {
        // Use LLM to break down the task
        let prompt = format!(
            r#"You are a task planner for a computer-use agent. Break down this goal into specific steps.

Goal: {}

Create a detailed plan with the following considerations:
1. Start with checking if required applications are open
2. Break complex operations into atomic steps
3. Include verification steps where appropriate
4. Consider error recovery options

Respond in JSON format:
{{
  "goal": "original goal",
  "steps": [
    {{
      "step_number": 1,
      "description": "what this step accomplishes",
      "action_description": "natural language description of the action",
      "expected_outcome": "what should happen after this step",
      "verification_required": true,
      "max_retries": 3,
      "is_critical": false
    }}
  ],
  "estimated_duration_secs": 120,
  "required_apps": ["app names needed"]
}}"#,
            goal
        );

        let request = serde_json::json!({
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": false,
            "format": "json"
        });

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/chat", self.llm_endpoint))
            .json(&request)
            .send()
            .await
            .map_err(|e| PlannerError::Llm(e.to_string()))?;

        let result: LlmResponse = response
            .json()
            .await
            .map_err(|e| PlannerError::Llm(e.to_string()))?;

        let plan: TaskPlan = serde_json::from_str(&result.message.content)
            .map_err(|e| PlannerError::Parse(e.to_string()))?;

        Ok(plan)
    }

    /// Adapt plan based on current state
    pub async fn replan(
        &self,
        current_plan: &TaskPlan,
        current_step: usize,
        error: &str,
        screen_state: &str,
    ) -> Result<TaskPlan, PlannerError> {
        let prompt = format!(
            r#"The current plan encountered an issue. Please replan.

Original Goal: {}
Current Step: {} of {}
Error: {}
Screen State: {}

Current Plan:
{}

Create a revised plan from step {} onwards.
"#,
            current_plan.goal,
            current_step,
            current_plan.steps.len(),
            error,
            screen_state,
            serde_json::to_string_pretty(&current_plan.steps[current_step..]).unwrap(),
            current_step
        );

        // Similar to create_plan but with context
        todo!()
    }

    /// Generate sub-plan for complex sub-tasks
    pub async fn decompose_subtask(&self, subtask: &str) -> Result<TaskPlan, PlannerError> {
        self.create_plan(subtask).await
    }
}

#[derive(Debug, Deserialize)]
struct LlmResponse {
    message: Message,
}

#[derive(Debug, Deserialize)]
struct Message {
    content: String,
}

#[derive(Debug, thiserror::Error)]
pub enum PlannerError {
    #[error("LLM error: {0}")]
    Llm(String),
    #[error("Parse error: {0}")]
    Parse(String),
}
```

## Action Executor (`agent/executor.rs`)

```rust
use enigo::{Enigo, MouseControllable, KeyboardControllable, Key};
use screenshots::Screen;
use std::process::Command;

pub struct ActionExecutor {
    enigo: Enigo,
    screen_width: i32,
    screen_height: i32,
}

impl ActionExecutor {
    pub fn new() -> Self {
        let screen = Screen::all().unwrap().into_iter().next().unwrap();
        Self {
            enigo: Enigo::new(),
            screen_width: screen.display_info.width as i32,
            screen_height: screen.display_info.height as i32,
        }
    }

    pub async fn execute(&self, action: super::Action) -> Result<(), ExecutionError> {
        match action {
            super::Action::Click { x, y, button } => {
                let px = (x * self.screen_width as f64) as i32;
                let py = (y * self.screen_height as f64) as i32;
                
                match button {
                    super::MouseButton::Left => self.enigo.mouse_move_to(px, py),
                    super::MouseButton::Right => self.enigo.mouse_move_to(px, py),
                    super::MouseButton::Middle => self.enigo.mouse_move_to(px, py),
                };
                
                // Small delay for move
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                
                match button {
                    super::MouseButton::Left => self.enigo.mouse_click(enigo::MouseButton::Left),
                    super::MouseButton::Right => self.enigo.mouse_click(enigo::MouseButton::Right),
                    super::MouseButton::Middle => self.enigo.mouse_click(enigo::MouseButton::Middle),
                }
            }

            super::Action::DoubleClick { x, y } => {
                let px = (x * self.screen_width as f64) as i32;
                let py = (y * self.screen_height as f64) as i32;
                
                self.enigo.mouse_move_to(px, py);
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                self.enigo.mouse_click(enigo::MouseButton::Left);
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                self.enigo.mouse_click(enigo::MouseButton::Left);
            }

            super::Action::Type { text } => {
                self.enigo.key_sequence(&text);
            }

            super::Action::Hotkey { keys } => {
                // Convert string keys to enigo keys
                let enigo_keys: Vec<Key> = keys.iter()
                    .map(|k| parse_key(k))
                    .collect::<Result<Vec<_>, _>>()?;
                
                // Press all keys
                for key in &enigo_keys {
                    self.enigo.key_down(*key);
                }
                
                // Release in reverse order
                for key in enigo_keys.iter().rev() {
                    self.enigo.key_up(*key);
                }
            }

            super::Action::Scroll { dx, dy } => {
                if dy != 0 {
                    let direction = if dy > 0 { -1 } else { 1 };
                    let amount = dy.abs() as i32;
                    for _ in 0..amount {
                        self.enigo.mouse_scroll_y(direction);
                    }
                }
                if dx != 0 {
                    let direction = if dx > 0 { 1 } else { -1 };
                    let amount = dx.abs() as i32;
                    for _ in 0..amount {
                        self.enigo.mouse_scroll_x(direction);
                    }
                }
            }

            super::Action::Wait { seconds } => {
                tokio::time::sleep(std::time::Duration::from_secs_f64(seconds)).await;
            }

            super::Action::FindAndClick { description } => {
                // This requires vision - should be handled at higher level
                return Err(ExecutionError::NotImplemented(
                    "FindAndClick requires vision".to_string()
                ));
            }

            super::Action::OpenApp { name } => {
                self.open_application(&name).await?;
            }

            super::Action::TakeScreenshot => {
                // Handled separately
            }

            super::Action::ReadFile { path } => {
                // Handled at higher level
            }

            super::Action::WriteFile { path, content } => {
                std::fs::write(&path, content)?;
            }

            super::Action::ListDirectory { path } => {
                // Handled at higher level
            }

            super::Action::MoveFile { from, to } => {
                std::fs::rename(&from, &to)?;
            }

            super::Action::ExecuteAppleScript { script } => {
                #[cfg(target_os = "macos")]
                {
                    Command::new("osascript")
                        .arg("-e")
                        .arg(&script)
                        .output()
                        .map_err(|e| ExecutionError::Command(e.to_string()))?;
                }
                #[cfg(not(target_os = "macos"))]
                {
                    return Err(ExecutionError::PlatformNotSupported);
                }
            }

            super::Action::ExecutePowerShell { command } => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("powershell")
                        .arg("-Command")
                        .arg(&command)
                        .output()
                        .map_err(|e| ExecutionError::Command(e.to_string()))?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    return Err(ExecutionError::PlatformNotSupported);
                }
            }
        }

        Ok(())
    }

    async fn open_application(&self, name: &str) -> Result<(), ExecutionError> {
        #[cfg(target_os = "macos")]
        {
            let app_name = if name.ends_with(".app") {
                name.to_string()
            } else {
                format!("{}.app", name)
            };
            
            Command::new("open")
                .arg("-a")
                .arg(&app_name)
                .output()
                .map_err(|e| ExecutionError::Command(e.to_string()))?;
        }

        #[cfg(target_os = "windows")]
        {
            Command::new("cmd")
                .args(&["/C", "start", "", name])
                .output()
                .map_err(|e| ExecutionError::Command(e.to_string()))?;
        }

        #[cfg(target_os = "linux")]
        {
            Command::new(name)
                .spawn()
                .map_err(|e| ExecutionError::Command(e.to_string()))?;
        }

        // Wait for app to launch
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
        Ok(())
    }

    pub async fn take_screenshot(&self) -> Result<Vec<u8>, ExecutionError> {
        let screen = Screen::all()
            .map_err(|e| ExecutionError::Screenshot(e.to_string()))?
            .into_iter()
            .next()
            .ok_or_else(|| ExecutionError::Screenshot("No screen found".to_string()))?;

        let image = screen
            .capture()
            .map_err(|e| ExecutionError::Screenshot(e.to_string()))?;

        // Convert to PNG bytes
        let mut buffer = Vec::new();
        {
            use std::io::Cursor;
            let mut cursor = Cursor::new(&mut buffer);
            image.write_to(&mut cursor, image::ImageOutputFormat::Png)
                .map_err(|e| ExecutionError::Screenshot(e.to_string()))?;
        }

        Ok(buffer)
    }

    pub async fn find_image_on_screen(&self, template_path: &str) -> Result<Option<(f64, f64)>, ExecutionError> {
        // Use template matching to find an image on screen
        // This is useful for finding buttons/icons that are hard to detect
        todo!()
    }

    pub async fn get_clipboard_content(&self) -> Result<String, ExecutionError> {
        // Read from clipboard
        todo!()
    }

    pub async fn set_clipboard_content(&self, content: &str) -> Result<(), ExecutionError> {
        // Write to clipboard
        todo!()
    }
}

fn parse_key(key: &str) -> Result<Key, ExecutionError> {
    match key.to_lowercase().as_str() {
        "ctrl" | "control" => Ok(Key::Control),
        "alt" | "option" => Ok(Key::Alt),
        "shift" => Ok(Key::Shift),
        "meta" | "command" | "win" => Ok(Key::Meta),
        "enter" | "return" => Ok(Key::Return),
        "escape" | "esc" => Ok(Key::Escape),
        "tab" => Ok(Key::Tab),
        "space" => Ok(Key::Space),
        "backspace" => Ok(Key::Backspace),
        "delete" => Ok(Key::Delete),
        "up" => Ok(Key::UpArrow),
        "down" => Ok(Key::DownArrow),
        "left" => Ok(Key::LeftArrow),
        "right" => Ok(Key::RightArrow),
        "home" => Ok(Key::Home),
        "end" => Ok(Key::End),
        "pageup" => Ok(Key::PageUp),
        "pagedown" => Ok(Key::PageDown),
        "f1" => Ok(Key::F1),
        "f2" => Ok(Key::F2),
        "f3" => Ok(Key::F3),
        "f4" => Ok(Key::F4),
        "f5" => Ok(Key::F5),
        "f6" => Ok(Key::F6),
        "f7" => Ok(Key::F7),
        "f8" => Ok(Key::F8),
        "f9" => Ok(Key::F9),
        "f10" => Ok(Key::F10),
        "f11" => Ok(Key::F11),
        "f12" => Ok(Key::F12),
        _ => {
            // Try to parse as character
            if key.len() == 1 {
                let ch = key.chars().next().unwrap();
                Ok(Key::Layout(ch))
            } else {
                Err(ExecutionError::UnknownKey(key.to_string()))
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ExecutionError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Screenshot error: {0}")]
    Screenshot(String),
    #[error("Command error: {0}")]
    Command(String),
    #[error("Unknown key: {0}")]
    UnknownKey(String),
    #[error("Platform not supported")]
    PlatformNotSupported,
    #[error("Not implemented: {0}")]
    NotImplemented(String),
}
```

## Memory System (`agent/memory.rs`)

```rust
use std::collections::VecDeque;
use serde::{Deserialize, Serialize};

pub struct AgentMemory {
    /// Recent actions for context
    short_term: VecDeque<ActionMemory>,
    /// Long-term learned patterns
    long_term: Vec<TaskPattern>,
    max_short_term: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionMemory {
    pub timestamp: u64,
    pub action: String,
    pub context: String,
    pub result: ActionResult,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionResult {
    Success,
    Failed(String),
    Retried(u32),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPattern {
    pub pattern_id: String,
    pub task_type: String,
    pub steps: Vec<String>,
    pub success_count: u32,
    pub failure_count: u32,
}

impl AgentMemory {
    pub fn new() -> Self {
        Self {
            short_term: VecDeque::with_capacity(50),
            long_term: vec![],
            max_short_term: 50,
        }
    }

    pub fn add_action(&mut self, memory: ActionMemory) {
        if self.short_term.len() >= self.max_short_term {
            self.short_term.pop_front();
        }
        self.short_term.push_back(memory);
    }

    pub fn get_recent_context(&self, count: usize) -> Vec<&ActionMemory> {
        self.short_term.iter().rev().take(count).collect()
    }

    pub fn find_similar_task(&self, goal: &str) -> Option<&TaskPattern> {
        // Find previously successful patterns for similar tasks
        self.long_term.iter()
            .filter(|p| p.task_type.contains(goal) || goal.contains(&p.task_type))
            .max_by_key(|p| p.success_count)
    }

    pub fn learn_pattern(&mut self, task_type: &str, steps: Vec<String>, success: bool) {
        if let Some(pattern) = self.long_term.iter_mut()
            .find(|p| p.task_type == task_type) {
            if success {
                pattern.success_count += 1;
            } else {
                pattern.failure_count += 1;
            }
        } else {
            self.long_term.push(TaskPattern {
                pattern_id: uuid::Uuid::new_v4().to_string(),
                task_type: task_type.to_string(),
                steps,
                success_count: if success { 1 } else { 0 },
                failure_count: if success { 0 } else { 1 },
            });
        }
    }

    pub fn to_context_string(&self) -> String {
        let recent: Vec<_> = self.short_term.iter()
            .rev()
            .take(10)
            .map(|m| format!("- [{}] {} -> {:?}", m.timestamp, m.action, m.result))
            .collect();
        
        format!("Recent actions:\n{}", recent.join("\n"))
    }
}
```

## Safety Guard (`agent/safety.rs`)

```rust
use std::collections::HashSet;

pub struct SafetyGuard {
    level: super::SafetyLevel,
    sensitive_patterns: HashSet<String>,
    blocked_paths: HashSet<String>,
    approved_apps: HashSet<String>,
}

impl SafetyGuard {
    pub fn new(level: super::SafetyLevel) -> Self {
        let mut sensitive_patterns = HashSet::new();
        sensitive_patterns.insert("password".to_string());
        sensitive_patterns.insert("credit card".to_string());
        sensitive_patterns.insert("delete".to_string());
        sensitive_patterns.insert("format".to_string());
        sensitive_patterns.insert("rm -rf".to_string());
        sensitive_patterns.insert("sudo".to_string());
        sensitive_patterns.insert("admin".to_string());

        let mut blocked_paths = HashSet::new();
        blocked_paths.insert("/System".to_string());
        blocked_paths.insert("C:\\Windows\\System32".to_string());
        blocked_paths.insert("~/.ssh".to_string());

        let mut approved_apps = HashSet::new();
        approved_apps.insert("photoshop".to_string());
        approved_apps.insert("blender".to_string());
        approved_apps.insert("chrome".to_string());
        approved_apps.insert("safari".to_string());
        approved_apps.insert("firefox".to_string());

        Self {
            level,
            sensitive_patterns,
            blocked_paths,
            approved_apps,
        }
    }

    pub fn requires_approval(&self, action: &super::Action) -> bool {
        match self.level {
            super::SafetyLevel::Strict => true,
            super::SafetyLevel::Balanced => self.is_sensitive(action),
            super::SafetyLevel::Autonomous => false,
        }
    }

    fn is_sensitive(&self, action: &super::Action) -> bool {
        match action {
            super::Action::Type { text } => {
                let lower = text.to_lowercase();
                self.sensitive_patterns.iter().any(|p| lower.contains(p))
            }
            super::Action::WriteFile { path, .. } |
            super::Action::MoveFile { to: path, .. } => {
                self.blocked_paths.iter().any(|p| path.contains(p))
            }
            super::Action::ExecuteAppleScript { script } |
            super::Action::ExecutePowerShell { command: script } => {
                let lower = script.to_lowercase();
                self.sensitive_patterns.iter().any(|p| lower.contains(p))
            }
            super::Action::OpenApp { name } => {
                !self.approved_apps.contains(&name.to_lowercase())
            }
            _ => false,
        }
    }

    pub fn validate_action(&self, action: &super::Action) -> Result<(), SafetyError> {
        match action {
            super::Action::WriteFile { path, .. } |
            super::Action::MoveFile { to: path, .. } => {
                for blocked in &self.blocked_paths {
                    if path.contains(blocked) {
                        return Err(SafetyError::BlockedPath(path.clone()));
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SafetyError {
    #[error("Action blocked: path '{0}' is protected")]
    BlockedPath(String),
    #[error("Action blocked: contains sensitive content")]
    SensitiveContent,
    #[error("App not in approved list")]
    UnapprovedApp,
}
```

## WebSocket Protocol Extensions

Add these message types to the shared protocol:

```typescript
// packages/shared/src/agent/agents.ts

export interface AgentTaskRequest {
  type: 'agent.task.request';
  payload: {
    taskId: string;
    goal: string;
    autonomy: 'strict' | 'balanced' | 'full';
    context?: string;
  };
}

export interface AgentProgressUpdate {
  type: 'agent.progress';
  payload: {
    taskId: string;
    status: 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed';
    currentStep?: number;
    totalSteps?: number;
    currentAction?: string;
    screenshot?: string; // base64
    message?: string;
  };
}

export interface AgentApprovalRequest {
  type: 'agent.approval.request';
  payload: {
    taskId: string;
    actionId: string;
    action: Action;
    reason: string;
    screenshot: string; // base64
  };
}

export interface AgentApprovalResponse {
  type: 'agent.approval.response';
  payload: {
    taskId: string;
    actionId: string;
    approved: boolean;
    comment?: string;
  };
}
```

## Usage Example

```rust
// In your Tauri command handler
#[tauri::command]
pub async fn start_agent_task(
    agent: State<'_, ComputerAgent>,
    goal: String,
    autonomy: String,
) -> Result<String, String> {
    let task = AgentTask {
        task_id: uuid::Uuid::new_v4().to_string(),
        goal,
        context: None,
        max_duration_secs: 600,
    };
    
    let autonomy_level = match autonomy.as_str() {
        "strict" => SafetyLevel::Strict,
        "balanced" => SafetyLevel::Balanced,
        "full" => SafetyLevel::Autonomous,
        _ => SafetyLevel::Balanced,
    };
    
    agent.start_task(task).await
        .map(|_| task.task_id.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn approve_agent_action(
    agent: State<'_, ComputerAgent>,
    approved: bool,
) -> Result<(), String> {
    agent.approve_action(approved).await
        .map_err(|e| e.to_string())
}
```

This implementation provides a complete autonomous agent system with vision, planning, execution, memory, and safety guardrails.
