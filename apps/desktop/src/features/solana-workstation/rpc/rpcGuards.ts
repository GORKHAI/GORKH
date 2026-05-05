import {
  assertAllowedSolanaRpcMethod,
  isAllowedSolanaRpcMethod,
  isDeniedSolanaRpcMethod,
  type SolanaRpcEndpointConfig,
} from '@gorkh/shared';

export { assertAllowedSolanaRpcMethod, isAllowedSolanaRpcMethod, isDeniedSolanaRpcMethod };

const ALLOWED_LOCAL_ORIGINS = ['http://127.0.0.1', 'http://localhost'];

/**
 * Validate and sanitize an RPC endpoint URL.
 * Rejects dangerous schemes, credential-embedded URLs, and non-local HTTP.
 */
export function sanitizeRpcEndpointUrl(url: string): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: 'Endpoint URL is empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL format.' };
  }

  const scheme = parsed.protocol;

  // Reject dangerous schemes
  if (scheme === 'file:' || scheme === 'data:' || scheme === 'javascript:' || scheme === 'chrome-extension:') {
    return { ok: false, error: `Scheme "${scheme}" is not allowed.` };
  }

  // Allow https for remote endpoints
  if (scheme === 'https:') {
    // ok
  } else if (scheme === 'http:') {
    // Allow http only for local origins
    const isLocal = ALLOWED_LOCAL_ORIGINS.some((origin) => parsed.origin.startsWith(origin));
    if (!isLocal) {
      return { ok: false, error: 'Non-local HTTP endpoints are not allowed for security. Use https:// or local http://127.0.0.1 / http://localhost.' };
    }
  } else {
    return { ok: false, error: `Scheme "${scheme}" is not allowed. Only http: and https: are permitted.` };
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URLs with embedded credentials are not allowed.' };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Build a safe endpoint config from a network selection and optional custom URL override.
 */
export function buildSafeRpcEndpoint(
  network: SolanaRpcEndpointConfig['network'],
  customUrl?: string
): SolanaRpcEndpointConfig {
  const defaults: Record<SolanaRpcEndpointConfig['network'], SolanaRpcEndpointConfig> = {
    devnet: { network: 'devnet', url: 'https://api.devnet.solana.com', label: 'Solana Devnet', isCustom: false },
    'mainnet-beta': { network: 'mainnet-beta', url: 'https://api.mainnet-beta.solana.com', label: 'Solana Mainnet', isCustom: false },
    localnet: { network: 'localnet', url: 'http://127.0.0.1:8899', label: 'Local Validator', isCustom: false },
  };

  if (customUrl) {
    const sanitized = sanitizeRpcEndpointUrl(customUrl);
    if (sanitized.ok && sanitized.url) {
      return { network, url: sanitized.url, label: 'Custom Endpoint', isCustom: true };
    }
  }

  return defaults[network];
}
