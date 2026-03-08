# Multi-Provider LLM Architecture

## Overview

A unified LLM provider system that supports:
- **Native Model** (Your own) - Free, runs locally, specialized for PC automation
- **Cloud Providers** - Paid options (Claude, OpenAI, Google, etc.)
- **Easy Provider Switching** - User selects in UI

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Agent Core                               │
│                    (Provider Agnostic)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Task      │  │   Vision    │  │  Planning   │             │
│  │   Executor  │  │   Engine    │  │   Engine    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │ LLM Provider │                               │
│                   │   Router     │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│     ┌────────────────────┼────────────────────┐                │
│     │                    │                    │                │
│  ┌──▼───┐  ┌────────┐  ┌─▼────┐  ┌────────┐  │                │
│  │Native│  │Claude  │  │OpenAI│  │ Google │  │  ...more       │
│  │Model │  │  API   │  │  API │  │  API   │  │                │
│  └──┬───┘  └───┬────┘  └──┬───┘  └───┬────┘  │                │
│     │          │          │          │       │                │
│  Local      Cloud      Cloud      Cloud       │                │
│  (Free)     (Paid)     (Paid)     (Paid)      │                │
└─────────────────────────────────────────────────────────────────┘
```

## Provider Interface

```rust
// llm/mod.rs
pub mod providers;
pub mod router;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// Provider name
    fn name(&self) -> &str;
    
    /// Provider type
    fn provider_type(&self) -> ProviderType;
    
    /// Check if available (local model loaded, API key valid, etc.)
    async fn is_available(&self) -> bool;
    
    /// Get capabilities
    fn capabilities(&self) -> ProviderCapabilities;
    
    /// Send completion request
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError>;
    
    /// Send vision request (screenshot analysis)
    async fn vision(&self, request: VisionRequest) -> Result<VisionResponse, LlmError>;
    
    /// Stream completion (for real-time responses)
    async fn complete_stream(&self, request: CompletionRequest) -> Result<BoxStream<'static, Result<String, LlmError>>, LlmError>;
    
    /// Get estimated cost for request (for paid providers)
    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> Option<f64>;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProviderType {
    Native,      // Your local model
    OpenAi,      // GPT-4, GPT-4V
    Anthropic,   // Claude 3/3.5
    Google,      // Gemini
    Groq,        // Fast inference
    Together,    // Together AI
    Fireworks,   // Fireworks AI
    Ollama,      // Local via Ollama
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub supports_vision: bool,
    pub supports_streaming: bool,
    pub supports_functions: bool,
    pub max_context_tokens: usize,
    pub max_output_tokens: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub system_prompt: String,
    pub user_prompt: String,
    pub temperature: f32,
    pub max_tokens: usize,
    pub stop_sequences: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub input_tokens: usize,
    pub output_tokens: usize,
    pub model: String,
    pub finish_reason: String,
    pub cost: Option<f64>, // USD
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionRequest {
    pub system_prompt: String,
    pub user_prompt: String,
    pub image: Vec<u8>, // PNG/JPEG bytes
    pub temperature: f32,
    pub max_tokens: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionResponse {
    pub content: String,
    pub input_tokens: usize,
    pub output_tokens: usize,
    pub model: String,
    pub cost: Option<f64>,
}

#[derive(Debug, thiserror::Error)]
pub enum LlmError {
    #[error("Provider not available: {0}")]
    NotAvailable(String),
    #[error("API error: {0}")]
    Api(String),
    #[error("Rate limited")]
    RateLimited,
    #[error("Context too long")]
    ContextTooLong,
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Network error: {0}")]
    Network(String),
}
```

## Provider Implementations

### 1. Native Model Provider (Your Own)

```rust
// llm/providers/native.rs
use super::*;

pub struct NativeProvider {
    model_path: String,
    llama_cpp_path: String,
    process: Option<std::process::Child>,
    client: reqwest::Client,
    endpoint: String,
}

impl NativeProvider {
    pub async fn new(model_path: &str) -> Result<Self, LlmError> {
        let provider = Self {
            model_path: model_path.to_string(),
            llama_cpp_path: "./llama.cpp/server".to_string(),
            process: None,
            client: reqwest::Client::new(),
            endpoint: "http://localhost:8080".to_string(),
        };
        
        // Start the local server
        provider.start_server().await?;
        
        Ok(provider)
    }
    
    async fn start_server(&self) -> Result<(), LlmError> {
        let process = std::process::Command::new(&self.llama_cpp_path)
            .args(&[
                "-m", &self.model_path,
                "--port", "8080",
                "-c", "32768", // context size
                "-ngl", "999", // offload all layers to GPU
                "--embedding",
            ])
            .spawn()
            .map_err(|e| LlmError::NotAvailable(format!("Failed to start server: {}", e)))?;
        
        // Wait for server to be ready
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        
        Ok(())
    }
}

#[async_trait]
impl LlmProvider for NativeProvider {
    fn name(&self) -> &str {
        "AI Operator Native"
    }
    
    fn provider_type(&self) -> ProviderType {
        ProviderType::Native
    }
    
    async fn is_available(&self) -> bool {
        // Check if server is running
        match self.client.get(&format!("{}/health", self.endpoint)).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }
    
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_vision: true,  // Native model supports vision
            supports_streaming: true,
            supports_functions: true,
            max_context_tokens: 32768,
            max_output_tokens: 4096,
        }
    }
    
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        let body = json!({
            "prompt": format!("<|system|>{}<|user|>{}<|assistant|>", 
                request.system_prompt, request.user_prompt),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stop": request.stop_sequences,
        });
        
        let resp = self.client
            .post(format!("{}/completion", self.endpoint))
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Network(e.to_string()))?;
        
        let result: serde_json::Value = resp.json().await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;
        
        Ok(CompletionResponse {
            content: result["content"].as_str().unwrap_or("").to_string(),
            input_tokens: result["tokens_evaluated"].as_u64().unwrap_or(0) as usize,
            output_tokens: result["tokens_predicted"].as_u64().unwrap_or(0) as usize,
            model: "native-v1".to_string(),
            finish_reason: result["stop_type"].as_str().unwrap_or("stop").to_string(),
            cost: Some(0.0), // Free!
        })
    }
    
    async fn vision(&self, request: VisionRequest) -> Result<VisionResponse, LlmError> {
        // Native model with vision support
        let base64_image = base64::encode(&request.image);
        
        let prompt = format!(
            "<|system|>{}<|user|><|image|>{}<|assistant|>",
            request.system_prompt, request.user_prompt
        );
        
        let body = json!({
            "prompt": prompt,
            "image_data": [{"data": base64_image}],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        });
        
        let resp = self.client
            .post(format!("{}/completion", self.endpoint))
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Network(e.to_string()))?;
        
        let result: serde_json::Value = resp.json().await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;
        
        Ok(VisionResponse {
            content: result["content"].as_str().unwrap_or("").to_string(),
            input_tokens: result["tokens_evaluated"].as_u64().unwrap_or(0) as usize,
            output_tokens: result["tokens_predicted"].as_u64().unwrap_or(0) as usize,
            model: "native-v1-vision".to_string(),
            cost: Some(0.0), // Free!
        })
    }
    
    async fn complete_stream(&self, request: CompletionRequest) -> Result<BoxStream<'static, Result<String, LlmError>>, LlmError> {
        // Implementation for streaming
        todo!()
    }
    
    fn estimate_cost(&self, _input_tokens: usize, _output_tokens: usize) -> Option<f64> {
        Some(0.0) // Always free
    }
}
```

### 2. Claude Provider

```rust
// llm/providers/anthropic.rs
use super::*;

