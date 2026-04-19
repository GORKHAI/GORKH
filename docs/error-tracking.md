# Error Tracking Integration

This document describes the error tracking integration for the GORKH API.

## Overview

The API includes a privacy-aware error tracking abstraction that supports Sentry (or compatible services). Error tracking is **opt-in** via environment variables.

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `SENTRY_DSN` | Sentry DSN (Data Source Name). If not set, error tracking is disabled. | (empty) |
| `SENTRY_ENVIRONMENT` | Environment tag for Sentry events. | `NODE_ENV` |
| `SENTRY_SAMPLE_RATE` | Sample rate for error events (0.0 - 1.0). | `1.0` |

## What is Captured

When error tracking is enabled, the following safe metadata is included with error reports:

### Safe Context Tags
- `correlation_id` - Request correlation ID for tracing
- `request_id` - Fastify request ID
- `provider` - LLM provider type (e.g., 'openai', 'claude', 'ollama')
- `model` - Model name (e.g., 'gpt-4', 'claude-3-sonnet')
- `path` - Request path classification ('local', 'cloud', 'hosted_fallback')
- `error_code` - Structured error code (e.g., 'TIMEOUT', 'RATE_LIMITED')
- `status_code` - HTTP status code (for HTTP errors)
- `user_id` - Hashed user ID for privacy

### Error Information
- Error message
- Stack trace
- Error type/name

## What is NOT Captured

To preserve privacy and security, the following are **explicitly excluded**:

- ❌ User prompts or chat messages
- ❌ File contents or paths
- ❌ Terminal commands or arguments
- ❌ Raw API keys or tokens
- ❌ Sensitive headers (Authorization, Cookie, etc.)
- ❌ Personal identifiable information (PII)
- ❌ Request/response bodies containing user data

## Usage in Code

### Basic Error Reporting

```typescript
import { reportError } from './lib/error-tracking.js';

try {
  await riskyOperation();
} catch (error) {
  reportError(error instanceof Error ? error : new Error(String(error)), {
    correlationId: request.id,
    userId: session.userId,
    provider: 'openai',
    errorCode: 'API_ERROR',
  });
}
```

### Request-Scoped Reporter

```typescript
import { createErrorReporter } from './lib/error-tracking.js';

const reporter = createErrorReporter({
  correlationId: request.id,
  userId: session.userId,
  path: 'hosted_fallback',
});

// Later in the request:
reporter.report(error, { errorCode: 'TIMEOUT' });
```

### Reporting Messages (Non-Errors)

```typescript
import { reportMessage } from './lib/error-tracking.js';

reportMessage('Hosted fallback upstream degraded', 'warning', {
  provider: 'openai',
  path: 'hosted_fallback',
});
```

## Redaction

All error reports pass through the `redact()` function from `lib/redact.ts`, which:

1. Identifies sensitive keys (containing 'token', 'secret', 'password', 'key')
2. Redacts sensitive headers (Authorization, Cookie, X-Admin-Api-Key)
3. Replaces sensitive values with `[REDACTED]`

## Local Development

Without `SENTRY_DSN` configured, errors are logged to the console but not sent to any external service. This is the default for local development.

## Deployment

To enable error tracking in production:

1. Set `SENTRY_DSN` to your Sentry project's DSN
2. Optionally set `SENTRY_ENVIRONMENT` (e.g., 'production', 'staging')
3. Optionally adjust `SENTRY_SAMPLE_RATE` for high-traffic scenarios

Example:
```bash
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
```

## Troubleshooting

### Errors not appearing in Sentry

1. Check that `SENTRY_DSN` is set correctly
2. Verify the DSN is valid in Sentry dashboard
3. Check server logs for initialization errors
4. Ensure errors are being thrown (not just logged)

### Too much noise

- Adjust `SENTRY_SAMPLE_RATE` to sample events
- Review error reporting calls to ensure only actionable errors are reported
- Use tags to filter events in Sentry dashboard

### Privacy concerns

- Review the `redact()` function in `lib/redact.ts`
- Test redaction with sample events
- Audit error reporting calls for any sensitive data
