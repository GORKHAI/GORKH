use super::{
    AgentProposal, ClientConfig, ConversationTurnParams, ConversationTurnResult, LlmError,
    LlmErrorCode, LlmProvider, LlmUsageMetadata, ProposalParams, create_http_client,
    log_usage, Instant, LlmRequestPath,
};
use serde::{Deserialize, Serialize};

pub struct NativeOllamaProvider;

const OPEN_APP_PROMPT_HINT: &str = "Use open_app with {\"kind\":\"open_app\",\"appName\":\"Photoshop\"} when the next step is to launch a desktop app or browser by name.";

const CONVERSATION_INTAKE_PROMPT_RULES: &str = concat!(
    "do not start execution from the intake turn.\n",
    "ask clarifying questions when details are missing.\n",
    "Return either reply or confirm_task JSON.\n",
    "Before confirm_task, provide a plain-language summary in the form \"I will ...\" and ask \"Confirm?\".\n",
    "If the task includes opening an app or browser, mention it as open_app in the summary rather than starting execution.\n"
);

#[derive(Debug, Serialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: u32,
}

#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    options: OllamaOptions,
    #[serde(skip_serializing_if = "Option::is_none")]
    images: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
    /// Prompt evaluation count (input tokens)
    #[serde(skip_serializing_if = "Option::is_none")]
    prompt_eval_count: Option<u64>,
    /// Evaluation count (output/completion tokens)
    #[serde(skip_serializing_if = "Option::is_none")]
    eval_count: Option<u64>,
}

