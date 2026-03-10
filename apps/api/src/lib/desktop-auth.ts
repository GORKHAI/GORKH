import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const DEFAULT_DESKTOP_AUTH_ATTEMPT_TTL_MS = 10 * 60 * 1000;
export const MAX_DESKTOP_HANDOFF_TTL_MS = 2 * 60 * 1000;

export type DesktopAuthConsumeError =
  | 'HANDOFF_NOT_FOUND'
  | 'HANDOFF_EXPIRED'
  | 'HANDOFF_ALREADY_USED'
  | 'DEVICE_MISMATCH'
  | 'STATE_MISMATCH'
  | 'NONCE_MISMATCH';

export type DesktopLoopbackCallbackValidationResult =
  | {
      ok: true;
      callbackUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

interface DesktopAuthAttemptRecord {
  attemptId: string;
  deviceId: string;
  callbackUrl: string;
  state: string;
  stateHash: string;
  nonceHash: string;
  expiresAt: number;
}

interface DesktopAuthHandoffRecord {
  attemptId: string;
  userId: string;
  deviceId: string;
  callbackUrl: string;
  state: string;
  stateHash: string;
  nonceHash: string;
  expiresAt: number;
  consumedAt?: number;
}

interface DesktopAuthStoreOptions {
  now?: () => number;
  createAttemptId?: () => string;
  createHandoffToken?: () => string;
}

interface StartAttemptInput {
  deviceId: string;
  callbackUrl: string;
  state: string;
  nonce: string;
  ttlMs?: number;
}

interface IssueHandoffInput {
  attemptId: string;
  userId: string;
  ttlMs?: number;
}

interface ConsumeHandoffInput {
  handoffToken: string;
  deviceId: string;
  state: string;
  nonce: string;
}

interface StartedDesktopAuthAttempt {
  attemptId: string;
  expiresAt: number;
}

interface IssuedDesktopAuthHandoff {
  ok: true;
  attemptId: string;
  handoffToken: string;
  callbackUrl: string;
  state: string;
  deviceId: string;
  userId: string;
  expiresAt: number;
}

interface FailedDesktopAuthHandoffIssue {
  ok: false;
  error: 'ATTEMPT_NOT_FOUND' | 'ATTEMPT_EXPIRED';
}

type DesktopAuthHandoffIssueResult =
  | IssuedDesktopAuthHandoff
  | FailedDesktopAuthHandoffIssue;

interface ConsumedDesktopAuthHandoff {
  ok: true;
  attemptId: string;
  userId: string;
  deviceId: string;
}

interface FailedDesktopAuthHandoffConsume {
  ok: false;
  error: DesktopAuthConsumeError;
}

type DesktopAuthHandoffConsumeResult =
  | ConsumedDesktopAuthHandoff
  | FailedDesktopAuthHandoffConsume;

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function defaultCreateHandoffToken(): string {
  return randomBytes(32).toString('base64url');
}

export function validateDesktopLoopbackCallbackUrl(
  callbackUrl: string
): DesktopLoopbackCallbackValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(callbackUrl);
  } catch {
    return {
      ok: false,
      error: 'Invalid callback URL',
    };
  }

  if (parsed.protocol !== 'http:') {
    return {
      ok: false,
      error: 'Desktop callback must use http loopback',
    };
  }

  if (parsed.hostname !== '127.0.0.1') {
    return {
      ok: false,
      error: 'Desktop callback must use 127.0.0.1',
    };
  }

  if (!parsed.port) {
    return {
      ok: false,
      error: 'Desktop callback must include an explicit port',
    };
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    return {
      ok: false,
      error: 'Desktop callback must include a callback path',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      error: 'Desktop callback must not include credentials',
    };
  }

  parsed.hash = '';

  return {
    ok: true,
    callbackUrl: parsed.toString(),
  };
}

export function buildDesktopSignInUrl(appBaseUrl: string, attemptId: string): string {
  const url = new URL('/desktop/sign-in', appBaseUrl);
  url.searchParams.set('attemptId', attemptId);
  return url.toString();
}

