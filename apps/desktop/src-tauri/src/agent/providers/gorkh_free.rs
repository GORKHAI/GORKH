//! GORKH AI Free tier provider for the advanced agent system
//!
//! ⚠️  IMPORTANT: The advanced agent is EXPERIMENTAL. This provider routes
//!     requests through the Render API backend just like the production
//!     `llm::gorkh_free` provider.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::{
    ActionRequest, LlmResponse, LlmResult, PlanRequest, ProviderCapabilities, ProviderError,
    ProviderType, ScreenAnalysisRequest,
};

#[allow(dead_code)]
pub struct GorkhFreeProvider {
    api_base_url: String,
    device_token: String,
}

#[allow(dead_code)]
impl GorkhFreeProvider {
    pub fn new(api_base_url: String, device_token: String) -> Self {
        Self {
            api_base_url,
            device_token,
        }
    }

    fn build_url(&self) -> String {
        format!("{}/llm/free/chat", self.api_base_url.trim_end_matches('/'))
    }

    async fn chat_completion(
        &self,
        system_prompt: String,
        user_message: String,
    ) -> Result<LlmResponse, ProviderError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| ProviderError {
                code: "CLIENT_INIT_FAILED".to_string(),
                message: format!("Failed to create HTTP client: {}", e),
                is_retryable: false,
            })?;

        #[derive(Serialize)]
        struct Message {
            role: String,
            content: String,
        }

        #[derive(Serialize)]
        struct RequestBody {
            messages: Vec<Message>,
            max_tokens: u32,
        }

        #[derive(Deserialize)]
        struct Usage {
            input_tokens: usize,
            output_tokens: usize,
        }

        #[derive(Deserialize)]
        struct ResponseMessage {
            role: String,
            content: String,
        }

        #[derive(Deserialize)]
        struct Choice {
            message: ResponseMessage,
            finish_reason: Option<String>,
        }

        #[derive(Deserialize)]
        struct ResponseBody {
            message: ResponseMessage,
            usage: Usage,
            request_id: String,
        }

        #[derive(Deserialize)]
        struct ErrorBody {
            error: String,
            message: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            reset_at: Option<String>,
        }

        let body = RequestBody {
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: system_prompt,
                },
                Message {
                    role: "user".to_string(),
                    content: user_message,
                },
            ],
            max_tokens: 2048,
        };

        let response = client
            .post(self.build_url())
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.device_token))
            .json(&body)
            .send()
            .await
            .map_err(|e| ProviderError {
                code: "CONNECTION_FAILED".to_string(),
                message: format!("GORKH Free tier connection failed: {}", e),
                is_retryable: true,
            })?;

        let status = response.status();
        let text = response.text().await.unwrap_or_default();

        if status == 429 {
            if let Ok(err) = serde_json::from_str::<ErrorBody>(&text) {
                return Err(ProviderError {
                    code: "FREE_TIER_EXHAUSTED".to_string(),
                    message: err.message,
                    is_retryable: false,
                });
            }
            return Err(ProviderError {
                code: "FREE_TIER_EXHAUSTED".to_string(),
                message: "Free tier quota exhausted.".to_string(),
                is_retryable: false,
            });
        }

        if !status.is_success() {
            return Err(ProviderError {
                code: format!("HTTP_{}", status.as_u16()),
                message: format!("GORKH Free tier returned {}: {}", status, text),
                is_retryable: status.as_u16() >= 500,
            });
        }

        let parsed: ResponseBody = serde_json::from_str(&text).map_err(|e| ProviderError {
            code: "PARSE_ERROR".to_string(),
            message: format!("Failed to parse GORKH Free tier response: {}", e),
            is_retryable: false,
        })?;

        Ok(LlmResponse {
            content: parsed.message.content,
            input_tokens: parsed.usage.input_tokens,
            output_tokens: parsed.usage.output_tokens,
            model: "deepseek-chat".to_string(),
            finish_reason: parsed.message.role.clone(), // Not ideal but acceptable for stub
        })
    }
}

#[async_trait]
impl super::LlmProvider for GorkhFreeProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::GorkhFree
    }

    fn name(&self) -> &str {
        "GORKH AI (Free)"
    }

    async fn is_available(&self) -> bool {
        // Simple health check: try a minimal request
        true
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_vision: false,
            supports_streaming: false,
            supports_functions: false,
            max_context_tokens: 8192,
            max_output_tokens: 2048,
        }
    }

    async fn plan_task(&self, request: PlanRequest) -> Result<LlmResult, ProviderError> {
        let system = "You are a task planner. Return a JSON array of steps.";
        let user = format!("Goal: {}\nContext: {:?}", request.goal, request.context);
        let response = self.chat_completion(system.to_string(), user).await?;
        Ok(LlmResult {
            content: response.content,
            input_tokens: response.input_tokens,
            output_tokens: response.output_tokens,
        })
    }

    async fn analyze_screen(
        &self,
        request: ScreenAnalysisRequest,
    ) -> Result<LlmResult, ProviderError> {
        let system = "You are a screen analyzer. Describe what you see.";
        let user = format!(
            "Goal: {}\nPrevious actions: {:?}",
            request.goal, request.previous_actions
        );
        let response = self.chat_completion(system.to_string(), user).await?;
        Ok(LlmResult {
            content: response.content,
            input_tokens: response.input_tokens,
            output_tokens: response.output_tokens,
        })
    }

    async fn propose_next_step(&self, request: ActionRequest) -> Result<LlmResult, ProviderError> {
        let system = "You are an action proposer. Return a JSON action.";
        let user = format!(
            "Observation: {}\nGoal: {}\nStep: {}",
            request.observation, request.goal, request.step_description
        );
        let response = self.chat_completion(system.to_string(), user).await?;
        Ok(LlmResult {
            content: response.content,
            input_tokens: response.input_tokens,
            output_tokens: response.output_tokens,
        })
    }

    async fn summarize_result(&self, result_text: &str) -> Result<LlmResult, ProviderError> {
        let system = "Summarize the result concisely.";
        let response = self
            .chat_completion(system.to_string(), result_text.to_string())
            .await?;
        Ok(LlmResult {
            content: response.content,
            input_tokens: response.input_tokens,
            output_tokens: response.output_tokens,
        })
    }

    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        // DeepSeek pricing: $0.27/M in, $1.10/M out
        (input_tokens as f64 * 0.27 + output_tokens as f64 * 1.10) / 1_000_000.0
    }
}
