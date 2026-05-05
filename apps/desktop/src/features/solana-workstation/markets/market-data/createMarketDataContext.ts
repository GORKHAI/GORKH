import {
  type SolanaMarketsWatchlistItem,
  type SolanaMarketPriceContext,
  type SolanaMarketLiquidityContext,
  type SolanaMarketDataContext,
  type SolanaMarketDataProviderId,
  SOLANA_MARKETS_PHASE_17_SAFETY_NOTES,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// createMarketDataContext
// ----------------------------------------------------------------------------
// Combines a markets watchlist item with optional price/liquidity context.
// No fetch. No API calls. No trading.
// ----------------------------------------------------------------------------

export interface CreateMarketDataContextInput {
  item: SolanaMarketsWatchlistItem;
  priceContext?: SolanaMarketPriceContext;
  liquidityContext?: SolanaMarketLiquidityContext;
}

export function createMarketDataContext(
  input: CreateMarketDataContextInput
): SolanaMarketDataContext {
  const { item, priceContext, liquidityContext } = input;
  const providersUsed: SolanaMarketDataProviderId[] = [];

  if (priceContext) {
    providersUsed.push(priceContext.provider);
  }
  if (liquidityContext) {
    providersUsed.push(liquidityContext.provider);
  }

  // Deduplicate providers
  const uniqueProviders = Array.from(new Set(providersUsed));

  const warnings: string[] = [];
  const safetyNotes: string[] = [...SOLANA_MARKETS_PHASE_17_SAFETY_NOTES];

  if (priceContext?.isSample || liquidityContext?.isSample) {
    warnings.push('Sample data is present. Not real market data.');
    safetyNotes.push('Sample data is clearly marked and must not be used for trading.');
  }

  if (!priceContext && !liquidityContext) {
    warnings.push('No market data context available. Use Sample Offline provider to generate UI preview.');
  }

  return {
    itemId: item.id,
    address: item.address,
    network: item.network,
    providersUsed: uniqueProviders as ['rpc_native'] | ['sample_offline'] | ['rpc_native', 'sample_offline'],
    priceContext,
    liquidityContext,
    generatedAt: Date.now(),
    isSample: priceContext?.isSample ?? liquidityContext?.isSample ?? false,
    warnings,
    safetyNotes,
  };
}
