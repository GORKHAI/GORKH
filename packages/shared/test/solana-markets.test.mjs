import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaMarketsItemKind,
  SolanaMarketsItemStatus,
  SolanaMarketsRiskSignalKind,
  SolanaMarketsWatchlistItemSchema,
  SolanaMarketsAccountSnapshotSchema,
  SolanaMarketsTokenMintSnapshotSchema,
  SolanaMarketsWalletSnapshotSchema,
  SolanaMarketsRiskSignalSchema,
  SolanaMarketsItemAnalysisSchema,
  SolanaMarketsWorkspaceStateSchema,
  SolanaMarketsContextSummarySchema,
  SOLANA_MARKETS_PHASE_8_SAFETY_NOTES,
  SOLANA_MARKETS_DENIED_FEATURES,
  SOLANA_MARKETS_TRUSTED_FUTURE_INTEGRATIONS,
  isDeniedMarketsFeature,
  isTrustedFutureIntegration,
  SolanaMarketDataProviderId,
  SolanaMarketDataProviderStatus,
  SolanaMarketDataProviderDefinitionSchema,
  SolanaMarketPriceContextSchema,
  SolanaMarketLiquidityContextSchema,
  SolanaMarketDataContextSchema,
  SolanaMarketProviderConfigSchema,
  SOLANA_MARKET_DATA_PROVIDERS,
  SOLANA_MARKETS_PHASE_17_SAFETY_NOTES,
  SOLANA_MARKETS_DENIED_TRADING_ACTIONS,
  isDeniedTradingAction,
  getMarketDataProviderDefinition,
} from '../dist/index.js';

// ----------------------------------------------------------------------------
// Existing Markets Types
// ----------------------------------------------------------------------------

test('SolanaMarketsItemKind contains all expected kinds', () => {
  assert.equal(SolanaMarketsItemKind.WALLET, 'wallet');
  assert.equal(SolanaMarketsItemKind.TOKEN_MINT, 'token_mint');
  assert.equal(SolanaMarketsItemKind.PROGRAM, 'program');
  assert.equal(SolanaMarketsItemKind.POOL_OR_ACCOUNT, 'pool_or_account');
  assert.equal(SolanaMarketsItemKind.UNKNOWN, 'unknown');
});

test('SolanaMarketsItemStatus contains all expected statuses', () => {
  assert.equal(SolanaMarketsItemStatus.IDLE, 'idle');
  assert.equal(SolanaMarketsItemStatus.LOADING, 'loading');
  assert.equal(SolanaMarketsItemStatus.READY, 'ready');
  assert.equal(SolanaMarketsItemStatus.ERROR, 'error');
  assert.equal(SolanaMarketsItemStatus.ARCHIVED, 'archived');
});

test('SolanaMarketsWatchlistItemSchema validates valid item', () => {
  const valid = {
    id: 'item-1',
    address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    label: 'Test',
    kind: 'token_mint',
    network: 'devnet',
    status: 'idle',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    localOnly: true,
  };
  assert.ok(SolanaMarketsWatchlistItemSchema.safeParse(valid).success);
});

test('SOLANA_MARKETS_DENIED_FEATURES includes swap and drift', () => {
  assert.ok(SOLANA_MARKETS_DENIED_FEATURES.includes('swap'));
  assert.ok(SOLANA_MARKETS_DENIED_FEATURES.includes('drift'));
  assert.ok(SOLANA_MARKETS_DENIED_FEATURES.includes('perps'));
  assert.ok(SOLANA_MARKETS_DENIED_FEATURES.includes('leverage'));
});

test('isDeniedMarketsFeature rejects swap', () => {
  assert.ok(isDeniedMarketsFeature('swap'));
  assert.ok(!isDeniedMarketsFeature('read_only'));
});

test('isTrustedFutureIntegration matches Jupiter', () => {
  assert.ok(isTrustedFutureIntegration('Jupiter'));
  assert.ok(!isTrustedFutureIntegration('UnknownProvider'));
});

// ----------------------------------------------------------------------------
// Market Data Types (Phase 17)
// ----------------------------------------------------------------------------

test('SolanaMarketDataProviderId contains expected providers', () => {
  assert.equal(SolanaMarketDataProviderId.RPC_NATIVE, 'rpc_native');
  assert.equal(SolanaMarketDataProviderId.BIRDEYE_READ_ONLY, 'birdeye_read_only');
  assert.equal(SolanaMarketDataProviderId.QUICKNODE_PLANNED, 'quicknode_planned');
  assert.equal(SolanaMarketDataProviderId.PYTH_PLANNED, 'pyth_planned');
  assert.equal(SolanaMarketDataProviderId.JUPITER_PLANNED, 'jupiter_planned');
  assert.equal(SolanaMarketDataProviderId.METEORA_PLANNED, 'meteora_planned');
  assert.equal(SolanaMarketDataProviderId.ORCA_PLANNED, 'orca_planned');
  assert.equal(SolanaMarketDataProviderId.SAMPLE_OFFLINE, 'sample_offline');
});

test('SOLANA_MARKET_DATA_PROVIDERS includes all 8 providers', () => {
  assert.equal(SOLANA_MARKET_DATA_PROVIDERS.length, 8);
  const ids = SOLANA_MARKET_DATA_PROVIDERS.map((p) => p.id);
  assert.ok(ids.includes('rpc_native'));
  assert.ok(ids.includes('birdeye_read_only'));
  assert.ok(ids.includes('quicknode_planned'));
  assert.ok(ids.includes('pyth_planned'));
  assert.ok(ids.includes('jupiter_planned'));
  assert.ok(ids.includes('meteora_planned'));
  assert.ok(ids.includes('orca_planned'));
  assert.ok(ids.includes('sample_offline'));
});

