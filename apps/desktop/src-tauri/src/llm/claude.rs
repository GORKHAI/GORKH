use super::{
    AgentProposal, ClientConfig, ConversationTurnParams, ConversationTurnResult, LlmError,
    LlmErrorCode, LlmProvider, LlmUsageMetadata, ProposalParams, classify_request_error,
    classify_request_path, log_usage, Instant,
};
use serde_json::json;

pub struct ClaudeProvider;

const OPEN_APP_PROMPT_HINT: &str = "Use open_app with {\"kind\":\"open_app\",\"appName\":\"Photoshop\"} when the next step is to launch a desktop app or browser by name.";

const CONVERSATION_INTAKE_PROMPT_RULES: &str = concat!(
    "do not start execution from the intake turn.\n",
    "ask clarifying questions when details are missing.\n",
    "Return either reply or confirm_task JSON.\n",
    "For confirm_task JSON, set summary to a plain-language sentence starting with \"I will ...\" and set prompt to a direct confirmation request ending with \"Confirm?\".\n",
    "If the task includes opening an app or browser, mention it as open_app in the summary rather than starting execution.\n"
);

#[async_trait::async_trait]
impl LlmProvider for ClaudeProvider {
    async fn propose_next_action(
        &self,
        params: &ProposalParams,
    ) -> Result<AgentProposal, LlmError> {
        let start = Instant::now();
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
            params.screenshot_width,
            params.screenshot_height,
            &params.history,
            0,
        );

        let content = if let Some(screenshot_b64) = &params.screenshot_png_base64 {
            let clean_b64 = screenshot_b64
                .strip_prefix("data:image/png;base64,")
                .unwrap_or(screenshot_b64);
            json!([
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": clean_b64
                    }
                },
                {
                    "type": "text",
                    "text": user_prompt
                }
            ])
        } else {
            json!([{ "type": "text", "text": user_prompt }])
        };

        let request_body = json!({
            "model": params.model,
            "max_tokens": 1000,
            "temperature": 0.2,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ]
        });

        let client = super::create_http_client(ClientConfig::cloud())?;
        
        let mut request_builder = client
            .post(super::build_anthropic_messages_url(&params.base_url))
            .header("x-api-key", &params.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json");
        
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
                        "Claude request timed out after {} seconds. The service may be experiencing delays.",
                        super::CLOUD_PROVIDER_TIMEOUT.as_secs()
                    ),
                    LlmErrorCode::ConnectionFailed => "Cannot connect to Claude. Check your internet connection.".to_string(),
                    _ => format!("Request failed: {}", e),
                };
                LlmError {
                    code,
                    message,
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(LlmError {
                code: LlmErrorCode::ApiError,
                message: format!("Claude API error {}: {}", status, text),
            });
        }

        let result: serde_json::Value = response.json().await.map_err(|e| LlmError {
            code: LlmErrorCode::ParseError,
            message: format!("Failed to parse Claude response: {}", e),
        })?;

        let content = result["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let proposal = super::parse_json_response::<AgentProposal>(&content, "proposal")?;

        // Track usage - Claude returns usage in result["usage"]
        let duration_ms = start.elapsed().as_millis() as u64;
        let usage = result.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("input_tokens"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let output_tokens = usage
            .and_then(|u| u.get("output_tokens"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let metadata = LlmUsageMetadata {
            provider: "claude".to_string(),
            model: params.model.clone(),
            path: classify_request_path(&params.base_url),
            duration_ms,
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
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
        let system_prompt = format!(
            "{}\n\n{}",
            super::build_conversation_system_prompt(params.app_context.as_deref()),
            CONVERSATION_INTAKE_PROMPT_RULES
        );
        let user_prompt = super::build_conversation_user_prompt(&params.messages);
        let request_body = json!({
            "model": params.model,
            "max_tokens": 600,
            "temperature": 0.2,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ]
                }
            ]
        });

        let client = super::create_http_client(ClientConfig::cloud())?;
        
        let mut request_builder = client
            .post(super::build_anthropic_messages_url(&params.base_url))
            .header("x-api-key", &params.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json");
        
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
                        "Claude request timed out after {} seconds. The service may be experiencing delays.",
                        super::CLOUD_PROVIDER_TIMEOUT.as_secs()
                    ),
                    LlmErrorCode::ConnectionFailed => "Cannot connect to Claude. Check your internet connection.".to_string(),
                    _ => format!("Request failed: {}", e),
                };
                LlmError {
                    code,
                    message,
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(LlmError {
                code: LlmErrorCode::ApiError,
                message: format!("Claude API error {}: {}", status, text),
            });
        }

        let result: serde_json::Value = response.json().await.map_err(|e| LlmError {
            code: LlmErrorCode::ParseError,
            message: format!("Failed to parse Claude response: {}", e),
        })?;

        let content = result["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Track usage - Claude returns usage in result["usage"]
        let duration_ms = start.elapsed().as_millis() as u64;
        let usage = result.get("usage");
        let input_tokens = usage
            .and_then(|u| u.get("input_tokens"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let output_tokens = usage
            .and_then(|u| u.get("output_tokens"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let metadata = LlmUsageMetadata {
            provider: "claude".to_string(),
            model: params.model.clone(),
            path: classify_request_path(&params.base_url),
            duration_ms,
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
            tokens_available: usage.is_some(),
            correlation_id: params.correlation_id.clone(),
        };
        log_usage(&metadata);

        super::parse_conversation_turn_result(&content)
    }
}