pub struct ClaudeProvider {
    api_key: String,
    client: reqwest::Client,
    model: String, // claude-3-5-sonnet-20241022, claude-3-opus-20240229
}

impl ClaudeProvider {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            client: reqwest::Client::new(),
            model: "claude-3-5-sonnet-20241022".to_string(),
        }
    }
}

#[async_trait]
impl LlmProvider for ClaudeProvider {
    fn name(&self) -> &str {
        "Claude 3.5 Sonnet"
    }
    
    fn provider_type(&self) -> ProviderType {
        ProviderType::Anthropic
    }
    
    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_vision: true,
            supports_streaming: true,
            supports_functions: true,
            max_context_tokens: 200000,
            max_output_tokens: 8192,
        }
    }
    
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        let body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "system": request.system_prompt,
            "messages": [
                {"role": "user", "content": request.user_prompt}
            ],
        });
        
        let resp = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Network(e.to_string()))?;
        
        if resp.status().as_u16() == 429 {
            return Err(LlmError::RateLimited);
        }
        
        let result: serde_json::Value = resp.json().await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;
        
        let input_tokens = result["usage"]["input_tokens"].as_u64().unwrap_or(0) as usize;
        let output_tokens = result["usage"]["output_tokens"].as_u64().unwrap_or(0) as usize;
        let cost = self.calculate_cost(input_tokens, output_tokens);
        
        Ok(CompletionResponse {
            content: result["content"][0]["text"].as_str().unwrap_or("").to_string(),
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            finish_reason: result["stop_reason"].as_str().unwrap_or("stop").to_string(),
            cost: Some(cost),
        })
    }
    
    async fn vision(&self, request: VisionRequest) -> Result<VisionResponse, LlmError> {
        let base64_image = base64::encode(&request.image);
        
        let body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "system": request.system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": request.user_prompt
                        }
                    ]
                }
            ],
        });
        
        let resp = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Network(e.to_string()))?;
        
        let result: serde_json::Value = resp.json().await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;
        
        let input_tokens = result["usage"]["input_tokens"].as_u64().unwrap_or(0) as usize;
        let output_tokens = result["usage"]["output_tokens"].as_u64().unwrap_or(0) as usize;
        let cost = self.calculate_cost(input_tokens, output_tokens);
        
        Ok(VisionResponse {
            content: result["content"][0]["text"].as_str().unwrap_or("").to_string(),
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            cost: Some(cost),
        })
    }
    
    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> Option<f64> {
        Some(self.calculate_cost(input_tokens, output_tokens))
    }
    
    fn calculate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        // Claude 3.5 Sonnet pricing (per 1M tokens)
        let input_price = 3.0;  // $3 per 1M input tokens
        let output_price = 15.0; // $15 per 1M output tokens
        
        (input_tokens as f64 / 1_000_000.0 * input_price) +
        (output_tokens as f64 / 1_000_000.0 * output_price)
    }
}
```

### 3. OpenAI Provider

```rust
// llm/providers/openai.rs
use super::*;

