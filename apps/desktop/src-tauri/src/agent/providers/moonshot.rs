//! Moonshot (Kimi) API provider (OpenAI-compatible)
//!
//! Pricing as of 2025-04-26:
//! - kimi-k2-0905-preview: $0.50 / M input tokens, $2.00 / M output tokens

use super::*;

pub struct MoonshotProvider {
    client: super::openai_format::OpenAiFormatClient,
}

impl MoonshotProvider {
    pub fn new(api_key: String, base_url: Option<String>, model: Option<String>) -> Self {
        Self {
            client: super::openai_format::OpenAiFormatClient::new(
                api_key,
                base_url.unwrap_or_else(|| "https://api.moonshot.cn/v1".to_string()),
                model.unwrap_or_else(|| "kimi-k2-0905-preview".to_string()),
                60,
            ),
        }
    }
}

#[async_trait]
impl LlmProvider for MoonshotProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Moonshot
    }

    fn name(&self) -> &str {
        "Moonshot (Kimi)"
    }

    async fn is_available(&self) -> bool {
        self.client
            .chat_completion("You are a test.", "Say 'ok' only.", None)
            .await
            .is_ok()
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_vision: false, // Kimi K2 does not support vision as of 2025-04
            supports_streaming: true,
            supports_functions: true,
            max_context_tokens: 256000,
            max_output_tokens: 8192,
        }
    }

    async fn plan_task(&self, request: PlanRequest) -> Result<LlmResult, ProviderError> {
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
        Ok(LlmResult { content: response.content, input_tokens: response.input_tokens, output_tokens: response.output_tokens })
    }

    async fn analyze_screen(
        &self,
        _request: ScreenAnalysisRequest,
    ) -> Result<LlmResult, ProviderError> {
        Err(ProviderError {
            code: "VISION_NOT_SUPPORTED".to_string(),
            message: "Moonshot (Kimi) does not support vision".to_string(),
            is_retryable: false,
        })
    }

    async fn propose_next_step(&self, request: ActionRequest) -> Result<LlmResult, ProviderError> {
        let system = r#"Based on the current screen observation, propose the next action.

Output format: Return valid JSON with ONE action structure. Be precise about coordinates (normalized 0-1). Use open_app when the next step is to launch a desktop app or browser by name.

Available tools: fs.list, fs.read_text, fs.write_text, fs.apply_patch, fs.delete, fs.move_files, terminal.exec, system.empty_trash, system.get_clipboard, system.set_clipboard, app.get_state"#;

        let user = format!(
            "Goal: {}\n\nStep: {}\n\nScreen observation: {}\n\nWhat should I do next?",
            request.goal, request.step_description, request.observation
        );

        let response = self.client.chat_completion(system, &user, None).await?;
        Ok(LlmResult { content: response.content, input_tokens: response.input_tokens, output_tokens: response.output_tokens })
    }

    async fn summarize_result(&self, result_text: &str) -> Result<LlmResult, ProviderError> {
        let system = "Summarize the task result in 1-2 sentences.";
        let user = format!("Result:\n{}\n\nSummarize:", result_text);

        let response = self.client.chat_completion(system, &user, None).await?;
        Ok(LlmResult { content: response.content, input_tokens: response.input_tokens, output_tokens: response.output_tokens })
    }

    fn estimate_cost(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        // Moonshot Kimi K2 pricing as of 2025-04-26: $0.50/M input, $2.00/M output
        let input_cost = input_tokens as f64 / 1_000_000.0 * 0.50;
        let output_cost = output_tokens as f64 / 1_000_000.0 * 2.00;
        input_cost + output_cost
    }
}
