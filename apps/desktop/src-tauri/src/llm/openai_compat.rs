use super::{
    AgentProposal, ClientConfig, ConversationTurnParams, ConversationTurnResult, LlmError,
    LlmErrorCode, LlmProvider, LlmUsageMetadata, ProposalParams, create_http_client, classify_request_error,
    classify_request_path, log_usage, Instant,
};
use serde::{Deserialize, Serialize};

pub struct OpenAiCompatProvider;

const OPEN_APP_PROMPT_HINT: &str = "Use open_app with {\"kind\":\"open_app\",\"appName\":\"Photoshop\"} when the next step is to launch a desktop app or browser by name.";

const CONVERSATION_INTAKE_PROMPT_RULES: &str = concat!(
    "do not start execution from the intake turn.\n",
    "ask clarifying questions when details are missing.\n",
    "Return either reply or confirm_task JSON.\n",
    "For confirm_task JSON, set summary to a plain-language sentence starting with \"I will ...\" and set prompt to a direct confirmation request ending with \"Confirm?\".\n",
    "If the task includes opening an app or browser, mention it as open_app in the summary rather than starting execution.\n"
);

#[derive(Debug, Serialize)]
struct OpenAiCompatMessage {
    role: String,
    content: Vec<OpenAiCompatContent>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum OpenAiCompatContent {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

#[derive(Debug, Serialize)]
struct ImageUrl {
    url: String,
}

#[derive(Debug, Serialize)]
struct OpenAiCompatRequest {
    model: String,
    messages: Vec<OpenAiCompatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatResponse {
    choices: Vec<OpenAiCompatChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    usage: Option<OpenAiCompatUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatUsage {
    prompt_tokens: u64,
    completion_tokens: u64,
    total_tokens: u64,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatChoice {
    message: OpenAiCompatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiCompatResponseMessage {
    content: String,
}

fn is_localhost_url(url: &str) -> bool {
    let lower = url.trim().to_lowercase();
    lower.starts_with("http://localhost")
        || lower.starts_with("https://localhost")
        || lower.starts_with("http://127.")
        || lower.starts_with("https://127.")
        || lower.starts_with("http://[::1]")
        || lower.starts_with("https://[::1]")
}

#[async_trait::async_trait]
impl LlmProvider for OpenAiCompatProvider {
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

        // Build messages
        let mut messages = vec![OpenAiCompatMessage {
            role: "system".to_string(),
            content: vec![OpenAiCompatContent::Text {
                text: system_prompt,
            }],
        }];

        // Add user message with text and optionally image
        let mut user_content = vec![OpenAiCompatContent::Text { text: user_prompt }];

        // If we have a screenshot, add it as an image
        if let Some(screenshot_b64) = &params.screenshot_png_base64 {
            // Ensure the base64 doesn't include data URI prefix
            let clean_b64 = screenshot_b64
                .strip_prefix("data:image/png;base64,")
                .unwrap_or(screenshot_b64);

            user_content.push(OpenAiCompatContent::ImageUrl {
                image_url: ImageUrl {
                    url: format!("data:image/png;base64,{}", clean_b64),
                },
            });
        }

        messages.push(OpenAiCompatMessage {
            role: "user".to_string(),
            content: user_content,
        });

        let request_body = OpenAiCompatRequest {
            model: params.model.clone(),
            messages,
            max_tokens: Some(1000),
        };

        let url = super::build_openai_chat_completions_url(&params.base_url);
        let location = if is_localhost_url(&url) {
            "local LLM server"
        } else {
            "remote provider"
        };

        let mut request_builder = client.post(&url).header("Content-Type", "application/json");

        // Only add Authorization header if API key is provided and non-empty
        // For local servers, the key is typically not required
        if !params.api_key.is_empty() {
            request_builder =
                request_builder.header("Authorization", format!("Bearer {}", params.api_key));
        }

        // Propagate correlation ID for cross-system tracing
        if let Some(ref correlation_id) = params.correlation_id {
            request_builder = request_builder.header("x-request-id", correlation_id);
        }

        let response = request_builder
            .json(&request_body)
            .send()
            .await
            .map_err(|e| {
                let code = classify_request_error(&e);
                let message = match code {
                    LlmErrorCode::Timeout => format!(
                        "{} timed out after {} seconds. The server may be overloaded or slow to respond.",
                        location,
                        super::LOCAL_PROVIDER_TIMEOUT.as_secs()
                    ),
                    LlmErrorCode::ConnectionFailed => format!("Cannot connect to {}. Check that the server is running.", location),
                    _ => format!("Request to {} failed: {}", location, e),
                };
                LlmError {
                    code,
                    message,
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();

            // Provide helpful error messages for common issues
            let code = match status.as_u16() {
                404 => LlmErrorCode::ModelNotFound,
                401 => LlmErrorCode::AuthFailed,
                429 => LlmErrorCode::RateLimited,
                502 => LlmErrorCode::FreeAiFallbackUpstreamError,
                503 => LlmErrorCode::FreeAiFallbackUnavailable,
                _ => LlmErrorCode::ApiError,
            };
            let message = if status.as_u16() == 404 {
                format!("{} returned 404. Ensure the server supports OpenAI-compatible endpoints at /v1/chat/completions. Error: {}", location, text)
            } else if status.as_u16() == 401 {
                format!("{} requires authentication. If your server needs an API key, enter it above.", location)
            } else {
                format!("{} error {}: {}", location, status, text)
            };

            return Err(LlmError {
                code,
                message,
            });
        }

        let compat_response: OpenAiCompatResponse =
            response.json().await.map_err(|e| LlmError {
                code: LlmErrorCode::ParseError,
                message: format!("Failed to parse response from {}: {}", location, e),
            })?;

        let content = compat_response
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| LlmError {
                code: LlmErrorCode::EmptyResponse,
                message: format!("No response from {}", location),
            })?;

        // Parse the JSON response
        let proposal = super::parse_json_response::<AgentProposal>(&content, "proposal")?;

        // Track usage - OpenAI-compatible APIs may return usage data
        let duration_ms = start.elapsed().as_millis() as u64;
        let usage = compat_response.usage;
        let metadata = LlmUsageMetadata {
            provider: "openai_compat".to_string(),
            model: params.model.clone(),
            path: classify_request_path(&params.base_url),
            duration_ms,
            input_tokens: usage.as_ref().map(|u| u.prompt_tokens as usize).unwrap_or(0),
            output_tokens: usage.as_ref().map(|u| u.completion_tokens as usize).unwrap_or(0),
            total_tokens: usage.as_ref().map(|u| u.total_tokens as usize).unwrap_or(0),
            tokens_available: usage.is_some(),
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
        let request_body = OpenAiCompatRequest {
            model: params.model.clone(),
            messages: vec![
                OpenAiCompatMessage {
                    role: "system".to_string(),
                    content: vec![OpenAiCompatContent::Text {
                        text: system_prompt,
                    }],
                },
                OpenAiCompatMessage {
                    role: "user".to_string(),
                    content: vec![OpenAiCompatContent::Text { text: user_prompt }],
                },
            ],
            max_tokens: Some(600),
        };

        let url = super::build_openai_chat_completions_url(&params.base_url);
        let is_remote = !is_localhost_url(&url);
        let location = if is_remote { "remote provider" } else { "local LLM server" };

        // For remote hosts (e.g. hosted fallback on Render) retry on connection failure
        // to handle cold-start delays. Local servers fail fast without retry.
        const MAX_REMOTE_RETRIES: u32 = 2;
        const REMOTE_RETRY_DELAY_SECS: u64 = 5;

        let mut last_err: Option<LlmError> = None;
        let mut response_opt: Option<reqwest::Response> = None;

        let max_attempts = if is_remote { MAX_REMOTE_RETRIES + 1 } else { 1 };
        for attempt in 0..max_attempts {
            if attempt > 0 {
                tokio::time::sleep(std::time::Duration::from_secs(REMOTE_RETRY_DELAY_SECS)).await;
            }
            let mut rb = client.post(&url).header("Content-Type", "application/json");
            if !params.api_key.is_empty() {
                rb = rb.header("Authorization", format!("Bearer {}", params.api_key));
            }
            // Propagate correlation ID for cross-system tracing
            if let Some(ref correlation_id) = params.correlation_id {
                rb = rb.header("x-request-id", correlation_id);
            }
            match rb.json(&request_body).send().await {
                Ok(r) => {
                    response_opt = Some(r);
                    last_err = None;
                    break;
                }
                Err(e) => {
                    let is_retryable = is_remote && (e.is_connect() || e.is_timeout());
                    let code = classify_request_error(&e);
                    let message = match code {
                        LlmErrorCode::Timeout => format!("{} timed out. The server may be overloaded.", location),
                        LlmErrorCode::ConnectionFailed => format!("Cannot connect to {}.", location),
                        _ => format!("Request to {} failed: {}", location, e),
                    };
                    last_err = Some(LlmError {
                        code,
                        message,
                    });
                    if !is_retryable {
                        break;
                    }
                }
            }
        }

        let response = match response_opt {
            Some(r) => r,
            None => return Err(last_err.unwrap()),
        };

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            let code = match status.as_u16() {
                404 => LlmErrorCode::ModelNotFound,
                401 => LlmErrorCode::AuthFailed,
                429 => LlmErrorCode::RateLimited,
                502 => LlmErrorCode::FreeAiFallbackUpstreamError,
                503 => LlmErrorCode::FreeAiFallbackUnavailable,
                _ => LlmErrorCode::ApiError,
            };
            let message = if status.as_u16() == 404 {
                format!("{} returned 404. Ensure the server supports OpenAI-compatible endpoints at /v1/chat/completions. Error: {}", location, text)
            } else if status.as_u16() == 401 {
                format!("{} requires authentication. If your server needs an API key, enter it above.", location)
            } else {
                format!("{} error {}: {}", location, status, text)
            };

            return Err(LlmError {
                code,
                message,
            });
        }

        let compat_response: OpenAiCompatResponse =
            response.json().await.map_err(|e| LlmError {
                code: LlmErrorCode::ParseError,
                message: format!("Failed to parse response from {}: {}", location, e),
            })?;

        let content = compat_response
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| LlmError {
                code: LlmErrorCode::EmptyResponse,
                message: format!("No response from {}", location),
            })?;

        // Track usage - OpenAI-compatible APIs may return usage data
        let duration_ms = start.elapsed().as_millis() as u64;
        let usage = compat_response.usage;
        let metadata = LlmUsageMetadata {
            provider: "openai_compat".to_string(),
            model: params.model.clone(),
            path: classify_request_path(&params.base_url),
            duration_ms,
            input_tokens: usage.as_ref().map(|u| u.prompt_tokens as usize).unwrap_or(0),
            output_tokens: usage.as_ref().map(|u| u.completion_tokens as usize).unwrap_or(0),
            total_tokens: usage.as_ref().map(|u| u.total_tokens as usize).unwrap_or(0),
            tokens_available: usage.is_some(),
            correlation_id: params.correlation_id.clone(),
        };
        log_usage(&metadata);

        super::parse_conversation_turn_result(&content)
    }
}

/// Create a fallback "ask_user" proposal when the local server is unreachable
#[allow(dead_code)]
pub fn create_server_unreachable_proposal() -> AgentProposal {
    AgentProposal::AskUser {
        question: "Unable to connect to the local LLM server. Please ensure your local model is running and try again. If you haven't set up a local model yet, check the documentation for instructions on running Qwen or another OpenAI-compatible model locally.".to_string(),
    }
}