pub struct OpenAiProvider {
    api_key: String,
    client: reqwest::Client,
    model: String, // gpt-4o, gpt-4o-mini, gpt-4-turbo
}

impl OpenAiProvider {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            client: reqwest::Client::new(),
            model: "gpt-4o".to_string(),
        }
    }
}

#[async_trait]
impl LlmProvider for OpenAiProvider {
    fn name(&self) -> &str {
        "GPT-4o"
    }
    
    fn provider_type(&self) -> ProviderType {
        ProviderType::OpenAi
    }
    
    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_vision: true,
            supports_streaming: true,
            supports_functions: true,
            max_context_tokens: 128000,
            max_output_tokens: 4096,
        }
    }
    
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, LlmError> {
        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_prompt}
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stop": request.stop_sequences,
        });
        
        let resp = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Network(e.to_string()))?;
        
        let result: serde_json::Value = resp.json().await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;
        
        let input_tokens = result["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as usize;
        let output_tokens = result["usage"]["completion_tokens"].as_u64().unwrap_or(0) as usize;
        
        Ok(CompletionResponse {
            content: result["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string(),
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            finish_reason: result["choices"][0]["finish_reason"].as_str().unwrap_or("stop").to_string(),
            cost: Some(self.calculate_cost(input_tokens, output_tokens)),
        })
    }
    
    async fn vision(&self, request: VisionRequest) -> Result<VisionResponse, LlmError> {
        let base64_image = base64::encode(&request.image);
        
        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": request.user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:image/png;base64,{", base64_image),
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        });
        
        let resp = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Network(e.to_string()))?;
        
        let result: serde_json::Value = resp.json().await
            .map_err(|e| LlmError::InvalidResponse(e.to_string()))?;
        
        let input_tokens = result["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as usize;
        let output_tokens = result["usage"]["completion_tokens"].as_u64().unwrap_or(0) as usize;
        
        Ok(VisionResponse {
            content: result["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string(),
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            cost: Some(self.calculate_cost(input_tokens, output_tokens)),
        })
    }
    
    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> Option<f64> {
        Some(self.calculate_cost(input_tokens, output_tokens))
    }
    
    fn calculate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        // GPT-4o pricing
        let input_price = 5.0;   // $5 per 1M input tokens
        let output_price = 15.0; // $15 per 1M output tokens
        
        (input_tokens as f64 / 1_000_000.0 * input_price) +
        (output_tokens as f64 / 1_000_000.0 * output_price)
    }
}
```

### 4. Google Gemini Provider

```rust
// llm/providers/google.rs
pub struct GeminiProvider {
    api_key: String,
    client: reqwest::Client,
    model: String, // gemini-1.5-pro, gemini-1.5-flash
}

// Similar structure to Claude/OpenAI...
```

## Provider Router

```rust
// llm/router.rs
use std::collections::HashMap;
use tokio::sync::RwLock;

pub struct ProviderRouter {
    providers: RwLock<HashMap<ProviderType, Box<dyn LlmProvider>>>,
    default_provider: RwLock<ProviderType>,
    user_preferences: RwLock<UserPreferences>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub default_provider: ProviderType,
    pub api_keys: HashMap<ProviderType, String>,
    pub cost_limit_per_task: Option<f64>,
    pub always_ask_on_paid: bool,
}

