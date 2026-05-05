import {
  SOLANA_MARKET_DATA_PROVIDERS,
  SolanaMarketDataProviderId,
  type SolanaMarketDataProviderDefinition,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// marketDataProviderRegistry.ts
// ----------------------------------------------------------------------------
// Read-only registry access for market data providers.
// No API keys. No network calls. No trading.
// ----------------------------------------------------------------------------

export function getAllMarketDataProviderDefinitions(): SolanaMarketDataProviderDefinition[] {
  return SOLANA_MARKET_DATA_PROVIDERS;
}

export function getMarketDataProviderDefinition(
  id: SolanaMarketDataProviderId
): SolanaMarketDataProviderDefinition | undefined {
  return SOLANA_MARKET_DATA_PROVIDERS.find((p) => p.id === id);
}

export function getAvailableReadOnlyProviders(): SolanaMarketDataProviderDefinition[] {
  return SOLANA_MARKET_DATA_PROVIDERS.filter(
    (p: SolanaMarketDataProviderDefinition) => p.status === 'available_read_only'
  );
}

export function getPlannedProviders(): SolanaMarketDataProviderDefinition[] {
  return SOLANA_MARKET_DATA_PROVIDERS.filter(
    (p: SolanaMarketDataProviderDefinition) => p.status === 'planned' || p.status === 'requires_user_api_key'
  );
}

export function getProviderLabel(id: SolanaMarketDataProviderId): string {
  const def = getMarketDataProviderDefinition(id);
  return def?.name ?? id;
}

export function getProviderStatusLabel(id: SolanaMarketDataProviderId): string {
  const def = getMarketDataProviderDefinition(id);
  switch (def?.status as SolanaMarketDataProviderDefinition['status'] | undefined) {
    case 'available_read_only':
      return 'Available';
    case 'planned':
      return 'Planned';
    case 'requires_user_api_key':
      return 'Requires API Key';
    case 'disabled':
      return 'Disabled';
    default:
      return 'Unknown';
  }
}
