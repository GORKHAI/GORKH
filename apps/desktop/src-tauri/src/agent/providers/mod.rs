//! Multi-provider LLM support for the advanced agent (EXPERIMENTAL)
//!
//! ⚠️  IMPORTANT: This module is for the ADVANCED AGENT system which is
//!     EXPERIMENTAL and NOT the active production path for standard chat.
//!
//! ## Status
//!
//! - **Purpose**: Advanced autonomous agent with task planning, screen analysis,
//!   and multi-step execution
//! - **Maturity**: Experimental/incomplete - many methods are stubs
//! - **Active Path**: For standard chat/assistant functionality, use `llm::`
//!   module instead (see `llm::create_provider`)
//!
//! ## Architecture
//!
//! This module has its own `LlmProvider` trait separate from the main `llm::`
//! module. The provider router here is for the advanced agent's specific needs
//! (task planning, screen analysis, etc.), not general chat.
//!
//! ## When to Use
//!
//! Only use this module if you are explicitly working on the advanced agent
//! feature. For all chat, Free AI, and test connection functionality, use
//! the `llm` module instead.
//!
//! ## Current Limitations
//!
//! - Provider trait methods are largely stubbed/not implemented
//! - Router returns `NOT_IMPLEMENTED` errors for most operations
//! - Not integrated with the main chat flow

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub mod claude;
pub mod deepseek;
pub mod local_compat;
pub mod moonshot;
pub mod native_ollama;
pub mod openai;
pub mod openai_format;

pub use claude::ClaudeProvider;
pub use deepseek::DeepSeekProvider;
pub use local_compat::LocalCompatProvider;
pub use moonshot::MoonshotProvider;
pub use native_ollama::NativeOllamaProvider;
pub use openai::OpenAiProvider;

/// Provider types supported by the agent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    /// Native Qwen model via Ollama (free, local)
    NativeQwenOllama,
    /// Local OpenAI-compatible server (e.g., llama.cpp)
    LocalOpenAiCompat,
    /// OpenAI API (paid)
    OpenAi,
    /// Anthropic Claude API (paid)
    Claude,
    /// DeepSeek API (paid, OpenAI-compatible)
    DeepSeek,
    /// Moonshot (Kimi) API (paid, OpenAI-compatible)
    Moonshot,
}

impl ProviderType {
    pub fn name(&self) -> &'static str {
        match self {
            ProviderType::NativeQwenOllama => "GORKH Native",
            ProviderType::LocalOpenAiCompat => "Local (OpenAI-compatible)",
            ProviderType::OpenAi => "OpenAI",
            ProviderType::Claude => "Claude",
            ProviderType::DeepSeek => "DeepSeek",
            ProviderType::Moonshot => "Moonshot (Kimi)",
        }
    }

    pub fn is_free(&self) -> bool {
        matches!(
            self,
            ProviderType::NativeQwenOllama | ProviderType::LocalOpenAiCompat
        )
    }

    pub fn is_cloud(&self) -> bool {
        !self.is_free()
    }
}

/// Capabilities of an LLM provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    /// Supports vision (screenshot analysis)
    pub supports_vision: bool,
    /// Supports streaming responses
    pub supports_streaming: bool,
    /// Supports function calling
    pub supports_functions: bool,
    /// Maximum context tokens
    pub max_context_tokens: usize,
    /// Maximum output tokens
    pub max_output_tokens: usize,
}

/// Request for planning a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanRequest {
    pub goal: String,
    pub context: Option<String>,
}

/// Request for analyzing a screen
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenAnalysisRequest {
    pub screenshot_base64: String,
    pub goal: String,
    pub previous_actions: Vec<String>,
}

/// Request for proposing next action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionRequest {
    pub observation: String,
    pub goal: String,
    pub step_description: String,
}

/// Response from LLM with cost info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmResponse {
    pub content: String,
    pub input_tokens: usize,
    pub output_tokens: usize,
    pub model: String,
    pub finish_reason: String,
}

/// Result of an LLM call with content and token usage.
#[derive(Debug, Clone)]
pub struct LlmResult {
    pub content: String,
    pub input_tokens: usize,
    pub output_tokens: usize,
}

/// Cost estimate for a request
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostEstimate {
    pub estimated_input_tokens: usize,
    pub estimated_output_tokens: usize,
    pub estimated_cost_usd: f64,
    pub currency: String,
}

