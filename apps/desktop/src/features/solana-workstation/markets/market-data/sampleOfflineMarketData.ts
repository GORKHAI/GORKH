import {
  SolanaMarketDataProviderId,
  type SolanaMarketPriceContext,
  type SolanaMarketLiquidityContext,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// sampleOfflineMarketData.ts
// ----------------------------------------------------------------------------
// Deterministic sample market data for UI development and testing only.
// isSample: true. Clearly marked. Not real market data.
// No external APIs. No trading. No execution.
// ----------------------------------------------------------------------------

const SAMPLE_SAFETY_NOTES = [
  'Sample data only. Not real market data.',
  'Do not use for trading.',
  'Values are illustrative and do not reflect actual market conditions.',
];

const SAMPLE_WARNINGS = [
  'This is deterministic sample data for UI development.',
];

export function createSamplePriceContext(
  mintAddress: string,
  network: string
): SolanaMarketPriceContext {
  return {
    mintAddress,
    network: network as 'devnet' | 'mainnet-beta' | 'localnet',
    provider: SolanaMarketDataProviderId.SAMPLE_OFFLINE,
    priceUsd: '0.00',
    priceChange24hPct: '0.00',
    volume24hUsd: '0.00',
    liquidityUsd: '0.00',
    marketCapUsd: '0.00',
    isSample: true,
    warnings: [...SAMPLE_WARNINGS],
    safetyNotes: [...SAMPLE_SAFETY_NOTES],
  };
}

export function createSampleLiquidityContext(
  mintAddress: string,
  network: string
): SolanaMarketLiquidityContext {
  return {
    mintAddress,
    network: network as 'devnet' | 'mainnet-beta' | 'localnet',
    provider: SolanaMarketDataProviderId.SAMPLE_OFFLINE,
    pools: [
      {
        protocol: 'Sample DEX',
        poolAddress: undefined,
        liquidityUsd: '0.00',
        baseMint: mintAddress,
        quoteMint: 'SampleQuoteMint',
        warning: 'Sample pool data. Not a real liquidity pool.',
      },
    ],
    isSample: true,
    warnings: [...SAMPLE_WARNINGS],
    safetyNotes: [...SAMPLE_SAFETY_NOTES],
  };
}