#[async_trait::async_trait]
impl LlmProvider for NativeOllamaProvider {
    async fn propose_next_action(
        &self,
        params: &ProposalParams,
    ) -> Result<AgentProposal, LlmError> {
        let start = Instant::now();
        let client = create_http_client(ClientConfig::local())?;

        let system_prompt = format!(
            "{}\n\n{}",
            super::build_system_prompt(
                &params.constraints,
                params.workspace_configured.unwrap_or(false),
                params.app_context.as_deref(),
            ),
            OPEN_APP_PROMPT_HINT
        );
        let user_prompt = super::build_user_prompt(
            &params.goal,
            params.screenshot_png_base64.as_deref(),
            &params.history,
            0,
        );
        let prompt = format!("{system_prompt}\n\n{user_prompt}");
        let clean_image = params.screenshot_png_base64.as_deref().map(|value| {
            value
                .strip_prefix("data:image/png;base64,")
                .unwrap_or(value)
                .to_string()
        });

        let request_body = OllamaRequest {
            model: params.model.clone(),
            prompt,
            stream: false,
            options: OllamaOptions {
                temperature: 0.2,
                num_predict: 1000,
            },
            images: clean_image.map(|image| vec![image]),
        };

        let mut request_builder = client
            .post(format!("{}/api/generate", params.base_url.trim_end_matches('/')))
            .header("Content-Type", "application/json");
        
        // Propagate correlation ID for cross-system tracing
        if let Some(ref correlation_id) = params.correlation_id {
            request_builder = request_builder.header("x-request-id", correlation_id);
        }
        
        let response = request_builder
            .json(&request_body)
            .send()
            .await
            .map_err(|e| {
                let code = super::classify_request_error(&e);
                let message = match code {
                    LlmErrorCode::Timeout => format!(
                        "Ollama at {} timed out ({}s). The model may be loading or the system is busy. Try again in a moment.",
                        params.base_url,
                        super::LOCAL_PROVIDER_TIMEOUT.as_secs()
                    ),
                    LlmErrorCode::ConnectionFailed => format!(
                        "Cannot connect to Ollama at {}. Start Ollama and ensure it is listening on that address.",
                        params.base_url
                    ),
                    _ => format!("Request to Ollama at {} failed: {}", params.base_url, e),
                };
                LlmError {
                    code,
                    message,
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            let message = if status.as_u16() == 404 {
                format!(
                    "Ollama could not find model '{}'. Run `ollama pull {}` and try again.",
                    params.model, params.model
                )
            } else {
                format!("Ollama error {}: {}", status, text)
            };

            return Err(LlmError {
                code: LlmErrorCode::OllamaError,
                message,
            });
        }

        let ollama_response: OllamaResponse = response.json().await.map_err(|e| LlmError {
            code: LlmErrorCode::ParseError,
            message: format!("Failed to parse Ollama response: {}", e),
        })?;

        let content = ollama_response.response;
        let proposal = super::parse_json_response::<AgentProposal>(&content, "proposal")?;

        // Track usage - Ollama returns prompt_eval_count and eval_count
        let duration_ms = start.elapsed().as_millis() as u64;
        let input_tokens = ollama_response.prompt_eval_count.unwrap_or(0) as usize;
        let output_tokens = ollama_response.eval_count.unwrap_or(0) as usize;
        let tokens_available = ollama_response.prompt_eval_count.is_some() || ollama_response.eval_count.is_some();
        let metadata = LlmUsageMetadata {
            provider: "native_ollama".to_string(),
            model: params.model.clone(),
            path: LlmRequestPath::Local,
            duration_ms,
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
            tokens_available,
            correlation_id: params.correlation_id.clone(),
        };
        log_usage(&metadata);

        Ok(proposal)
    }

    async fn conversation_turn(
        &self,
        params: &ConversationTurnParams,
    ) -> Result<ConversationTurnResult, LlmError> {
        let start = Instant::now();
        let client = create_http_client(ClientConfig::local())?;

        let system_prompt = format!(
            "{}\n\n{}",
            super::build_conversation_system_prompt(params.app_context.as_deref()),
            CONVERSATION_INTAKE_PROMPT_RULES
        );
        let user_prompt = super::build_conversation_user_prompt(&params.messages);
        let prompt = format!("{system_prompt}\n\n{user_prompt}");

        let request_body = OllamaRequest {
            model: params.model.clone(),
            prompt,
            stream: false,
            options: OllamaOptions {
                temperature: 0.2,
                num_predict: 600,
            },
            images: None,
        };

        let mut request_builder = client
            .post(format!("{}/api/generate", params.base_url.trim_end_matches('/')))
            .header("Content-Type", "application/json");
        
        // Propagate correlation ID for cross-system tracing
        if let Some(ref correlation_id) = params.correlation_id {
            request_builder = request_builder.header("x-request-id", correlation_id);
        }
        
        let response = request_builder
            .json(&request_body)
            .send()
            .await
            .map_err(|e| {
                let code = super::classify_request_error(&e);
                let message = match code {
                    LlmErrorCode::Timeout => format!(
                        "Ollama at {} timed out ({}s). The model may be loading or the system is busy. Try again in a moment.",
                        params.base_url,
                        super::LOCAL_PROVIDER_TIMEOUT.as_secs()
                    ),
                    LlmErrorCode::ConnectionFailed => format!(
                        "Cannot connect to Ollama at {}. Start Ollama and ensure it is listening on that address.",
                        params.base_url
                    ),
                    _ => format!("Request to Ollama at {} failed: {}", params.base_url, e),
                };
                LlmError {
                    code,
                    message,
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            let message = if status.as_u16() == 404 {
                format!(
                    "Ollama could not find model '{}'. Run `ollama pull {}` and try again.",
                    params.model, params.model
                )
            } else {
                format!("Ollama error {}: {}", status, text)
            };

            return Err(LlmError {
                code: LlmErrorCode::OllamaError,
                message,
            });
        }

        let ollama_response: OllamaResponse = response.json().await.map_err(|e| LlmError {
            code: LlmErrorCode::ParseError,
            message: format!("Failed to parse Ollama response: {}", e),
        })?;

        // Track usage - Ollama returns prompt_eval_count and eval_count
        let duration_ms = start.elapsed().as_millis() as u64;
        let input_tokens = ollama_response.prompt_eval_count.unwrap_or(0) as usize;
        let output_tokens = ollama_response.eval_count.unwrap_or(0) as usize;
        let tokens_available = ollama_response.prompt_eval_count.is_some() || ollama_response.eval_count.is_some();
        let metadata = LlmUsageMetadata {
            provider: "native_ollama".to_string(),
            model: params.model.clone(),
            path: LlmRequestPath::Local,
            duration_ms,
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
            tokens_available,
            correlation_id: params.correlation_id.clone(),
        };
        log_usage(&metadata);

        super::parse_conversation_turn_result(&ollama_response.response)
    }
}
