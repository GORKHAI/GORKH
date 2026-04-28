/**
 * Shared LLM error codes
 *
 * Keep in sync with Rust: apps/desktop/src-tauri/src/llm/error.rs
 * These are stable wire-format constants used across desktop/API boundaries.
 */

/**
 * Stable error codes for LLM provider operations
 *
 * Changes to these values affect the wire format and must be coordinated
 * with the Rust side serialization.
 */
export const LlmErrorCode = {
  /** HTTP client initialization failed */
  CLIENT_INIT_FAILED: 'CLIENT_INIT_FAILED',

  /** Provider is not supported */
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',

  /** Invalid JSON in request or response */
  INVALID_JSON: 'INVALID_JSON',

  /** Request timed out */
  TIMEOUT: 'TIMEOUT',

  /** Could not establish connection to provider */
  CONNECTION_FAILED: 'CONNECTION_FAILED',

  /** HTTP request failed (non-timeout, non-connection error) */
  REQUEST_FAILED: 'REQUEST_FAILED',

  /** Provider API returned an error response */
  API_ERROR: 'API_ERROR',

  /** Failed to parse provider response */
  PARSE_ERROR: 'PARSE_ERROR',

  /** Provider returned empty or null response */
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',

  /** Model not found or invalid model name */
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',

  /** Authentication failed (invalid API key) */
  AUTH_FAILED: 'AUTH_FAILED',

  /** Rate limited by provider */
  RATE_LIMITED: 'RATE_LIMITED',

  /** Local AI runtime error (deprecated: local AI removed) */
  LOCAL_AI_ERROR: 'LOCAL_AI_ERROR',

  /** Free AI fallback service is unavailable */
  FREE_AI_FALLBACK_UNAVAILABLE: 'FREE_AI_FALLBACK_UNAVAILABLE',

  /** Free AI fallback service encountered an upstream error */
  FREE_AI_FALLBACK_UPSTREAM_ERROR: 'FREE_AI_FALLBACK_UPSTREAM_ERROR',

  /** Free tier quota exhausted — user has used all daily tasks */
  FREE_TIER_EXHAUSTED: 'FREE_TIER_EXHAUSTED',
} as const;

/**
 * Type for LLM error codes
 */
export type LlmErrorCode =
  (typeof LlmErrorCode)[keyof typeof LlmErrorCode];

/**
 * Error codes that indicate potentially retryable conditions
 */
export const RETRYABLE_LLM_ERROR_CODES: readonly LlmErrorCode[] = [
  LlmErrorCode.TIMEOUT,
  LlmErrorCode.CONNECTION_FAILED,
  LlmErrorCode.RATE_LIMITED,
  LlmErrorCode.FREE_AI_FALLBACK_UNAVAILABLE,
  LlmErrorCode.FREE_AI_FALLBACK_UPSTREAM_ERROR,
];

/**
 * Check if an error code indicates a retryable condition
 */
export function isRetryableLlmErrorCode(code: string): boolean {
  return (RETRYABLE_LLM_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * Type guard for LlmErrorCode
 */
export function isLlmErrorCode(code: string): code is LlmErrorCode {
  return Object.values(LlmErrorCode).includes(code as LlmErrorCode);
}
