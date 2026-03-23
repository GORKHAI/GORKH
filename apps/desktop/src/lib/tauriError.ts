export interface DesktopErrorDetails {
  code: string | null;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCode(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseDesktopErrorInternal(
  error: unknown,
  fallbackMessage: string,
  depth: number
): DesktopErrorDetails {
  if (typeof error === 'string' && error.trim().length > 0) {
    return { code: null, message: error.trim() };
  }

  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: unknown; cause?: unknown };
    const code = readCode(errorWithCode.code);
    if (error.message.trim().length > 0) {
      return { code, message: error.message };
    }
    if (depth < 3 && errorWithCode.cause != null) {
      return parseDesktopErrorInternal(errorWithCode.cause, fallbackMessage, depth + 1);
    }
    return { code, message: fallbackMessage };
  }

  if (isRecord(error)) {
    const code = readCode(error.code);
    const message = typeof error.message === 'string' ? error.message.trim() : '';
    if (message.length > 0) {
      return { code, message };
    }

    if (depth < 3 && error.error != null) {
      const nested = parseDesktopErrorInternal(error.error, fallbackMessage, depth + 1);
      if (nested.message !== fallbackMessage || nested.code) {
        return nested;
      }
    }

    if (depth < 3 && error.cause != null) {
      const nested = parseDesktopErrorInternal(error.cause, fallbackMessage, depth + 1);
      if (nested.message !== fallbackMessage || nested.code) {
        return nested;
      }
    }

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') {
        return { code, message: serialized };
      }
    } catch {
      // Ignore serialization failures and use the fallback below.
    }

    return { code, message: fallbackMessage };
  }

  return { code: null, message: fallbackMessage };
}

export function parseDesktopError(
  error: unknown,
  fallbackMessage = 'Unexpected error'
): DesktopErrorDetails {
  return parseDesktopErrorInternal(error, fallbackMessage, 0);
}
