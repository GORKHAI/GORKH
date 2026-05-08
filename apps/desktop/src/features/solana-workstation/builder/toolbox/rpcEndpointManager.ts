import {
  NetworkHealthSnapshotSchema,
  RpcBenchmarkResultSchema,
  RpcEndpointProfileSchema,
  type BuilderToolboxCluster,
  type NetworkHealthSnapshot,
  type RpcBenchmarkResult,
  type RpcEndpointProfile,
} from '@gorkh/shared';
import type { SolanaRpcEndpointConfig } from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.builderToolbox.rpcEndpoints.v1';
const SECRET_QUERY_KEYS = /(?:api[-_]?key|apikey|token|auth|secret|access[-_]?key|key)=/i;
const SECRET_PATH_HINT = /(?:api[-_]?key|token|secret|rpc\/[A-Za-z0-9_-]{12,})/i;

export const DEFAULT_BUILDER_ENDPOINTS: RpcEndpointProfile[] = [
  makeEndpointProfile('Solana Devnet', 'https://api.devnet.solana.com', 'devnet', true),
  makeEndpointProfile('Solana Mainnet', 'https://api.mainnet-beta.solana.com', 'mainnet', false),
  makeEndpointProfile('Local Validator', 'http://127.0.0.1:8899', 'localnet', false),
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function redactedRpcUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const redacted = new URL(parsed.origin);
    if (parsed.pathname && parsed.pathname !== '/') {
      redacted.pathname = SECRET_PATH_HINT.test(parsed.pathname) ? '/••••••' : parsed.pathname;
    }
    if (parsed.search) redacted.search = '?••••••';
    return redacted.toString();
  } catch {
    return 'invalid-url';
  }
}

export function isLikelySensitiveRpcUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return SECRET_QUERY_KEYS.test(parsed.search) || SECRET_PATH_HINT.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function makeEndpointProfile(
  label: string,
  url: string,
  cluster: BuilderToolboxCluster,
  isDefault = false,
  websocketUrl?: string
): RpcEndpointProfile {
  const now = Date.now();
  const profile = {
    id: id('builder-rpc'),
    label: label.trim(),
    url: url.trim(),
    websocketUrl: websocketUrl?.trim() || undefined,
    redactedUrl: redactedRpcUrl(url),
    cluster,
    enabled: true,
    isDefault,
    createdAt: now,
    updatedAt: now,
  };
  const result = RpcEndpointProfileSchema.safeParse(profile);
  if (!result.success) throw new Error('Invalid RPC endpoint profile.');
  return result.data;
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function assertSafeEndpointForLocalStorage(endpoint: RpcEndpointProfile): void {
  const serialized = JSON.stringify(endpoint);
  if (isLikelySensitiveRpcUrl(endpoint.url) || (endpoint.websocketUrl && isLikelySensitiveRpcUrl(endpoint.websocketUrl))) {
    throw new Error('Sensitive RPC URLs with API keys or tokens are not stored in localStorage in Builder Toolbox v0.1.');
  }
  if (/api[-_]?key|token|secret|auth header/i.test(serialized)) {
    throw new Error('RPC endpoint profile refused secret-like material.');
  }
}

export function loadRpcEndpointProfiles(): RpcEndpointProfile[] {
  const storage = getStorage();
  if (!storage) return DEFAULT_BUILDER_ENDPOINTS;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_BUILDER_ENDPOINTS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_BUILDER_ENDPOINTS;
    const endpoints = parsed
      .map((item) => RpcEndpointProfileSchema.safeParse(item))
      .filter((result): result is { success: true; data: RpcEndpointProfile } => result.success)
      .map((result) => result.data);
    return endpoints.length > 0 ? endpoints : DEFAULT_BUILDER_ENDPOINTS;
  } catch {
    return DEFAULT_BUILDER_ENDPOINTS;
  }
}

export function saveRpcEndpointProfiles(endpoints: RpcEndpointProfile[]): void {
  for (const endpoint of endpoints) assertSafeEndpointForLocalStorage(endpoint);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(endpoints.map((endpoint) => ({ ...endpoint, redactedUrl: redactedRpcUrl(endpoint.url) }))));
}

export function toSolanaRpcEndpointConfig(endpoint: RpcEndpointProfile): SolanaRpcEndpointConfig {
  return {
    label: endpoint.label,
    url: endpoint.url,
    network: endpoint.cluster === 'mainnet' ? 'mainnet-beta' : endpoint.cluster === 'testnet' || endpoint.cluster === 'custom' ? 'devnet' : endpoint.cluster,
    isCustom: endpoint.cluster === 'custom' || endpoint.cluster === 'testnet',
  };
}

export function sortBenchmarkResults(results: RpcBenchmarkResult[]): RpcBenchmarkResult[] {
  return [...results].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'healthy' ? -1 : b.status === 'healthy' ? 1 : 0;
    return (a.latencyMs ?? Number.MAX_SAFE_INTEGER) - (b.latencyMs ?? Number.MAX_SAFE_INTEGER);
  });
}

export function createBenchmarkResult(candidate: RpcBenchmarkResult): RpcBenchmarkResult {
  const result = RpcBenchmarkResultSchema.safeParse(candidate);
  if (!result.success) throw new Error('Invalid benchmark result.');
  return result.data;
}

export function createIdleNetworkHealth(cluster: BuilderToolboxCluster): NetworkHealthSnapshot {
  return NetworkHealthSnapshotSchema.parse({
    selectedCluster: cluster,
    websocketStatus: 'idle',
    subscriptionEventCount: 0,
    status: 'idle',
    warnings: ['Network monitor uses allowlisted read-only RPC calls only.'],
  });
}

export const BUILDER_TOOLBOX_RPC_ENDPOINT_STORAGE_KEY = STORAGE_KEY;
