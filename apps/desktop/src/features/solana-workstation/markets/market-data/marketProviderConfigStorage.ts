import {
  SolanaMarketProviderConfigSchema,
  type SolanaMarketProviderConfig,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// marketProviderConfigStorage.ts
// ----------------------------------------------------------------------------
// Stores provider configuration (enabled status, apiKeyPresent boolean).
// Does NOT store actual API keys. Validates with Zod.
// ----------------------------------------------------------------------------

const STORAGE_KEY = 'gorkh.solana.markets.providerConfig.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadMarketProviderConfigs(): SolanaMarketProviderConfig[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: SolanaMarketProviderConfig[] = [];
    for (const item of parsed) {
      const result = SolanaMarketProviderConfigSchema.safeParse(item);
      if (result.success) valid.push(result.data);
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveMarketProviderConfigs(configs: SolanaMarketProviderConfig[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // localStorage may be full
  }
}

export function clearMarketProviderConfigs(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createDefaultProviderConfigs(): SolanaMarketProviderConfig[] {
  return [
    {
      provider: 'rpc_native',
      enabled: true,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Native RPC uses the configured endpoint. No external API key needed.'],
    },
    {
      provider: 'sample_offline',
      enabled: true,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Sample data is for UI development only. Not real market data.'],
    },
    {
      provider: 'birdeye_planned',
      enabled: false,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Birdeye requires a user-provided API key. Key is never stored by GORKH.'],
    },
    {
      provider: 'quicknode_planned',
      enabled: false,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['QuickNode requires a user-provided endpoint or API key. Key is never stored by GORKH.'],
    },
    {
      provider: 'pyth_planned',
      enabled: false,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Pyth integration is planned. No API key needed.'],
    },
    {
      provider: 'jupiter_planned',
      enabled: false,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Jupiter route preview is planned only. No trading execution.'],
    },
    {
      provider: 'meteora_planned',
      enabled: false,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Meteora integration is planned. No API key needed.'],
    },
    {
      provider: 'orca_planned',
      enabled: false,
      apiKeyPresent: false,
      storesApiKey: false,
      safetyNotes: ['Orca integration is planned. No API key needed.'],
    },
  ];
}

export function getOrCreateProviderConfigs(): SolanaMarketProviderConfig[] {
  const stored = loadMarketProviderConfigs();
  if (stored.length > 0) return stored;
  const defaults = createDefaultProviderConfigs();
  saveMarketProviderConfigs(defaults);
  return defaults;
}
