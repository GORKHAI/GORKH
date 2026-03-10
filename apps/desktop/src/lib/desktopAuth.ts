import { invoke } from '@tauri-apps/api/core';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';

interface KeyResult {
  ok: boolean;
  error?: string;
}

interface DesktopAuthLoopbackStart {
  callbackUrl: string;
}

interface DesktopAuthLoopbackFinish {
  handoffToken: string;
  state: string;
}

interface DesktopAuthStartResponse {
  ok: true;
  attemptId: string;
  expiresAt: number;
  authUrl: string;
}

interface DesktopAuthExchangeResponse {
  ok: true;
  deviceToken: string;
}

interface DesktopAuthLogoutResponse {
  ok: true;
}

interface DesktopAuthErrorResponse {
  error?: string;
}

export const DESKTOP_AUTH_CALLBACK_TIMEOUT_MS = 125_000;

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function expectJsonOk<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await readJson<T & DesktopAuthErrorResponse>(response);
  if (!response.ok) {
    throw new Error(body.error || fallbackMessage);
  }

  return body;
}

async function openExternalBrowser(authUrl: string): Promise<void> {
  const result = await invoke<KeyResult>('open_external_url', { url: authUrl });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to open system browser');
  }
}

async function cancelLoopbackListener(): Promise<void> {
  try {
    await invoke<KeyResult>('desktop_auth_listen_cancel');
  } catch {
    // Best-effort cleanup only.
  }
}

// Desktop sign-in uses the external system browser plus a native loopback
// callback so the durable device token never passes through an embedded webview.
export async function startDesktopSignIn(input: {
  runtimeConfig: DesktopApiRuntimeConfig;
  deviceId: string;
}): Promise<{ deviceToken: string }> {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const loopback = await invoke<DesktopAuthLoopbackStart>('desktop_auth_listen_start', {
    state,
    timeoutMs: DESKTOP_AUTH_CALLBACK_TIMEOUT_MS,
  });

  try {
    const startResponse = await fetch(`${input.runtimeConfig.httpBase}/desktop/auth/start`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: input.deviceId,
        callbackUrl: loopback.callbackUrl,
        state,
        nonce,
      }),
    });

    const started = await expectJsonOk<DesktopAuthStartResponse>(
      startResponse,
      'Desktop sign-in could not be started'
    );

    await openExternalBrowser(started.authUrl);

    const callback = await invoke<DesktopAuthLoopbackFinish>('desktop_auth_listen_finish', {
      timeoutMs: DESKTOP_AUTH_CALLBACK_TIMEOUT_MS,
    });

    if (callback.state !== state) {
      throw new Error('Desktop sign-in state mismatch');
    }

    const exchangeResponse = await fetch(`${input.runtimeConfig.httpBase}/desktop/auth/exchange`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        handoffToken: callback.handoffToken,
        deviceId: input.deviceId,
        state,
        nonce,
      }),
    });

    const exchanged = await expectJsonOk<DesktopAuthExchangeResponse>(
      exchangeResponse,
      'Desktop sign-in token exchange failed'
    );

    return {
      deviceToken: exchanged.deviceToken,
    };
  } catch (error) {
    await cancelLoopbackListener();
    throw error;
  }
}

export async function logoutDesktopSession(input: {
  runtimeConfig: DesktopApiRuntimeConfig;
  deviceToken: string;
}): Promise<void> {
  const response = await fetch(`${input.runtimeConfig.httpBase}/desktop/auth/logout`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.deviceToken}`,
    },
  });

  await expectJsonOk<DesktopAuthLogoutResponse>(response, 'Desktop sign-out remote revoke failed');
}
