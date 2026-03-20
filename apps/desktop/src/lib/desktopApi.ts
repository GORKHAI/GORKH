import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';

function isNetworkFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /load failed|failed to fetch|networkerror|fetch failed/i.test(message);
}

function buildNetworkFailureMessage(
  label: string,
  runtimeConfig: DesktopApiRuntimeConfig,
  path: string,
): string {
  return `${label} could not reach the API (${runtimeConfig.httpBase}${path}). This usually means a network or CORS problem.`;
}

export async function fetchDesktopApiJson<T>(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string,
  path: string,
  label: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${runtimeConfig.httpBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceToken}`,
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    if (isNetworkFailure(error)) {
      throw new Error(buildNetworkFailureMessage(label, runtimeConfig, path));
    }

    throw new Error(error instanceof Error ? error.message : `${label} request failed`);
  }

  const data = await response.json().catch(() => ({ error: 'Request failed' }));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `${label} request failed`);
  }

  return data as T;
}
