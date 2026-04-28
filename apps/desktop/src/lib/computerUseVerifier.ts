/**
 * Computer-Use Verifier — Legacy Agent v1
 *
 * Deterministic execution verification for the legacy AiAssistController.
 * Does NOT call paid LLMs. Uses screenshot hash comparison and action-kind heuristics.
 */

import type { InputAction } from '@ai-operator/shared';

export interface ScreenshotObservation {
  pngBase64: string;
  width: number;
  height: number;
  byteLength?: number;
  displayId: string;
  capturedAt: string;
  hash?: string;
}

export interface VerificationResult {
  status: 'verified' | 'uncertain' | 'failed';
  reason: string;
  shouldRetry: boolean;
}

export interface ActionRecord {
  kind: string;
  summary: string;
  verificationStatus?: 'verified' | 'uncertain' | 'failed';
  verificationReason?: string;
  screenshotHashBefore?: string;
  screenshotHashAfter?: string;
}

export async function verifyActionEffect(input: {
  goal: string;
  action: InputAction;
  beforeObservation?: ScreenshotObservation;
  afterObservation?: ScreenshotObservation;
  executionResult: { ok: boolean; message?: string };
  recentActions: ActionRecord[];
}): Promise<VerificationResult> {
  if (!input.executionResult.ok) {
    return {
      status: 'failed',
      reason: `Execution failed: ${input.executionResult.message || 'unknown error'}`,
      shouldRetry: true,
    };
  }

  if (!input.afterObservation) {
    return {
      status: 'uncertain',
      reason: 'No after screenshot available',
      shouldRetry: false,
    };
  }

  if (!input.beforeObservation) {
    return {
      status: 'uncertain',
      reason: 'No before screenshot available',
      shouldRetry: false,
    };
  }

  const hashChanged = input.beforeObservation.hash !== input.afterObservation.hash;

  switch (input.action.kind) {
    case 'click':
    case 'double_click':
    case 'open_app':
      return hashChanged
        ? { status: 'verified', reason: 'Screen changed after action', shouldRetry: false }
        : { status: 'uncertain', reason: 'Screen did not change after click/open', shouldRetry: true };

    case 'type':
    case 'hotkey':
      return hashChanged
        ? { status: 'verified', reason: 'Screen changed after text input', shouldRetry: false }
        : { status: 'failed', reason: 'Screen did not change after text/hotkey input', shouldRetry: true };

    case 'scroll':
      return {
        status: 'uncertain',
        reason: 'Scroll verification requires pixel diff',
        shouldRetry: false,
      };

    default:
      return {
        status: 'uncertain',
        reason: 'Unknown action kind',
        shouldRetry: false,
      };
  }
}

/**
 * Fast SHA-256 hash of a base64 screenshot string.
 * Runs in the main thread — acceptable because screenshots are ~100-300KB base64
 * and hashing is <5ms on modern hardware.
 */
export async function sha256ScreenshotBase64(base64: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const array = Array.from(new Uint8Array(digest));
  return array.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clamp a normalized coordinate to [0, 1].
 * Rejects NaN and Infinity by returning null.
 */
export function validateNormalizedCoord(v: number): number | null {
  if (Number.isNaN(v) || !Number.isFinite(v)) {
    return null;
  }
  return Math.max(0, Math.min(1, v));
}

/**
 * Clamp click/double_click coordinates inside an action.
 * Returns a new action object; does not mutate the original.
 * Returns null if coordinates are NaN/Infinity.
 */
export function clampAction(action: InputAction): InputAction | null {
  switch (action.kind) {
    case 'click':
    case 'double_click': {
      const x = validateNormalizedCoord(action.x);
      const y = validateNormalizedCoord(action.y);
      if (x === null || y === null) {
        return null;
      }
      return { ...action, x, y };
    }
    default:
      return action;
  }
}
