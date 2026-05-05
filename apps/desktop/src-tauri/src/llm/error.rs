//! Typed error codes for LLM operations
//!
//! Provides stable, machine-readable error codes for observability and
//! user-facing error handling. Keep codes in sync with packages/shared/src/llm-error.ts

use serde::Serialize;

/// Stable error codes for LLM provider operations
///
/// These are serialized as uppercase strings for compatibility with
/// TypeScript consumers. Changes to variant names affect the wire format.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LlmErrorCode {
    /// HTTP client initialization failed
    ClientInitFailed,

    /// Provider is not supported
    UnsupportedProvider,

    /// Invalid JSON in request or response
    InvalidJson,

    /// Request timed out
    Timeout,

    /// Could not establish connection to provider
    ConnectionFailed,

    /// HTTP request failed (non-timeout, non-connection error)
    RequestFailed,

    /// Provider API returned an error response
    ApiError,

    /// Failed to parse provider response
    ParseError,

    /// Provider returned empty or null response
    EmptyResponse,

    /// Model not found or invalid model name
    ModelNotFound,

    /// Authentication failed (invalid API key)
    AuthFailed,

    /// Rate limited by provider
    RateLimited,

    /// Free AI fallback service is unavailable
    FreeAiFallbackUnavailable,

    /// Free AI fallback service encountered an upstream error
    FreeAiFallbackUpstreamError,

    /// Free tier quota exhausted — user has used all daily tasks
    FreeTierExhausted,
}

impl LlmErrorCode {
    /// Returns the string representation of the error code
    pub fn as_str(&self) -> &'static str {
        match self {
            LlmErrorCode::ClientInitFailed => "CLIENT_INIT_FAILED",
            LlmErrorCode::UnsupportedProvider => "UNSUPPORTED_PROVIDER",
            LlmErrorCode::InvalidJson => "INVALID_JSON",
            LlmErrorCode::Timeout => "TIMEOUT",
            LlmErrorCode::ConnectionFailed => "CONNECTION_FAILED",
            LlmErrorCode::RequestFailed => "REQUEST_FAILED",
            LlmErrorCode::ApiError => "API_ERROR",
            LlmErrorCode::ParseError => "PARSE_ERROR",
            LlmErrorCode::EmptyResponse => "EMPTY_RESPONSE",
            LlmErrorCode::ModelNotFound => "MODEL_NOT_FOUND",
            LlmErrorCode::AuthFailed => "AUTH_FAILED",
            LlmErrorCode::RateLimited => "RATE_LIMITED",
            LlmErrorCode::FreeAiFallbackUnavailable => "FREE_AI_FALLBACK_UNAVAILABLE",
            LlmErrorCode::FreeAiFallbackUpstreamError => "FREE_AI_FALLBACK_UPSTREAM_ERROR",
            LlmErrorCode::FreeTierExhausted => "FREE_TIER_EXHAUSTED",
        }
    }

    /// Returns true if this error code indicates a potentially retryable condition
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            LlmErrorCode::Timeout
                | LlmErrorCode::ConnectionFailed
                | LlmErrorCode::RateLimited
                | LlmErrorCode::FreeAiFallbackUnavailable
                | LlmErrorCode::FreeAiFallbackUpstreamError
        )
    }
}

impl std::fmt::Display for LlmErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_code_serialization_matches_string_value() {
        // Ensure serde serialization matches as_str()
        let code = LlmErrorCode::Timeout;
        let json = serde_json::to_string(&code).unwrap();
        assert_eq!(json, "\"TIMEOUT\"");
        assert_eq!(code.as_str(), "TIMEOUT");
    }

    #[test]
    fn all_error_codes_serialize_to_upper_snake_case() {
        let codes = vec![
            (LlmErrorCode::ClientInitFailed, "CLIENT_INIT_FAILED"),
            (LlmErrorCode::UnsupportedProvider, "UNSUPPORTED_PROVIDER"),
            (LlmErrorCode::InvalidJson, "INVALID_JSON"),
            (LlmErrorCode::Timeout, "TIMEOUT"),
            (LlmErrorCode::ConnectionFailed, "CONNECTION_FAILED"),
            (LlmErrorCode::RequestFailed, "REQUEST_FAILED"),
            (LlmErrorCode::ApiError, "API_ERROR"),
            (LlmErrorCode::ParseError, "PARSE_ERROR"),
            (LlmErrorCode::EmptyResponse, "EMPTY_RESPONSE"),
            (LlmErrorCode::ModelNotFound, "MODEL_NOT_FOUND"),
            (LlmErrorCode::AuthFailed, "AUTH_FAILED"),
            (LlmErrorCode::RateLimited, "RATE_LIMITED"),
            (
                LlmErrorCode::FreeAiFallbackUnavailable,
                "FREE_AI_FALLBACK_UNAVAILABLE",
            ),
            (
                LlmErrorCode::FreeAiFallbackUpstreamError,
                "FREE_AI_FALLBACK_UPSTREAM_ERROR",
            ),
            (LlmErrorCode::FreeTierExhausted, "FREE_TIER_EXHAUSTED"),
        ];

        for (code, expected) in codes {
            assert_eq!(code.as_str(), expected);
            let json = serde_json::to_string(&code).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn retryable_codes_are_correct() {
        assert!(LlmErrorCode::Timeout.is_retryable());
        assert!(LlmErrorCode::ConnectionFailed.is_retryable());
        assert!(LlmErrorCode::RateLimited.is_retryable());
        assert!(LlmErrorCode::FreeAiFallbackUnavailable.is_retryable());
        assert!(LlmErrorCode::FreeAiFallbackUpstreamError.is_retryable());

        assert!(!LlmErrorCode::AuthFailed.is_retryable());
        assert!(!LlmErrorCode::ModelNotFound.is_retryable());
        assert!(!LlmErrorCode::ParseError.is_retryable());
        assert!(!LlmErrorCode::ApiError.is_retryable());
    }
}
