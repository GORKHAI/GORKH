//! Generic OpenAI-compatible chat client used by cloud providers
//! (DeepSeek, Moonshot/Kimi, and OpenAI itself).

use super::*;
use serde_json::json;

/// Reusable HTTP client for any OpenAI-compatible `/v1/chat/completions` endpoint.
pub struct OpenAiFormatClient {
    api_key: String,
    base_url: String,
    model: String,
    client: reqwest::Client,
}

impl OpenAiFormatClient {
    pub fn new(api_key: String, base_url: String, model: String, timeout_secs: u64) -> Self {
        Self {
            api_key,
            base_url,
            model,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(timeout_secs))
                .build()
                .unwrap_or_default(),
        }
    }

    /// Call the provider's chat completions endpoint.
    pub async fn chat_completion(
        &self,
        system: &str,
        user: &str,
        image: Option<&str>,
    ) -> Result<LlmResponse, ProviderError> {
        let url = format!("{}/chat/completions", self.base_url);

        let mut messages = vec![json!({"role": "system", "content": system})];

        let user_message = if let Some(img_b64) = image {
            json!({
                "role": "user",
                "content": [
                    {"type": "text", "text": user},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:image/png;base64,{}", img_b64),
                            "detail": "high"
                        }
                    }
                ]
            })
        } else {
            json!({"role": "user", "content": user})
        };
        messages.push(user_message);

        let request_body = json!({
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 2048,
        });

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request_body)
            .send()
            .await
            .map_err(|e| ProviderError {
                code: "NETWORK_ERROR".to_string(),
                message: format!("Failed to connect to {}: {}", self.base_url, e),
                is_retryable: true,
            })?;

        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(ProviderError {
                code: if status.as_u16() == 429 {
                    "RATE_LIMITED".to_string()
                } else {
                    "API_ERROR".to_string()
                },
                message: format!("API returned {}: {}", status, text),
                is_retryable: status.is_server_error() || status.as_u16() == 429,
            });
        }

        let result: serde_json::Value = response.json().await.map_err(|e| ProviderError {
            code: "PARSE_ERROR".to_string(),
            message: format!("Failed to parse API response: {}", e),
            is_retryable: false,
        })?;

        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = result["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as usize;
        let output_tokens = result["usage"]["completion_tokens"].as_u64().unwrap_or(0) as usize;

        Ok(LlmResponse {
            content,
            input_tokens,
            output_tokens,
            model: self.model.clone(),
            finish_reason: result["choices"][0]["finish_reason"]
                .as_str()
                .unwrap_or("stop")
                .to_string(),
        })
    }
}