// Short-lived browser handoff state is kept in memory because the product
// currently enforces single-instance API deployment. Durable device ownership
// remains on the persisted Device row and existing deviceToken model.
export function createDesktopAuthStore(options: DesktopAuthStoreOptions = {}) {
  const now = options.now ?? Date.now;
  const createAttemptId = options.createAttemptId ?? randomUUID;
  const createHandoffToken = options.createHandoffToken ?? defaultCreateHandoffToken;

  const attempts = new Map<string, DesktopAuthAttemptRecord>();
  const handoffs = new Map<string, DesktopAuthHandoffRecord>();

  function pruneExpired(): void {
    const currentTime = now();

    for (const [attemptId, attempt] of attempts) {
      if (attempt.expiresAt <= currentTime) {
        attempts.delete(attemptId);
      }
    }

    for (const [tokenHash, handoff] of handoffs) {
      if (handoff.consumedAt && handoff.expiresAt <= currentTime) {
        handoffs.delete(tokenHash);
      }
    }
  }

  function startAttempt(input: StartAttemptInput): StartedDesktopAuthAttempt {
    pruneExpired();

    const attemptId = createAttemptId();
    const expiresAt = now() + Math.max(1, input.ttlMs ?? DEFAULT_DESKTOP_AUTH_ATTEMPT_TTL_MS);

    attempts.set(attemptId, {
      attemptId,
      deviceId: input.deviceId,
      callbackUrl: input.callbackUrl,
      state: input.state,
      stateHash: hashValue(input.state),
      nonceHash: hashValue(input.nonce),
      expiresAt,
    });

    return {
      attemptId,
      expiresAt,
    };
  }

  function issueHandoff(input: IssueHandoffInput): DesktopAuthHandoffIssueResult {
    pruneExpired();

    const attempt = attempts.get(input.attemptId);
    if (!attempt) {
      return {
        ok: false,
        error: 'ATTEMPT_NOT_FOUND',
      };
    }

    if (attempt.expiresAt <= now()) {
      attempts.delete(input.attemptId);
      return {
        ok: false,
        error: 'ATTEMPT_EXPIRED',
      };
    }

    const handoffToken = createHandoffToken();
    const tokenHash = hashValue(handoffToken);
    const expiresAt = now() + Math.min(MAX_DESKTOP_HANDOFF_TTL_MS, Math.max(1, input.ttlMs ?? MAX_DESKTOP_HANDOFF_TTL_MS));

    handoffs.set(tokenHash, {
      attemptId: attempt.attemptId,
      userId: input.userId,
      deviceId: attempt.deviceId,
      callbackUrl: attempt.callbackUrl,
      state: attempt.state,
      stateHash: attempt.stateHash,
      nonceHash: attempt.nonceHash,
      expiresAt,
    });

    return {
      ok: true,
      attemptId: attempt.attemptId,
      handoffToken,
      callbackUrl: attempt.callbackUrl,
      state: attempt.state,
      deviceId: attempt.deviceId,
      userId: input.userId,
      expiresAt,
    };
  }

  function consumeHandoff(input: ConsumeHandoffInput): DesktopAuthHandoffConsumeResult {
    pruneExpired();

    const tokenHash = hashValue(input.handoffToken);
    const handoff = handoffs.get(tokenHash);

    if (!handoff) {
      return {
        ok: false,
        error: 'HANDOFF_NOT_FOUND',
      };
    }

    if (handoff.expiresAt <= now()) {
      handoffs.delete(tokenHash);
      return {
        ok: false,
        error: 'HANDOFF_EXPIRED',
      };
    }

    if (handoff.consumedAt) {
      return {
        ok: false,
        error: 'HANDOFF_ALREADY_USED',
      };
    }

    if (handoff.deviceId !== input.deviceId) {
      return {
        ok: false,
        error: 'DEVICE_MISMATCH',
      };
    }

    if (handoff.stateHash !== hashValue(input.state)) {
      return {
        ok: false,
        error: 'STATE_MISMATCH',
      };
    }

    if (handoff.nonceHash !== hashValue(input.nonce)) {
      return {
        ok: false,
        error: 'NONCE_MISMATCH',
      };
    }

    handoff.consumedAt = now();

    return {
      ok: true,
      attemptId: handoff.attemptId,
      userId: handoff.userId,
      deviceId: handoff.deviceId,
    };
  }

  return {
    startAttempt,
    issueHandoff,
    consumeHandoff,
    pruneExpired,
  };
}

export const desktopAuth = createDesktopAuthStore();
