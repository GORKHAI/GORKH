//! LLM Provider Module - ACTIVE PRODUCTION PATH
//!
//! ⚠️  IMPORTANT: This is the ACTIVE production provider path for all chat/assistant
//!     functionality in GORKH. All user-facing LLM interactions (chat, Free AI,
//!     test connection) go through this module.
//!
//! ## Architecture
//!
//! This module provides a unified provider interface for:
//! - **Chat/Conversation**: `assistant_conversation_turn` command
//! - **Action Proposals**: `llm_propose_next_action` command  
//! - **Test Connection**: Provider validation via `create_provider`
//! - **Free AI**: Local Ollama runtime via `native_ollama` provider
//!
//! ## Provider Creation
//!
//! The single entry point for creating providers is [`create_provider`]. All
//! provider instantiation for production use MUST go through this function.
//!
//! ## Supported Providers
//!
//! - `native_qwen_ollama` - Free AI (local Ollama, Qwen models)
//! - `openai` - OpenAI API (GPT models)
//! - `claude` - Anthropic API (Claude models)
//! - `deepseek` - DeepSeek API (OpenAI-compatible)
//! - `minimax` - MiniMax API (OpenAI-compatible)
//! - `kimi` - Moonshot/Kimi API (OpenAI-compatible)
//! - `openai_compat` - Generic OpenAI-compatible servers
//!
//! ## Dormant/Advanced Path
//!
//! The separate `agent::providers` module contains an experimental provider
//! hierarchy for the advanced agent system. It is NOT the active production
//! path and should not be used for standard chat functionality.
//!
//! When adding new provider features, ALWAYS use this module (`llm`), not
//! `agent::providers`.

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::time::{Duration, Instant};

pub mod claude;
pub mod error;
pub mod native_ollama;
pub mod openai;
pub mod openai_compat;

pub use error::LlmErrorCode;

// =============================================================================
// Shared HTTP Client Configuration
// =============================================================================
// Centralized configuration for LLM HTTP clients to ensure consistent
// timeouts, error handling, and behavior across all providers.
// =============================================================================

/// Standard timeout for cloud providers (OpenAI, Claude, etc.)
pub const CLOUD_PROVIDER_TIMEOUT: Duration = Duration::from_secs(60);

/// Extended timeout for local providers (Ollama) which may have slower cold starts
pub const LOCAL_PROVIDER_TIMEOUT: Duration = Duration::from_secs(120);

/// Connection timeout for all providers (separate from overall request timeout)
pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Configuration for creating an HTTP client for LLM providers
#[derive(Debug, Clone, Copy)]
pub struct ClientConfig {
    /// Overall request timeout
    pub timeout: Duration,
    /// Connection establishment timeout
    pub connect_timeout: Duration,
    /// Whether to accept invalid certificates (for local development only)
    pub accept_invalid_certs: bool,
}

impl ClientConfig {
    /// Configuration for cloud providers (OpenAI, Claude, DeepSeek, etc.)
    pub fn cloud() -> Self {
        Self {
            timeout: CLOUD_PROVIDER_TIMEOUT,
            connect_timeout: CONNECT_TIMEOUT,
            accept_invalid_certs: false,
        }
    }

    /// Configuration for local providers (Ollama, local servers)
    pub fn local() -> Self {
        Self {
            timeout: LOCAL_PROVIDER_TIMEOUT,
            connect_timeout: CONNECT_TIMEOUT,
            accept_invalid_certs: false,
        }
    }

    /// Configuration for development/testing with local servers
    pub fn local_dev() -> Self {
        Self {
            timeout: LOCAL_PROVIDER_TIMEOUT,
            connect_timeout: CONNECT_TIMEOUT,
            accept_invalid_certs: true,
        }
    }
}

