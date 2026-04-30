//! GORKH AI Free tier provider — routes through the Render API
//!
//! This is the ACTIVE production provider for the GORKH AI Free tier.
//! It sends requests to the backend `/llm/free/chat` endpoint using the
//! device's authentication token.

use super::{
    AgentProposal, ClientConfig, ConversationTurnParams, ConversationTurnResult, LlmError,
    LlmErrorCode, LlmProvider, LlmUsageMetadata, ProposalParams, create_http_client,
    classify_request_error, classify_request_path, log_usage, Instant,
};
use serde::{Deserialize, Serialize};

pub struct GorkhFreeProvider;

const GORKH_FREE_CHAT_PATH: &str = "/llm/free/chat";

#[derive(Debug, Serialize, Deserialize)]
struct GorkhFreeMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct GorkhFreeRequest {
    messages: Vec<GorkhFreeMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Deserialize)]
struct GorkhFreeResponse {
    #[serde(rename = "request_id")]
    _request_id: String,
    message: GorkhFreeMessage,
    usage: GorkhFreeUsage,
    #[serde(rename = "free_tier")]
    _free_tier: GorkhFreeTierInfo,
}

#[derive(Debug, Deserialize)]
struct GorkhFreeUsage {
    input_tokens: u64,
    output_tokens: u64,
}

#[derive(Debug, Deserialize)]
struct GorkhFreeTierInfo {
    #[serde(rename = "remaining_today")]
    _remaining_today: u32,
    #[serde(rename = "reset_at")]
    _reset_at: String,
}

#[derive(Debug, Deserialize)]
struct GorkhFreeErrorResponse {
    #[serde(rename = "error")]
    _error: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "reset_at")]
    _reset_at: Option<String>,
}

impl GorkhFreeProvider {
    fn build_url(base_url: &str) -> String {
        let trimmed = base_url.trim_end_matches('/');
        format!("{}{}", trimmed, GORKH_FREE_CHAT_PATH)
    }

    fn build_request_body(params: &ProposalParams) -> GorkhFreeRequest {
        let messages = vec![
            GorkhFreeMessage {
                role: "system".to_string(),
                content: serde_json::Value::String(super::build_system_prompt(
                    &params.constraints,
                    params.workspace_configured.unwrap_or(false),
                    params.app_context.as_deref(),
                )),
            },
            GorkhFreeMessage {
                role: "user".to_string(),
                content: serde_json::Value::String(super::build_user_prompt(
                    &params.goal,
                    params.screenshot_png_base64.as_deref(),
                    params.screenshot_width,
                    params.screenshot_height,
                    &params.history,
                    0,
                )),
            },
        ];

        GorkhFreeRequest {
            messages,
            max_tokens: Some(2048),
            temperature: None,
        }
    }

    fn build_conversation_body(params: &ConversationTurnParams) -> GorkhFreeRequest {
        let messages = params
            .messages
            .iter()
            .map(|m| GorkhFreeMessage {
                // The desktop frontend uses "agent" for assistant messages in chat history,
                // but the backend /llm/free/chat schema only accepts standard LLM roles:
                // "user", "assistant", "system", "tool". Normalize here at the provider boundary.
                role: if m.role == "agent" {
                    "assistant".to_string()
                } else {
                    m.role.clone()
                },
                content: serde_json::Value::String(m.text.clone()),
            })
            .collect();

        GorkhFreeRequest {
            messages,
            max_tokens: Some(2048),
            temperature: None,
        }
    }

    async fn send_request(
        &self,
        base_url: &str,
        device_token: &str,
        body: GorkhFreeRequest,
        correlation_id: Option<&str>,
    ) -> Result<serde_json::Value, LlmError> {
        let client = create_http_client(ClientConfig::cloud())?;
        let url = Self::build_url(base_url);

        let mut request_builder = client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", device_token))
            .json(&body);

        if let Some(cid) = correlation_id {
            request_builder = request_builder.header("x-request-id", cid);
        }

        let response = request_builder.send().await.map_err(|e| {
            let code = classify_request_error(&e);
            LlmError::new(code, format!("GORKH Free tier request failed: {}", e))
        })?;

        let status = response.status();
        let text = response.text().await.unwrap_or_default();

        if status == 429 {
            if let Ok(err) = serde_json::from_str::<GorkhFreeErrorResponse>(&text) {
                return Err(LlmError::new(
                    LlmErrorCode::FreeTierExhausted,
                    err.message,
                ));
            }
            return Err(LlmError::new(
                LlmErrorCode::FreeTierExhausted,
                "Free tier quota exhausted. Please try again later or use your own API key.",
            ));
        }

        if status == 503 {
            if let Ok(err) = serde_json::from_str::<GorkhFreeErrorResponse>(&text) {
                return Err(LlmError::new(
                    LlmErrorCode::FreeAiFallbackUnavailable,
                    err.message,
                ));
            }
            return Err(LlmError::new(
                LlmErrorCode::FreeAiFallbackUnavailable,
                "GORKH Free tier is temporarily unavailable. Please try again later.",
            ));
        }

        if !status.is_success() {
            let code = if status.as_u16() >= 500 {
                LlmErrorCode::ApiError
            } else {
                LlmErrorCode::RequestFailed
            };
            return Err(LlmError::new(
                code,
                format!("GORKH Free tier returned {}: {}", status, text),
            ));
        }

        serde_json::from_str(&text).map_err(|e| {
            LlmError::new(
                LlmErrorCode::InvalidJson,
                format!("Failed to parse GORKH Free tier response: {}", e),
            )
        })
    }
}

