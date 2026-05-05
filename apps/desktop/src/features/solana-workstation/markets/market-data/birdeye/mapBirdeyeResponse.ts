import {
  SolanaMarketDataProviderId,
  type SolanaMarketPriceContext,
  type SolanaRpcNetwork,
  SOLANA_MARKETS_PHASE_18_SAFETY_NOTES,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// mapBirdeyeResponse.ts
// ----------------------------------------------------------------------------
// Defensively maps Birdeye API responses into SolanaMarketPriceContext.
// Handles multiple common response shapes. Never assumes exact schema.
// ----------------------------------------------------------------------------

function extractNestedValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function toNumberStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') {
    // Use enough precision for crypto prices
    return String(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return value;
  }
  return undefined;
}

export function mapBirdeyePriceResponse(
  raw: unknown,
  mintAddress: string,
  network: SolanaRpcNetwork
): SolanaMarketPriceContext {
  const warnings: string[] = [];

  // Try common Birdeye response shapes:
  // { data: { value: number } }
  // { data: { price: number } }
  // { success: true, data: { value: number } }
  const data = extractNestedValue(raw, ['data']) ?? raw;

  const priceUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['value'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['price'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'value'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'price']));

  const priceChange24hPct =
    toNumberStringOrUndefined(extractNestedValue(data, ['priceChange24hPercent'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['priceChange24h'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'priceChange24hPercent']));

  const volume24hUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['v24hUSD'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['volume24hUSD'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['volume24h'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'v24hUSD']));

  const liquidityUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['liquidity'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'liquidity']));

  const marketCapUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['marketCap'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['mcap'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'marketCap']));

  if (!priceUsd) {
    warnings.push('Price field not found in Birdeye response. Response shape may have changed.');
  }

  return {
    mintAddress,
    network,
    provider: SolanaMarketDataProviderId.BIRDEYE_READ_ONLY,
    priceUsd,
    priceChange24hPct,
    volume24hUsd,
    liquidityUsd,
    marketCapUsd,
    fetchedAt: Date.now(),
    isSample: false,
    warnings,
    safetyNotes: [...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES],
  };
}

export function mapBirdeyeOverviewResponse(
  raw: unknown,
  mintAddress: string,
  network: SolanaRpcNetwork
): { priceContext: SolanaMarketPriceContext; overviewSummary: string } {
  const warnings: string[] = [];

  const data = extractNestedValue(raw, ['data']) ?? raw;

  const priceUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['price'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['value'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'price']));

  const priceChange24hPct =
    toNumberStringOrUndefined(extractNestedValue(data, ['priceChange24hPercent'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['priceChange24h'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'priceChange24hPercent']));

  const volume24hUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['v24hUSD'])) ??
    toNumberStringOrUndefined(extractNestedValue(data, ['volume24hUSD'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'v24hUSD']));

  const liquidityUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['liquidity'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'liquidity']));

  const marketCapUsd =
    toNumberStringOrUndefined(extractNestedValue(data, ['marketCap'])) ??
    toNumberStringOrUndefined(extractNestedValue(raw, ['data', 'marketCap']));

  const symbol = toStringOrUndefined(extractNestedValue(data, ['symbol']));
  const name = toStringOrUndefined(extractNestedValue(data, ['name']));

  if (!priceUsd) {
    warnings.push('Price field not found in Birdeye token overview response.');
  }

  const summaryParts: string[] = [];
  if (name) summaryParts.push(`Name: ${name}`);
  if (symbol) summaryParts.push(`Symbol: ${symbol}`);
  if (priceUsd) summaryParts.push(`Price: $${priceUsd}`);
  if (marketCapUsd) summaryParts.push(`Market Cap: $${marketCapUsd}`);
  if (volume24hUsd) summaryParts.push(`Volume 24h: $${volume24hUsd}`);

  const overviewSummary = summaryParts.length > 0
    ? summaryParts.join(' · ')
    : 'Token overview returned with no recognizable fields.';

  const priceContext: SolanaMarketPriceContext = {
    mintAddress,
    network,
    provider: SolanaMarketDataProviderId.BIRDEYE_READ_ONLY,
    priceUsd,
    priceChange24hPct,
    volume24hUsd,
    liquidityUsd,
    marketCapUsd,
    fetchedAt: Date.now(),
    isSample: false,
    warnings,
    safetyNotes: [...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES],
  };

  return { priceContext, overviewSummary };
}