/// Create a reqwest Client with the given configuration
pub fn create_http_client(config: ClientConfig) -> Result<reqwest::Client, LlmError> {
    reqwest::Client::builder()
        .timeout(config.timeout)
        .connect_timeout(config.connect_timeout)
        .danger_accept_invalid_certs(config.accept_invalid_certs)
        .build()
        .map_err(|e| LlmError {
            code: LlmErrorCode::ClientInitFailed,
            message: format!("Failed to create HTTP client: {}", e),
        })
}

/// Standard error classification for reqwest errors
pub fn classify_request_error(e: &reqwest::Error) -> LlmErrorCode {
    if e.is_connect() {
        LlmErrorCode::ConnectionFailed
    } else if e.is_timeout() {
        LlmErrorCode::Timeout
    } else if e.is_status() {
        LlmErrorCode::ApiError
    } else {
        LlmErrorCode::RequestFailed
    }
}

/// Build a user-friendly error message based on error classification
pub fn user_facing_request_error_message(code: LlmErrorCode, context: &str, base_url: &str) -> String {
    match code {
        LlmErrorCode::Timeout => format!(
            "{} timed out after {} seconds. The server at {} may be overloaded or not responding.",
            context,
            LOCAL_PROVIDER_TIMEOUT.as_secs(),
            base_url
        ),
        LlmErrorCode::ConnectionFailed => format!(
            "{} could not connect to {}. Check that the service is running and reachable.",
            context, base_url
        ),
        _ => format!("{} failed: {}", context, base_url),
    }
}

/// Build a standardized error from a reqwest error with context
pub fn request_error(e: reqwest::Error, context: &str) -> LlmError {
    let code = classify_request_error(&e);
    LlmError {
        code,
        message: format!("{}: {}", context, e),
    }
}

/// Available tools for the AI agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "tool")]
pub enum ToolCall {
    // Workspace file-system tools
    #[serde(rename = "fs.list")]
    FsList { path: String },
    #[serde(rename = "fs.read_text")]
    FsReadText { path: String },
    #[serde(rename = "fs.write_text")]
    FsWriteText { path: String, content: String },
    #[serde(rename = "fs.apply_patch")]
    FsApplyPatch { path: String, patch: String },
    #[serde(rename = "fs.delete")]
    FsDelete { path: String },
    #[serde(rename = "terminal.exec")]
    TerminalExec {
        cmd: String,
        args: Vec<String>,
        cwd: Option<String>,
    },
    // GORKH internal app tools (STEP 2)
    #[serde(rename = "app.get_state")]
    AppGetState,
    #[serde(rename = "settings.set")]
    SettingsSet {
        key: String,
        value: serde_json::Value,
    },
    #[serde(rename = "free_ai.install")]
    FreeAiInstall { tier: String },
}

impl ToolCall {
    /// Returns true if this tool modifies state or executes commands (requires approval)
    #[allow(dead_code)]
    pub fn is_destructive(&self) -> bool {
        matches!(
            self,
            ToolCall::FsWriteText { .. }
                | ToolCall::FsApplyPatch { .. }
                | ToolCall::FsDelete { .. }
                | ToolCall::TerminalExec { .. }
                | ToolCall::SettingsSet { .. }
                | ToolCall::FreeAiInstall { .. }
        )
    }

    /// Get the target path or command for logging
    #[allow(dead_code)]
    pub fn target(&self) -> &str {
        match self {
            ToolCall::FsList { path } => path,
            ToolCall::FsReadText { path } => path,
            ToolCall::FsWriteText { path, .. } => path,
            ToolCall::FsApplyPatch { path, .. } => path,
            ToolCall::FsDelete { path, .. } => path,
            ToolCall::TerminalExec { cmd, .. } => cmd,
            ToolCall::AppGetState => "app",
            ToolCall::SettingsSet { key, .. } => key,
            ToolCall::FreeAiInstall { tier } => tier,
        }
    }
}

/// An action that can be proposed by the AI agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum InputAction {
    #[serde(rename = "click")]
    Click { x: f64, y: f64, button: String },
    #[serde(rename = "double_click")]
    DoubleClick { x: f64, y: f64, button: String },
    #[serde(rename = "scroll")]
    Scroll { dx: i32, dy: i32 },
    #[serde(rename = "type")]
    Type { text: String },
    #[serde(rename = "hotkey")]
    Hotkey {
        key: String,
        modifiers: Option<Vec<String>>,
    },
    #[serde(rename = "open_app")]
    OpenApp { app_name: String },
}

