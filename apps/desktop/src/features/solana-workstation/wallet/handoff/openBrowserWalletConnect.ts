import { invoke } from '@tauri-apps/api/core';
import type { SolanaWalletHandoffRequest } from '@gorkh/shared';

interface OpenExternalUrlResult {
  ok: boolean;
  error?: string;
}

export function buildWalletConnectUrl(input: {
  webOrigin: string;
  request: SolanaWalletHandoffRequest;
}): string {
  const url = new URL('/desktop/wallet-connect', input.webOrigin);
  url.searchParams.set('requestId', input.request.requestId);
  url.searchParams.set('nonce', input.request.nonce);
  url.searchParams.set('network', input.request.network);
  return url.toString();
}

export async function openBrowserWalletConnect(input: {
  runtimeHttpBase: string;
  request: SolanaWalletHandoffRequest;
}): Promise<void> {
  const url = buildWalletConnectUrlFromRuntime(input.runtimeHttpBase, input.request);
  const result = await invoke<OpenExternalUrlResult>('open_external_url', { url });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to open system browser for wallet connection');
  }
}

export function buildWalletConnectUrlFromRuntime(
  runtimeHttpBase: string,
  request: SolanaWalletHandoffRequest
): string {
  // runtimeHttpBase points to the API server; the web app may be on a different origin.
  // In development, the web app runs on localhost:3000 and API on localhost:3001.
  // We derive the web origin from the API base by replacing the port.
  try {
    const apiUrl = new URL(runtimeHttpBase);
    // Default web port heuristic: if API is 3001, web is likely 3000
    const webPort = apiUrl.port === '3001' ? '3000' : apiUrl.port;
    const webOrigin = `${apiUrl.protocol}//${apiUrl.hostname}:${webPort}`;
    return buildWalletConnectUrl({ webOrigin, request });
  } catch {
    // Fallback: use a safe default origin
    return buildWalletConnectUrl({ webOrigin: 'http://localhost:3000', request });
  }
}
