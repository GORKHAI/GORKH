//! DeepSeek API provider (OpenAI-compatible)
//!
//! Pricing as of 2025-04-26:
//! - deepseek-chat: $0.14 / M input tokens, $0.28 / M output tokens

use super::*;

pub struct DeepSeekProvider {
    client: super::openai_format::OpenAiFormatClient,
}

impl DeepSeekProvider {
    pub fn new(api_key: String, base_url: Option<String>, model: Option<String>) -> Self {
        Self {
            client: super::openai_format::OpenAiFormatClient::new(
                api_key,
                base_url.unwrap_or_else(|| "https://api.deepseek.com/v1".to_string()),
                model.unwrap_or_else(|| "deepseek-chat".to_string()),
                60,
            ),
        }
    }
}

#[async_trait]
impl LlmProvider for DeepSeekProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::DeepSeek
    }

    fn name(&self) -> &str {
        "DeepSeek"
    }

    async fn is_available(&self) -> bool {
        self.client
            .chat_completion("You are a test.", "Say 'ok' only.", None)
            .await
            .is_ok()
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_vision: false, // DeepSeek does not support vision as of 2025-04
            supports_streaming: true,
            supports_functions: true,
            max_context_tokens: 64000,
            max_output_tokens: 4096,
        }
    }

    async fn plan_task(&self, request: PlanRequest) -> Result<String, ProviderError> {
        let system = r#"You are a computer automation agent. Break down the user's goal into a step-by-step plan.

Output format: Return a JSON array of steps, where each step has:
- id: unique step identifier
- title: brief description
- description: detailed description
- type: one of ["ui_action", "tool", "ask_user", "verification"]

Rules:
- Be specific about UI actions
- Use "tool" type for file operations or terminal commands
- Use open_app when the task requires launching a desktop app or browser by name
- Use "ask_user" when you need clarification
- Keep steps atomic (one action per step)"#;

        let user = format!(
            "Goal: {}\n\nContext: {}\n\nCreate a detailed plan:",
            request.goal,
            request.context.as_deref().unwrap_or("None")
        );

        let response = self.client.chat_completion(system, &user, None).await?;
        Ok(response.content)
    }

    async fn analyze_screen(
        &self,
        _request: ScreenAnalysisRequest,
    ) -> Result<String, ProviderError> {
        Err(ProviderError {
            code: "VISION_NOT_SUPPORTED".to_string(),
            message: "DeepSeek does not support vision".to_string(),
            is_retryable: false,
        })
    }

    async fn propose_next_step(&self, request: ActionRequest) -> Result<String, ProviderError> {
        let system = r#"Based on the current screen observation, propose the next action.

Output format: Return valid JSON with ONE action structure. Be precise about coordinates (normalized 0-1). Use open_app when the next step is to launch a desktop app or browser by name."#;

        let user = format!(
            "Goal: {}\n\nStep: {}\n\nScreen observation: {}\n\nWhat should I do next?",
            request.goal, request.step_description, request.observation
        );

        let response = self.client.chat_completion(system, &user, None).await?;
        Ok(response.content)
    }

    async fn summarize_result(&self, result_text: &str) -> Result<String, ProviderError> {
        let system = "Summarize the task result in 1-2 sentences.";
        let user = format!("Result:\n{}\n\nSummarize:", result_text);

        let response = self.client.chat_completion(system, &user, None).await?;
        Ok(response.content)
    }

    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        // DeepSeek pricing as of 2025-04-26: $0.14/M input, $0.28/M output
        let input_cost = input_tokens as f64 / 1_000_000.0 * 0.14;
        let output_cost = output_tokens as f64 / 1_000_000.0 * 0.28;
        input_cost + output_cost
    }
}