/// A proposal from the AI agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum AgentProposal {
    #[serde(rename = "propose_action")]
    ProposeAction {
        action: InputAction,
        rationale: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        confidence: Option<f64>,
    },
    #[serde(rename = "propose_tool")]
    ProposeTool {
        tool_call: ToolCall,
        rationale: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        confidence: Option<f64>,
    },
    #[serde(rename = "ask_user")]
    AskUser { question: String },
    #[serde(rename = "done")]
    Done { summary: String },
}

/// Parameters for requesting a proposal from the LLM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalParams {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub api_key: String,
    pub goal: String,
    pub screenshot_png_base64: Option<String>,
    pub history: Option<ActionHistory>,
    pub constraints: RunConstraints,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_configured: Option<bool>,
    /// Structured GORKH app state injected into the system prompt for grounding.
    /// Contains no sensitive data (no keys, paths, file contents, or typed text).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_context: Option<String>,
    /// Correlation ID for tracing requests across desktop/API boundaries
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

/// A recent conversation turn used for the intake bridge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurnMessage {
    pub role: String,
    pub text: String,
}

/// Parameters for requesting a conversation/intake response from the LLM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurnParams {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub api_key: String,
    pub messages: Vec<ConversationTurnMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_context: Option<String>,
    /// Correlation ID for tracing requests across desktop/API boundaries
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