impl ProviderRouter {
    pub fn new() -> Self {
        Self {
            providers: RwLock::new(HashMap::new()),
            default_provider: RwLock::new(ProviderType::Native),
            user_preferences: RwLock::new(UserPreferences {
                default_provider: ProviderType::Native,
                api_keys: HashMap::new(),
                cost_limit_per_task: Some(1.0), // $1 default limit
                always_ask_on_paid: true,
            }),
        }
    }
    
    pub async fn register_provider(&self, provider: Box<dyn LlmProvider>) {
        let mut providers = self.providers.write().await;
        providers.insert(provider.provider_type(), provider);
    }
    
    pub async fn get_provider(&self, provider_type: ProviderType) -> Option<Box<dyn LlmProvider>> {
        let providers = self.providers.read().await;
        providers.get(&provider_type).map(|p| 
            // Clone/create new instance - in practice use Arc
            todo!()
        )
    }
    
    pub async fn get_default_provider(&self) -> Option<Box<dyn LlmProvider>> {
        let default = self.default_provider.read().await;
        self.get_provider(*default).await
    }
    
    pub async fn set_default_provider(&self, provider_type: ProviderType) {
        let mut default = self.default_provider.write().await;
        *default = provider_type;
    }
    
    pub async fn list_available_providers(&self) -> Vec<ProviderInfo> {
        let providers = self.providers.read().await;
        let mut info = Vec::new();
        
        for (ptype, provider) in providers.iter() {
            info.push(ProviderInfo {
                provider_type: *ptype,
                name: provider.name().to_string(),
                available: provider.is_available().await,
                capabilities: provider.capabilities(),
                is_free: provider.estimate_cost(1000, 500).map(|c| c == 0.0).unwrap_or(false),
            });
        }
        
        info
    }
    
    /// Smart routing based on task complexity and cost
    pub async fn route_request(&self, request: &CompletionRequest) -> Result<Box<dyn LlmProvider>, LlmError> {
        let prefs = self.user_preferences.read().await;
        let providers = self.providers.read().await;
        
        // Always prefer native model if available (it's free)
        if let Some(native) = providers.get(&ProviderType::Native) {
            if native.is_available().await {
                return Ok(native); // Return cloned/arc
            }
        }
        
        // Fall back to user's preferred provider
        if let Some(preferred) = providers.get(&prefs.default_provider) {
            if preferred.is_available().await {
                // Check cost limits
                if prefs.always_ask_on_paid && preferred.provider_type() != ProviderType::Native {
                    // This should trigger UI prompt for approval
                }
                return Ok(preferred);
            }
        }
        
        Err(LlmError::NotAvailable("No providers available".to_string()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub provider_type: ProviderType,
    pub name: String,
    pub available: bool,
    pub capabilities: ProviderCapabilities,
    pub is_free: bool,
}
```

## Settings UI

```rust
// Tauri commands

#[tauri::command]
pub async fn list_providers(
    router: State<'_, ProviderRouter>,
) -> Result<Vec<ProviderInfo>, String> {
    router.list_available_providers().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_provider_api_key(
    router: State<'_, ProviderRouter>,
    provider: ProviderType,
    api_key: String,
) -> Result<(), String> {
    // Update stored API key
    // Re-initialize provider with new key
    Ok(())
}

#[tauri::command]
pub async fn set_default_provider(
    router: State<'_, ProviderRouter>,
    provider: ProviderType,
) -> Result<(), String> {
    router.set_default_provider(provider).await;
    Ok(())
}

#[tauri::command]
pub async fn test_provider(
    router: State<'_, ProviderRouter>,
    provider: ProviderType,
) -> Result<bool, String> {
    if let Some(provider) = router.get_provider(provider).await {
        Ok(provider.is_available().await)
    } else {
        Ok(false)
    }
}
```

## Usage in Agent

```rust
impl ComputerAgent {
    pub async fn analyze_screen(&self, screenshot: &[u8]) -> Result<ScreenAnalysis, AgentError> {
        // Router automatically picks best available provider
        let provider = self.llm_router.route_request(&self.vision_prompt).await?;
        
        let request = VisionRequest {
            system_prompt: VISION_SYSTEM_PROMPT.to_string(),
            user_prompt: "Analyze this screenshot".to_string(),
            image: screenshot.to_vec(),
            temperature: 0.2,
            max_tokens: 2048,
        };
        
        let response = provider.vision(request).await?;
        
        // Track cost if paid provider
        if let Some(cost) = response.cost {
            if cost > 0.0 {
                self.track_usage(cost).await?;
            }
        }
        
        parse_screen_analysis(&response.content)
    }
}
```

This architecture gives you:
1. **Your own native model** as the free default
2. **Multiple paid options** (Claude, OpenAI, Google)
3. **Easy switching** via UI
4. **Cost tracking** for paid providers
5. **Fallback logic** (native → preferred → any available)