#[async_trait::async_trait]
impl LlmProvider for GorkhFreeProvider {
    async fn propose_next_action(
        &self,
        params: &ProposalParams,
    ) -> Result<AgentProposal, LlmError> {
        let start = Instant::now();
        let body = Self::build_request_body(params);

        let response = self
            .send_request(
                &params.base_url,
                &params.api_key,
                body,
                params.correlation_id.as_deref(),
            )
            .await?;

        let parsed: GorkhFreeResponse = serde_json::from_value(response).map_err(|e| {
            LlmError::new(
                LlmErrorCode::InvalidJson,
                format!("Failed to parse GORKH Free tier proposal response: {}", e),
            )
        })?;

        let duration_ms = start.elapsed().as_millis() as u64;
        log_usage(&LlmUsageMetadata {
            provider: "gorkh_free".to_string(),
            model: "deepseek-chat".to_string(),
            path: classify_request_path(&params.base_url),
            duration_ms,
            input_tokens: parsed.usage.input_tokens as usize,
            output_tokens: parsed.usage.output_tokens as usize,
            total_tokens: (parsed.usage.input_tokens + parsed.usage.output_tokens) as usize,
            tokens_available: true,
            correlation_id: params.correlation_id.clone(),
        });

        // Parse the proposal from the message content
        let content = match parsed.message.content {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        };

        super::parse_json_response::<AgentProposal>(&content, "proposal")
    }

    async fn conversation_turn(
        &self,
        params: &ConversationTurnParams,
    ) -> Result<ConversationTurnResult, LlmError> {
        let start = Instant::now();
        let body = Self::build_conversation_body(params);

        let response = self
            .send_request(
                &params.base_url,
                &params.api_key,
                body,
                params.correlation_id.as_deref(),
            )
            .await?;

        let parsed: GorkhFreeResponse = serde_json::from_value(response).map_err(|e| {
            LlmError::new(
                LlmErrorCode::InvalidJson,
                format!("Failed to parse GORKH Free tier conversation response: {}", e),
            )
        })?;

        let duration_ms = start.elapsed().as_millis() as u64;
        log_usage(&LlmUsageMetadata {
            provider: "gorkh_free".to_string(),
            model: "deepseek-chat".to_string(),
            path: classify_request_path(&params.base_url),
            duration_ms,
            input_tokens: parsed.usage.input_tokens as usize,
            output_tokens: parsed.usage.output_tokens as usize,
            total_tokens: (parsed.usage.input_tokens + parsed.usage.output_tokens) as usize,
            tokens_available: true,
            correlation_id: params.correlation_id.clone(),
        });

        let content = match parsed.message.content {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        };

        super::parse_json_response::<ConversationTurnResult>(&content, "conversation turn")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::ConversationTurnMessage;

    #[test]
    fn build_conversation_body_normalizes_agent_role_to_assistant() {
        let params = super::super::ConversationTurnParams {
            provider: "gorkh_free".to_string(),
            base_url: "https://api.example.com".to_string(),
            model: "deepseek-chat".to_string(),
            api_key: "test-token".to_string(),
            messages: vec![
                ConversationTurnMessage {
                    role: "user".to_string(),
                    text: "Hello".to_string(),
                },
                ConversationTurnMessage {
                    role: "agent".to_string(),
                    text: "Hi there".to_string(),
                },
                ConversationTurnMessage {
                    role: "system".to_string(),
                    text: "You are GORKH".to_string(),
                },
            ],
            app_context: None,
            correlation_id: None,
        };

        let body = GorkhFreeProvider::build_conversation_body(&params);
        assert_eq!(body.messages.len(), 3);
        assert_eq!(body.messages[0].role, "user");
        assert_eq!(body.messages[1].role, "assistant", "agent role should be normalized to assistant");
        assert_eq!(body.messages[2].role, "system");
    }

    #[test]
    fn build_conversation_body_preserves_assistant_role() {
        let params = super::super::ConversationTurnParams {
            provider: "gorkh_free".to_string(),
            base_url: "https://api.example.com".to_string(),
            model: "deepseek-chat".to_string(),
            api_key: "test-token".to_string(),
            messages: vec![
                ConversationTurnMessage {
                    role: "assistant".to_string(),
                    text: "Hello".to_string(),
                },
            ],
            app_context: None,
            correlation_id: None,
        };

        let body = GorkhFreeProvider::build_conversation_body(&params);
        assert_eq!(body.messages[0].role, "assistant");
    }
}