/// Trait for LLM providers
#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// Get provider type
    fn provider_type(&self) -> ProviderType;

    /// Get provider name
    fn name(&self) -> &str;

    /// Check if provider is available (server running, key valid, etc.)
    async fn is_available(&self) -> bool;

    /// Get capabilities
    fn capabilities(&self) -> ProviderCapabilities;

    /// Plan a task
    async fn plan_task(&self, request: PlanRequest) -> Result<LlmResult, ProviderError>;

    /// Analyze a screen
    async fn analyze_screen(&self, request: ScreenAnalysisRequest)
        -> Result<LlmResult, ProviderError>;

    /// Propose next action
    async fn propose_next_step(&self, request: ActionRequest) -> Result<LlmResult, ProviderError>;

    /// Summarize result
    async fn summarize_result(&self, result_text: &str) -> Result<LlmResult, ProviderError>;

    /// Estimate cost for a request
    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64;
}

/// Error from provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderError {
    pub code: String,
    pub message: String,
    pub is_retryable: bool,
}

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for ProviderError {}

/// Provider router - manages multiple providers and routing logic
pub struct ProviderRouter {
    providers: RwLock<HashMap<ProviderType, Arc<dyn LlmProvider>>>,
    default_provider: RwLock<ProviderType>,
    fallback_order: RwLock<Vec<ProviderType>>,
    user_preferences: RwLock<UserPreferences>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub default_provider: ProviderType,
    pub fallback_enabled: bool,
    pub ask_before_paid: bool,
    pub cost_limit_per_task: f64,
    pub provider_configs: HashMap<ProviderType, ProviderConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub api_key: Option<String>,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            default_provider: ProviderType::NativeQwenOllama,
            fallback_enabled: true,
            ask_before_paid: true,
            cost_limit_per_task: 1.0,
            provider_configs: HashMap::new(),
        }
    }
}

impl ProviderRouter {
    pub fn new() -> Self {
        Self {
            providers: RwLock::new(HashMap::new()),
            default_provider: RwLock::new(ProviderType::NativeQwenOllama),
            fallback_order: RwLock::new(vec![
                ProviderType::NativeQwenOllama,
                ProviderType::LocalOpenAiCompat,
                ProviderType::Claude,
                ProviderType::OpenAi,
                ProviderType::DeepSeek,
                ProviderType::Moonshot,
            ]),
            user_preferences: RwLock::new(UserPreferences::default()),
        }
    }

    /// Register a provider
    pub async fn register_provider(&self, provider: Arc<dyn LlmProvider>) {
        let mut providers = self.providers.write().await;
        providers.insert(provider.provider_type(), provider);
    }

    /// Get a specific provider by type.
    pub async fn get_provider(&self, provider_type: ProviderType) -> Option<Arc<dyn LlmProvider>> {
        let providers = self.providers.read().await;
        providers.get(&provider_type).cloned()
    }

    /// Get the default provider
    pub async fn get_default_provider(&self) -> Option<Arc<dyn LlmProvider>> {
        let default = self.default_provider.read().await;
        self.get_provider(*default).await
    }

    /// Get provider info (without consuming)
    pub async fn get_provider_info(&self, provider_type: ProviderType) -> Option<ProviderInfo> {
        let providers = self.providers.read().await;
        providers.get(&provider_type).map(|p| ProviderInfo {
            provider_type,
            name: p.name().to_string(),
            available: false, // Would need async call
            is_free: provider_type.is_free(),
            capabilities: p.capabilities(),
        })
    }

    /// List all registered providers
    pub async fn list_providers(&self) -> Vec<ProviderInfo> {
        let providers = self.providers.read().await;
        let mut infos = Vec::new();
        for (ptype, provider) in providers.iter() {
            infos.push(ProviderInfo {
                provider_type: *ptype,
                name: provider.name().to_string(),
                available: false, // Async in real impl
                is_free: ptype.is_free(),
                capabilities: provider.capabilities(),
            });
        }
        infos
    }

    /// Set default provider
    pub async fn set_default_provider(&self, provider_type: ProviderType) {
        let mut default = self.default_provider.write().await;
        *default = provider_type;
    }

    /// Route to the best available provider.
    ///
    /// Logic:
    /// 1. Try the preferred provider. If registered, return it.
    /// 2. If not registered, walk the fallback chain and return the first registered provider.
    /// 3. If nothing is registered, return an error.
    pub async fn route(
        &self,
        preferred: Option<ProviderType>,
    ) -> Result<Arc<dyn LlmProvider>, ProviderError> {
        let prefs = self.user_preferences.read().await;
        let providers = self.providers.read().await;

        let to_try = preferred.unwrap_or(prefs.default_provider);

        // 1. Try preferred provider
        if let Some(provider) = providers.get(&to_try) {
            return Ok(Arc::clone(provider));
        }

        // 2. Try fallback chain
        if prefs.fallback_enabled {
            let fallback_order = self.fallback_order.read().await;
            for ptype in fallback_order.iter() {
                if let Some(provider) = providers.get(ptype) {
                    return Ok(Arc::clone(provider));
                }
            }
        }

        Err(ProviderError {
            code: "NO_PROVIDER_AVAILABLE".to_string(),
            message: "No LLM provider is available".to_string(),
            is_retryable: false,
        })
    }