/// The only allowed response shapes for the intake bridge.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ConversationTurnResult {
    #[serde(rename = "reply")]
    Reply { message: String },
    #[serde(rename = "confirm_task")]
    ConfirmTask {
        goal: String,
        summary: String,
        prompt: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionHistory {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_actions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_user_messages: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunConstraints {
    #[serde(alias = "max_actions")]
    pub max_actions: u32,
    #[serde(alias = "max_runtime_minutes")]
    pub max_runtime_minutes: u32,
}

#[cfg(test)]
mod tests {
    use super::{
        build_conversation_user_prompt, parse_json_response, ConversationTurnMessage,
        ConversationTurnResult, RunConstraints,
    };

    #[test]
    fn run_constraints_deserialize_from_camel_case_fields() {
        let parsed: RunConstraints = serde_json::from_value(serde_json::json!({
            "maxActions": 1,
            "maxRuntimeMinutes": 2
        }))
        .expect("camelCase constraints should deserialize");

        assert_eq!(parsed.max_actions, 1);
        assert_eq!(parsed.max_runtime_minutes, 2);
    }

    #[test]
    fn conversation_prompt_keeps_the_latest_messages() {
        let messages = (0..15)
            .map(|index| ConversationTurnMessage {
                role: if index % 2 == 0 {
                    "user".to_string()
                } else {
                    "assistant".to_string()
                },
                text: format!("message-{index}"),
            })
            .collect::<Vec<_>>();

        let prompt = build_conversation_user_prompt(&messages);

        assert!(!prompt.contains("message-0"));
        assert!(!prompt.contains("message-1"));
        assert!(!prompt.contains("message-2"));
        assert!(prompt.contains("message-3"));
        assert!(prompt.contains("message-14"));
    }

    #[test]
    fn parse_conversation_turn_accepts_prefixed_confirm_task_payload() {
        let parsed = parse_json_response::<ConversationTurnResult>(
            r#"-confirm_task{"goal":"gorkh-serve-up-still-thread","summary":"I will serve and warn the user about a still thread.","prompt":"Confirm?"}"#,
            "conversation turn",
        )
        .expect("prefixed confirm_task payload should deserialize");

        match parsed {
            ConversationTurnResult::ConfirmTask {
                goal,
                summary,
                prompt,
            } => {
                assert_eq!(goal, "gorkh-serve-up-still-thread");
                assert_eq!(
                    summary,
                    "I will serve and warn the user about a still thread."
                );
                assert_eq!(prompt, "Confirm?");
            }
            ConversationTurnResult::Reply { .. } => {
                panic!("expected confirm_task payload to stay a confirm_task")
            }
        }
    }
}

/// Error type for LLM operations
#[derive(Debug, Clone, Serialize)]
pub struct LlmError {
    pub code: LlmErrorCode,
    pub message: String,
}

impl std::fmt::Display for LlmError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for LlmError {}

impl LlmError {
    /// Create a new LLM error with the given code and message
    pub fn new(code: LlmErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

/// Usage metadata for LLM requests
/// 
/// Captures telemetry data for debugging, cost analysis, and provider comparison.
/// No sensitive content (prompts, keys, user data) is included.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmUsageMetadata {
    /// Provider identifier (e.g., "openai", "claude", "native_qwen_ollama")
    pub provider: String,
    /// Model name used for the request
    pub model: String,
    /// Request path classification
    pub path: LlmRequestPath,
    /// Duration in milliseconds
    pub duration_ms: u64,
    /// Input/prompt tokens if available (0 if not provided by provider)
    pub input_tokens: usize,
    /// Output/completion tokens if available (0 if not provided by provider)
    pub output_tokens: usize,
    /// Total tokens if available (0 if not provided by provider)
    pub total_tokens: usize,
    /// Whether token counts are actual (from provider) or unknown
    pub tokens_available: bool,
    /// Correlation ID for cross-system tracing
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

/// Classification of LLM request paths
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LlmRequestPath {
    /// Local provider (Ollama, local servers)
    Local,
    /// Cloud provider (OpenAI, Claude, etc.)
    Cloud,
    /// Hosted Free AI fallback
    HostedFallback,
}

impl std::fmt::Display for LlmRequestPath {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LlmRequestPath::Local => write!(f, "local"),
            LlmRequestPath::Cloud => write!(f, "cloud"),
            LlmRequestPath::HostedFallback => write!(f, "hosted_fallback"),
        }
    }
}

/// Classify request path based on base URL
pub fn classify_request_path(base_url: &str) -> LlmRequestPath {
    let lower = base_url.to_lowercase();
    if lower.contains("/desktop/free-ai/") || lower.contains("free-ai/v1") {
        LlmRequestPath::HostedFallback
    } else if lower.starts_with("http://localhost") 
        || lower.starts_with("https://localhost")
        || lower.starts_with("http://127.")
        || lower.starts_with("https://127.")
        || lower.starts_with("http://[::1]")
        || lower.starts_with("https://[::1]") 
    {
        LlmRequestPath::Local
    } else {
        LlmRequestPath::Cloud
    }
}

/// Log usage metadata for observability
/// 
/// This function logs structured usage data without sensitive content.
/// Use this for debugging, cost tracking, and provider comparison.
pub fn log_usage(metadata: &LlmUsageMetadata) {
    // Structured log for observability
    let log_entry = serde_json::json!({
        "event": "llm_request_complete",
        "provider": &metadata.provider,
        "model": &metadata.model,
        "path": metadata.path,
        "duration_ms": metadata.duration_ms,
        "input_tokens": metadata.input_tokens,
        "output_tokens": metadata.output_tokens,
        "total_tokens": metadata.total_tokens,
        "tokens_available": metadata.tokens_available,
        "correlation_id": metadata.correlation_id,
    });
    
    // Log structured usage data (debug level)
    // In production, this can be captured by log aggregation
    println!("[LLM_USAGE] {}", log_entry);
}

/// Trait for LLM providers
#[async_trait::async_trait]
pub trait LlmProvider: Send + Sync {
    /// Request a proposal from the LLM
    async fn propose_next_action(&self, params: &ProposalParams)
        -> Result<AgentProposal, LlmError>;

    /// Handle a conversation/intake turn without starting execution.
    async fn conversation_turn(
        &self,
        params: &ConversationTurnParams,
    ) -> Result<ConversationTurnResult, LlmError>;
}

/// Create an LLM provider for production use
///
/// This is the SINGLE ENTRY POINT for creating LLM providers in the active
/// production path. All chat, proposal, and test connection flows MUST use
/// this function to instantiate providers.
///
/// # Arguments
///
/// * `provider` - Provider identifier (e.g., "native_qwen_ollama", "openai")
///
/// # Supported Providers
///
/// - `native_qwen_ollama` - Free AI (local Ollama with Qwen models)
/// - `openai` - OpenAI API (GPT-4, GPT-4o, etc.)
/// - `claude` - Anthropic API (Claude 3.x)
/// - `deepseek` - DeepSeek API (OpenAI-compatible)
/// - `minimax` - MiniMax API (OpenAI-compatible)
/// - `kimi` - Moonshot/Kimi API (OpenAI-compatible)
/// - `openai_compat` - Generic OpenAI-compatible server
///
/// # Errors
///
/// Returns `LlmErrorCode::UnsupportedProvider` if the provider name is unknown.
pub fn create_provider(provider: &str) -> Result<Box<dyn LlmProvider>, LlmError> {
    match provider {
        "native_qwen_ollama" => Ok(Box::new(native_ollama::NativeOllamaProvider)),
        "claude" => Ok(Box::new(claude::ClaudeProvider)),
        "deepseek" => Ok(Box::new(openai_compat::OpenAiCompatProvider)),
        "minimax" => Ok(Box::new(openai_compat::OpenAiCompatProvider)),
        "kimi" => Ok(Box::new(openai_compat::OpenAiCompatProvider)),
        "openai" => Ok(Box::new(openai::OpenAiProvider)),
        "openai_compat" => Ok(Box::new(openai_compat::OpenAiCompatProvider)),
        _ => Err(LlmError {
            code: LlmErrorCode::UnsupportedProvider,
            message: format!("Provider '{}' is not supported", provider),
        }),
    }
}

pub fn build_openai_chat_completions_url(base_url: &str) -> String {
    let trimmed = base_url.trim_end_matches('/');
    if trimmed.ends_with("/v1") {
        format!("{}/chat/completions", trimmed)
    } else {
        format!("{}/v1/chat/completions", trimmed)
    }
}

pub fn build_anthropic_messages_url(base_url: &str) -> String {
    let trimmed = base_url.trim_end_matches('/');
    if trimmed.ends_with("/v1") {
        format!("{}/messages", trimmed)
    } else {
        format!("{}/v1/messages", trimmed)
    }
}

fn strip_markdown_code_fence(content: &str) -> &str {
    let trimmed = content.trim();
    trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .and_then(|s| s.strip_suffix("```"))
        .unwrap_or(trimmed)
        .trim()
}

fn extract_balanced_json_fragment(content: &str, start_index: usize) -> Option<&str> {
    let first = content[start_index..].chars().next()?;
    if first != '{' && first != '[' {
        return None;
    }

    let mut stack = vec![first];
    let mut in_string = false;
    let mut escaped = false;

    for (offset, ch) in content[start_index + first.len_utf8()..].char_indices() {
        if in_string {
            if escaped {
                escaped = false;
                continue;
            }

            match ch {
                '\\' => escaped = true,
                '"' => in_string = false,
                _ => {}
            }
            continue;
        }

        match ch {
            '"' => in_string = true,
            '{' | '[' => stack.push(ch),
            '}' => {
                if stack.pop() != Some('{') {
                    return None;
                }
                if stack.is_empty() {
                    let end_index = start_index + first.len_utf8() + offset + ch.len_utf8();
                    return Some(&content[start_index..end_index]);
                }
            }
            ']' => {
                if stack.pop() != Some('[') {
                    return None;
                }
                if stack.is_empty() {
                    let end_index = start_index + first.len_utf8() + offset + ch.len_utf8();
                    return Some(&content[start_index..end_index]);
                }
            }
            _ => {}
        }
    }

    None
}

fn extract_first_json_fragment(content: &str) -> Option<&str> {
    let start_index = content
        .char_indices()
        .find_map(|(index, ch)| matches!(ch, '{' | '[').then_some(index))?;

    extract_balanced_json_fragment(content, start_index)
}

fn parse_prefixed_variant_payload<T: DeserializeOwned>(
    content: &str,
) -> Option<Result<T, serde_json::Error>> {
    let first_brace = content.find('{')?;
    let prefix = content[..first_brace]
        .trim()
        .trim_start_matches(|ch: char| ch == '-' || ch == '*' || ch == ':' || ch.is_whitespace())
        .trim_end_matches(|ch: char| ch == ':' || ch.is_whitespace())
        .trim();

    if prefix.is_empty()
        || !prefix
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
    {
        return None;
    }

    let json_fragment = extract_balanced_json_fragment(content, first_brace)?;
    let mut object =
        serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(json_fragment).ok()?;
    object
        .entry("kind".to_string())
        .or_insert_with(|| serde_json::Value::String(prefix.to_string()));

    Some(serde_json::from_value(serde_json::Value::Object(object)))
}

pub fn parse_json_response<T: DeserializeOwned>(content: &str, label: &str) -> Result<T, LlmError> {
    match serde_json::from_str(content) {
        Ok(parsed) => Ok(parsed),
        Err(e) => {
            let cleaned = strip_markdown_code_fence(content);

            serde_json::from_str(cleaned).map_err(|_| LlmError {
                code: LlmErrorCode::InvalidJson,
                message: format!(
                    "Failed to parse {}: {}. Content: {}",
                    label,
                    e,
                    content.chars().take(200).collect::<String>()
                ),
            })
        }
    }
}

/// Build the system prompt for the AI agent.
/// `app_context` is an optional structured GORKH app state block injected for grounding.
pub fn build_system_prompt(
    constraints: &RunConstraints,
    workspace_configured: bool,
    app_context: Option<&str>,
) -> String {
    let workspace_section = if workspace_configured {
        r#"
WORKSPACE TOOLS (sandboxed to workspace directory):
- fs.list: {{ "tool": "fs.list", "path": "." }}  // List files in directory (relative paths only)
- fs.read_text: {{ "tool": "fs.read_text", "path": "file.txt" }}  // Read file contents
- fs.write_text: {{ "tool": "fs.write_text", "path": "file.txt", "content": "text" }}  // Write file
- fs.apply_patch: {{ "tool": "fs.apply_patch", "path": "file.txt", "patch": "<<<<<<< SEARCH\\nold\\n=======\\nnew\\n>>>>>>> REPLACE" }}  // Apply search/replace patch
- terminal.exec: {{ "tool": "terminal.exec", "cmd": "ls", "args": ["-la"], "cwd": "." }}  // Execute command in workspace

Use tools when:
- Reading/writing code or configuration files
- Running build/test commands
- Analyzing project structure
NOTE: All file paths must be relative to the workspace root."#
    } else {
        "\nNOTE: No workspace configured. Tools are not available."
    };

    let app_context_section = match app_context {
        Some(ctx) if !ctx.trim().is_empty() => format!("\n\n{}", ctx),
        _ => String::new(),
    };

    format!(
        r#"You are GORKH, an AI desktop assistant. You help users automate tasks on their computer, explain your own features and settings, and guide them through setup. Every action you propose requires the user's explicit approval before it runs — you never take action without their confirmation. You are honest about what you can and cannot do.{}

SAFETY RULES:
1. NEVER perform actions that could be harmful (deleting files, making payments, signing in to accounts, changing passwords, etc.) without explicit user confirmation
2. When uncertain, use "ask_user" to request clarification
3. Respect user privacy - do not read or transmit sensitive information
4. Prefer asking over assuming
5. Use tools for file operations instead of GUI automation when appropriate

ACTION CONSTRAINTS:
- Maximum actions per run: {}
- Maximum runtime: {} minutes
- Propose ONE action or tool at a time

AVAILABLE ACTIONS (GUI automation):
- click: {{ "kind": "click", "x": 0.5, "y": 0.5, "button": "left" }}  // x,y are normalized 0-1
- double_click: {{ "kind": "double_click", "x": 0.5, "y": 0.5, "button": "left" }}
- scroll: {{ "kind": "scroll", "dx": 0, "dy": -100 }}  // dy negative = scroll down
- type: {{ "kind": "type", "text": "hello world" }}  // max 500 chars
- hotkey: {{ "kind": "hotkey", "key": "enter", "modifiers": ["ctrl"] }}  // keys: enter, tab, escape, backspace, up, down, left, right
- open_app: {{ "kind": "open_app", "appName": "Photoshop" }}  // open a desktop app or browser by name

GORKH APP TOOLS (always available — use these to read or change GORKH settings):
- app.get_state: {{ "tool": "app.get_state" }}  // Fetch current GORKH state (Free AI, permissions, workspace, autostart)
- settings.set: {{ "tool": "settings.set", "key": "autostart", "value": true }}  // Change a GORKH setting; key must be "autostart" (bool)
- free_ai.install: {{ "tool": "free_ai.install", "tier": "standard" }}  // Start Free AI installation; tier: "light" | "standard" | "vision"
Use these when the user asks about their GORKH configuration or asks you to change a setting or set up Free AI.
{}{}

OUTPUT FORMAT:
Return STRICT JSON with exactly one of these structures:
1. {{ "kind": "propose_action", "action": <action_object>, "rationale": "why this action", "confidence": 0.9 }}
2. {{ "kind": "propose_tool", "tool_call": <tool_object>, "rationale": "why this tool", "confidence": 0.9 }}
3. {{ "kind": "ask_user", "question": "what should I do about X?" }}
4. {{ "kind": "done", "summary": "Task completed successfully because..." }}

Use confidence 0.0-1.0 to indicate certainty. Ask for help when confidence is low."#,
        app_context_section,
        constraints.max_actions,
        constraints.max_runtime_minutes,
        workspace_section,
        if workspace_configured {
            "\n\nPrefer tools for file operations and terminal commands. Use GUI actions for interacting with applications."
        } else {
            ""
        }
    )
}

/// Build the user prompt including screenshot and history
pub fn build_user_prompt(
    goal: &str,
    screenshot_b64: Option<&str>,
    history: &Option<ActionHistory>,
    action_count: u32,
) -> String {
    let mut prompt = format!("GOAL: {}\n\nACTION COUNT: {}\n\n", goal, action_count);

    if let Some(hist) = history {
        if let Some(actions) = &hist.last_actions {
            if !actions.is_empty() {
                prompt.push_str("PREVIOUS ACTIONS:\n");
                for action in actions.iter().take(5) {
                    prompt.push_str(&format!("- {}\n", action));
                }
                prompt.push('\n');
            }
        }
        if let Some(messages) = &hist.last_user_messages {
            if !messages.is_empty() {
                prompt.push_str("USER MESSAGES:\n");
                for msg in messages.iter().take(3) {
                    prompt.push_str(&format!("- {}\n", msg));
                }
                prompt.push('\n');
            }
        }
    }

    if let Some(screenshot) = screenshot_b64 {
        prompt.push_str(&format!(
            "CURRENT SCREENSHOT:\n[BASE64_PNG:{}]\n\n",
            screenshot.len()
        ));
        prompt.push_str("Analyze the screenshot to determine the next step.");
    } else {
        prompt.push_str("No screenshot available. Propose a first step or ask for clarification.");
    }

    prompt.push_str("\n\nWhat is your next proposal? Return valid JSON.");
    prompt
}

pub fn build_conversation_system_prompt(app_context: Option<&str>) -> String {
    let app_context_section = match app_context {
        Some(ctx) if !ctx.trim().is_empty() => format!("\n\nAPP CONTEXT:\n{}", ctx.trim()),
        _ => String::new(),
    };

    format!(
        "{}{}",
        concat!(
            "You are GORKH, an AI desktop assistant handling the conversation and intake stage only.\n",
            "You are not executing tasks in this turn.\n",
            "Do not start execution from the intake turn.\n",
            "Ask clarifying questions when details are missing.\n",
            "Never invent missing details. Never claim execution has started.\n",
            "\n",
            "You MUST respond with ONLY a valid JSON object. No extra text, no markdown, no explanation.\n",
            "\n",
            "When the user request is clear and specific enough to execute, respond with EXACTLY this format:\n",
            "{\"kind\":\"confirm_task\",\"goal\":\"concise goal\",\"summary\":\"I will ...\",\"prompt\":\"...? Confirm?\"}\n",
            "\n",
            "For all other responses (greetings, questions, clarifications), respond with EXACTLY this format:\n",
            "{\"kind\":\"reply\",\"message\":\"your reply here\"}\n",
            "\n",
            "The JSON must have a \"kind\" field set to either \"reply\" or \"confirm_task\". No other formats are accepted."
        ),
        app_context_section
    )
}

pub fn build_conversation_user_prompt(messages: &[ConversationTurnMessage]) -> String {
    let mut prompt = String::from("RECENT CHAT MESSAGES:\n");

    if messages.is_empty() {
        prompt.push_str("- system: No conversation history was provided.\n");
    } else {
        let start_index = messages.len().saturating_sub(12);

        for message in messages.iter().skip(start_index) {
            let role = message.role.trim();
            let text = message.text.trim();
            prompt.push_str(&format!("- {}: {}\n", role, text));
        }
    }

    prompt.push_str(concat!(
        "\nRespond with a JSON object only. Use {\"kind\":\"reply\",\"message\":\"...\"}",
        " or {\"kind\":\"confirm_task\",\"goal\":\"...\",\"summary\":\"...\",\"prompt\":\"...\"}.",
        " No other text.",
    ));
    prompt
}

/// Parse a conversation turn response, with a fallback for models that omit the `kind` tag.
/// Small models sometimes return `{"message":"..."}` or freeform text — we recover gracefully
/// instead of surfacing a parse error to the user.
pub fn parse_conversation_turn_result(content: &str) -> Result<ConversationTurnResult, LlmError> {
    // Try standard parse first (handles correct format and ```json fences).
    if let Ok(result) = parse_json_response::<ConversationTurnResult>(content, "conversation turn") {
        return Ok(result);
    }

    // Fallback: attempt to recover a usable reply from malformed JSON.
    let cleaned = content
        .trim()
        .strip_prefix("```json")
        .or_else(|| content.trim().strip_prefix("```"))
        .and_then(|s| s.strip_suffix("```"))
        .unwrap_or(content)
        .trim();

    if let Ok(value) = serde_json::from_str::<serde_json::Value>(cleaned) {
        // Model returned {"message": "..."} without kind → treat as reply.
        if let Some(msg) = value.get("message").and_then(|v| v.as_str()) {
            if !msg.is_empty() {
                return Ok(ConversationTurnResult::Reply { message: msg.to_string() });
            }
        }
        // Model returned some other JSON object → extract any string value as reply.
        if let Some(map) = value.as_object() {
            for v in map.values() {
                if let Some(s) = v.as_str() {
                    if !s.is_empty() && s.len() > 3 {
                        return Ok(ConversationTurnResult::Reply { message: s.to_string() });
                    }
                }
            }
        }
    }

    // Model returned plain text (not JSON at all) → use it as a reply.
    let trimmed = content.trim();
    if !trimmed.is_empty() && !trimmed.starts_with('{') && !trimmed.starts_with('[') {
        return Ok(ConversationTurnResult::Reply { message: trimmed.to_string() });
    }

    Err(LlmError {
        code: LlmErrorCode::InvalidJson,
        message: format!(
            "Failed to parse conversation turn. Content: {}",
            content.chars().take(200).collect::<String>()
        ),
    })
}
