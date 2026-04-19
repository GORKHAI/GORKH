// Type declarations for optional @sentry/node dependency
// This file provides minimal types for the error tracking module
// when Sentry is not installed.

declare module '@sentry/node' {
  export function init(options: unknown): void;
  export function close(timeout: number): Promise<boolean>;
  export function captureException(error: Error): void;
  export function captureMessage(message: string, level?: string): void;
  export function withScope(callback: (scope: SentryScope) => void): void;
  
  interface SentryScope {
    setTag(key: string, value: string): void;
    setUser(user: { id: string } | null): void;
    setLevel(level: string): void;
  }
}