    /// Estimate cost for a request with the given provider
    pub async fn estimate_cost(
        &self,
        provider_type: ProviderType,
        input_tokens: usize,
        output_tokens: usize,
    ) -> Option<f64> {
        let providers = self.providers.read().await;
        providers
            .get(&provider_type)
            .map(|p| p.estimate_cost(input_tokens, output_tokens))
    }

    /// Update user preferences
    pub async fn update_preferences(&self, prefs: UserPreferences) {
        let mut guard = self.user_preferences.write().await;
        *guard = prefs;
    }

    /// Get user preferences
    pub async fn get_preferences(&self) -> UserPreferences {
        self.user_preferences.read().await.clone()
    }
}

/// Information about a provider for UI display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub provider_type: ProviderType,
    pub name: String,
    pub available: bool,
    pub is_free: bool,
    pub capabilities: ProviderCapabilities,
}


#[cfg(test)]
mod tests {
    use super::*;

    struct MockProvider {
        ptype: ProviderType,
        name: &'static str,
    }

    #[async_trait]
    impl LlmProvider for MockProvider {
        fn provider_type(&self) -> ProviderType {
            self.ptype
        }

        fn name(&self) -> &str {
            self.name
        }

        async fn is_available(&self) -> bool {
            true
        }

        fn capabilities(&self) -> ProviderCapabilities {
            ProviderCapabilities {
                supports_vision: false,
                supports_streaming: true,
                supports_functions: false,
                max_context_tokens: 4096,
                max_output_tokens: 1024,
            }
        }

        async fn plan_task(&self, _request: PlanRequest) -> Result<LlmResult, ProviderError> {
            Ok(LlmResult { content: "[]".to_string(), input_tokens: 0, output_tokens: 0 })
        }

        async fn analyze_screen(
            &self,
            _request: ScreenAnalysisRequest,
        ) -> Result<LlmResult, ProviderError> {
            Ok(LlmResult { content: "{}".to_string(), input_tokens: 0, output_tokens: 0 })
        }

        async fn propose_next_step(
            &self,
            _request: ActionRequest,
        ) -> Result<LlmResult, ProviderError> {
            Ok(LlmResult { content: "{}".to_string(), input_tokens: 0, output_tokens: 0 })
        }

        async fn summarize_result(&self, _result_text: &str) -> Result<LlmResult, ProviderError> {
            Ok(LlmResult { content: "done".to_string(), input_tokens: 0, output_tokens: 0 })
        }

        fn estimate_cost(&self, _input_tokens: usize, _output_tokens: usize) -> f64 {
            0.0
        }
    }

    #[tokio::test]
    async fn test_route_returns_preferred_provider() {
        let router = ProviderRouter::new();
        let openai = Arc::new(MockProvider {
            ptype: ProviderType::OpenAi,
            name: "OpenAI",
        });
        let claude = Arc::new(MockProvider {
            ptype: ProviderType::Claude,
            name: "Claude",
        });
        router.register_provider(openai.clone()).await;
        router.register_provider(claude.clone()).await;

        let result = router.route(Some(ProviderType::OpenAi)).await.unwrap();
        assert_eq!(result.provider_type(), ProviderType::OpenAi);
        assert_eq!(result.name(), "OpenAI");
    }

    #[tokio::test]
    async fn test_route_fallback_when_preferred_missing() {
        let router = ProviderRouter::new();
        let claude = Arc::new(MockProvider {
            ptype: ProviderType::Claude,
            name: "Claude",
        });
        router.register_provider(claude.clone()).await;

        // OpenAI is not registered, so fallback chain should return Claude
        let result = router.route(Some(ProviderType::OpenAi)).await.unwrap();
        assert_eq!(result.provider_type(), ProviderType::Claude);
        assert_eq!(result.name(), "Claude");
    }

    #[tokio::test]
    async fn test_get_provider_returns_none_for_unregistered() {
        let router = ProviderRouter::new();
        let openai = Arc::new(MockProvider {
            ptype: ProviderType::OpenAi,
            name: "OpenAI",
        });
        router.register_provider(openai.clone()).await;

        assert!(router.get_provider(ProviderType::OpenAi).await.is_some());
        assert!(router.get_provider(ProviderType::Claude).await.is_none());
    }
}