test('SOLANA_MARKET_DATA_PROVIDERS does not include Drift', () => {
  const ids = SOLANA_MARKET_DATA_PROVIDERS.map((p) => p.id);
  assert.ok(!ids.includes('drift'));
  assert.ok(!ids.includes('drift_planned'));
});

test('Provider registry marks Jupiter as route preview planned, not live trading', () => {
  const jupiter = getMarketDataProviderDefinition('jupiter_planned');
  assert.ok(jupiter);
  assert.ok(jupiter.capabilities.includes('route_preview_planned'));
  assert.equal(jupiter.status, 'planned');
  assert.ok(jupiter.safetyNote.includes('No swap execution'));
});

test('Sample offline provider has isSample capability', () => {
  const sample = getMarketDataProviderDefinition('sample_offline');
  assert.ok(sample);
  assert.equal(sample.status, 'available_read_only');
  assert.equal(sample.requiresApiKey, false);
  assert.equal(sample.storesApiKey, false);
});

test('All providers have storesApiKey set to false', () => {
  for (const p of SOLANA_MARKET_DATA_PROVIDERS) {
    assert.equal(p.storesApiKey, false, `Provider ${p.id} must not store API keys`);
  }
});

test('SolanaMarketDataProviderDefinitionSchema validates valid provider', () => {
  const valid = {
    id: 'rpc_native',
    name: 'Native RPC',
    status: 'available_read_only',
    capabilities: ['account_metadata', 'token_supply'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Safe',
    roadmapNote: 'Done',
  };
  assert.ok(SolanaMarketDataProviderDefinitionSchema.safeParse(valid).success);
});

test('SolanaMarketPriceContextSchema accepts sample context', () => {
  const valid = {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    network: 'devnet',
    provider: 'sample_offline',
    priceUsd: '0.00',
    isSample: true,
    warnings: ['Sample'],
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaMarketPriceContextSchema.safeParse(valid).success);
});

test('SolanaMarketLiquidityContextSchema accepts sample liquidity context', () => {
  const valid = {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    network: 'devnet',
    provider: 'sample_offline',
    pools: [
      {
        protocol: 'Sample DEX',
        poolAddress: 'pool123',
        liquidityUsd: '0.00',
        baseMint: 'mintA',
        quoteMint: 'mintB',
        warning: 'Sample',
      },
    ],
    isSample: true,
    warnings: ['Sample'],
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaMarketLiquidityContextSchema.safeParse(valid).success);
});

test('SolanaMarketDataContextSchema accepts valid context', () => {
  const valid = {
    itemId: 'item-1',
    address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    network: 'devnet',
    providersUsed: ['sample_offline'],
    generatedAt: Date.now(),
    isSample: true,
    warnings: [],
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaMarketDataContextSchema.safeParse(valid).success);
});

test('SolanaMarketProviderConfigSchema validates valid config', () => {
  const valid = {
    provider: 'rpc_native',
    enabled: true,
    apiKeyPresent: false,
    storesApiKey: false,
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaMarketProviderConfigSchema.safeParse(valid).success);
});

test('Provider config schema rejects storesApiKey true', () => {
  const invalid = {
    provider: 'rpc_native',
    enabled: true,
    apiKeyPresent: false,
    storesApiKey: true,
    safetyNotes: [],
  };
  assert.ok(!SolanaMarketProviderConfigSchema.safeParse(invalid).success);
});

test('SOLANA_MARKETS_PHASE_17_SAFETY_NOTES includes read-only/no trades/sample warning', () => {
  assert.ok(SOLANA_MARKETS_PHASE_17_SAFETY_NOTES.some((n) => n.includes('read-only')));
  assert.ok(SOLANA_MARKETS_PHASE_17_SAFETY_NOTES.some((n) => n.includes('No swaps')));
  assert.ok(SOLANA_MARKETS_PHASE_17_SAFETY_NOTES.some((n) => n.includes('manual-click')));
  assert.ok(SOLANA_MARKETS_PHASE_17_SAFETY_NOTES.some((n) => n.includes('Sample data')));
});

test('SOLANA_MARKETS_DENIED_TRADING_ACTIONS includes swap/route/trade/drift', () => {
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('swap'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('route'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('trade'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('order'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('sniper'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('mev'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('leverage'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('perps'));
  assert.ok(SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes('drift'));
});

test('isDeniedTradingAction rejects swap and drift', () => {
  assert.ok(isDeniedTradingAction('swap'));
  assert.ok(isDeniedTradingAction('drift'));
  assert.ok(!isDeniedTradingAction('read_only'));
});

test('Market data constants do not include HumanRail or White Protocol', () => {
  const allText = [
    ...SOLANA_MARKETS_PHASE_17_SAFETY_NOTES,
    ...SOLANA_MARKETS_DENIED_TRADING_ACTIONS,
    ...SOLANA_MARKET_DATA_PROVIDERS.map((p) => `${p.name} ${p.safetyNote} ${p.roadmapNote}`),
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('humanrail'));
  assert.ok(!allText.includes('white protocol'));
});
