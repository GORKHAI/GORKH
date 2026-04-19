/**
 * Error tracking integration for the API
 *
 * Provides a thin, privacy-aware abstraction over error reporting services.
 * All error reporting goes through this module to ensure consistent redaction
 * and safe context attachment.
 *
 * Configuration:
 * - SENTRY_DSN: Sentry DSN (if not set, errors are logged but not sent)
 * - SENTRY_ENVIRONMENT: Environment tag for Sentry (default: NODE_ENV)
 * - SENTRY_SAMPLE_RATE: Sample rate for error events (default: 1.0)
 *
 * Privacy rules:
 * - NO user content (prompts, file contents, terminal args)
 * - NO sensitive credentials (API keys, tokens, passwords)
 * - NO personally identifiable information
 * - Only safe metadata: provider type, model names, error codes, correlation IDs
 */

import { config } from '../config.js';
import { redact } from './redact.js';

// Sentry SDK types (avoiding direct import until Sentry is installed)
interface SentrySDK {
  init(options: unknown): void;
  close(timeout: number): Promise<boolean>;
  captureException(error: Error): void;
  captureMessage(message: string, level?: string): void;
  withScope(callback: (scope: SentryScope) => void): void;
}

interface SentryScope {
  setTag(key: string, value: string): void;
  setUser(user: { id: string } | null): void;
  setLevel(level: string): void;
}

// Lazy-loaded Sentry SDK (only imported if SENTRY_DSN is configured)
let Sentry: SentrySDK | null = null;

/**
 * Safe context that can be attached to error reports
 */
export interface ErrorContext {
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Request ID from Fastify */
  requestId?: string;
  /** User ID (hashed in some environments) */
  userId?: string;
  /** LLM provider type (e.g., 'openai', 'claude', 'ollama') */
  provider?: string;
  /** Model name used */
  model?: string;
  /** Request path classification */
  path?: 'local' | 'cloud' | 'hosted_fallback';
  /** Error code from LlmErrorCode or similar */
  errorCode?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Additional safe tags (key-value pairs) */
  tags?: Record<string, string | number | boolean>;
}

/**
 * Initialize error tracking
 * Called once at server startup
 */
export async function initErrorTracking(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[error-tracking] SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  try {
    // Dynamic import of Sentry SDK
    // The module is optional - if not installed, error tracking falls back to console
    const moduleName = '@sentry/node';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentryModule: any = await import(/* webpackIgnore: true */ moduleName);
    Sentry = sentryModule as SentrySDK;
    
    if (Sentry) {
      Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT || config.NODE_ENV,
        sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
        // Disable auto-instrumentation of HTTP calls (we track manually)
        integrations: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeSend(event: any) {
          // Additional redaction pass before sending
          return redactEvent(event);
        },
      });
      console.log('[error-tracking] Sentry initialized');
    }
  } catch (error) {
    console.error('[error-tracking] Failed to initialize Sentry:', error);
    Sentry = null;
  }
}

/**
 * Report an error to the tracking service
 *
 * Usage:
 *   reportError(error, { correlationId: 'abc-123', provider: 'openai' });
 */
export function reportError(error: Error, context?: ErrorContext): void {
  // Always log the error locally
  const redactedError = redact(error);
  console.error('[error-report]', {
    error: redactedError,
    context: context ? redact(context) : undefined,
  });

  // Send to Sentry if configured
  if (!Sentry) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.correlationId) {
      scope.setTag('correlation_id', context.correlationId);
    }
    if (context?.requestId) {
      scope.setTag('request_id', context.requestId);
    }
    if (context?.userId) {
      scope.setUser({ id: hashUserId(context.userId) });
    }
    if (context?.provider) {
      scope.setTag('provider', context.provider);
    }
    if (context?.model) {
      scope.setTag('model', context.model);
    }
    if (context?.path) {
      scope.setTag('path', context.path);
    }
    if (context?.errorCode) {
      scope.setTag('error_code', context.errorCode);
    }
    if (context?.statusCode) {
      scope.setTag('status_code', String(context.statusCode));
    }
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, String(value));
      }
    }

    Sentry!.captureException(error);
  });
}

/**
 * Report a message (non-error) to the tracking service
 * Useful for important events that aren't exceptions
 */
export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): void {
  // Always log locally
  console.log('[error-report]', { message, level, context });

  if (!Sentry) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (context?.correlationId) {
      scope.setTag('correlation_id', context.correlationId);
    }
    if (context?.userId) {
      scope.setUser({ id: hashUserId(context.userId) });
    }

    Sentry!.captureMessage(message, level);
  });
}

/**
 * Create a child error reporter with preset context
 * Useful for request-scoped error reporting
 */
export function createErrorReporter(presetContext: ErrorContext) {
  return {
    report: (error: Error, additionalContext?: Partial<ErrorContext>) => {
      reportError(error, { ...presetContext, ...additionalContext });
    },
    reportMessage: (message: string, level?: 'info' | 'warning' | 'error') => {
      reportMessage(message, level, presetContext);
    },
  };
}

/**
 * Gracefully close error tracking (flush pending events)
 */
export async function closeErrorTracking(): Promise<void> {
  if (!Sentry) {
    return;
  }
  await Sentry.close(2000);
}

// Helper: Hash user ID for privacy in error tracking
function hashUserId(userId: string): string {
  // Simple hash for anonymization - in production, use a proper hash
  // This is sufficient for error tracking correlation without exposing raw IDs
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `user_${Math.abs(hash).toString(16)}`;
}

// Helper: Redact Sentry event before sending
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function redactEvent(event: any): any | null {
  if (event.request) {
    event.request = redact(event.request);
  }
  if (event.contexts) {
    event.contexts = redact(event.contexts);
  }
  // Remove any exception values that might contain sensitive data
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          // Redact vars in stack frames
          if (frame.vars) {
            frame.vars = redact(frame.vars);
          }
        }
      }
    }
  }
  return event;
}
