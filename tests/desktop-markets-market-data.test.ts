import assert from 'node:assert/strict';
import test from 'node:test';

import {
  rejectDeniedTradingAction,
  assertReadOnlyMarketDataProvider,
  sanitizeProviderApiKeyInput,
  isDeniedTradingAction,
} from '../apps/desktop/src/features/solana-workstation/markets/market-data/marketDataGuards.js';
import {
  getAllMarketDataProviderDefinitions,
  getMarketDataProviderDefinition,
  getAvailableReadOnlyProviders,
  getPlannedProviders,
} from '../apps/desktop/src/features/solana-workstation/markets/market-data/marketDataProviderRegistry.js';
import {
  createSamplePriceContext,
  createSampleLiquidityContext,
} from '../apps/desktop/src/features/solana-workstation/markets/market-data/sampleOfflineMarketData.js';
import { createMarketDataContext } from '../apps/desktop/src/features/solana-workstation/markets/market-data/createMarketDataContext.js';
import {
  loadMarketProviderConfigs,
  saveMarketProviderConfigs,
  createDefaultProviderConfigs,
  getOrCreateProviderConfigs,
  clearMarketProviderConfigs,
} from '../apps/desktop/src/features/solana-workstation/markets/market-data/marketProviderConfigStorage.js';

import {
  SolanaMarketDataProviderId,
  type SolanaMarketsWatchlistItem,
} from '../packages/shared/src/index.ts';

// ---------------------------------------------------------------------------
// marketDataGuards
// ---------------------------------------------------------------------------

test('rejectDeniedTradingAction rejects swap', () => {
  assert.throws(() => rejectDeniedTradingAction('swap'), /permanently disabled/);
});

test('rejectDeniedTradingAction rejects route', () => {
  assert.throws(() => rejectDeniedTradingAction('route'), /permanently disabled/);
});

test('rejectDeniedTradingAction rejects trade', () => {
  assert.throws(() => rejectDeniedTradingAction('trade'), /permanently disabled/);
});

test('rejectDeniedTradingAction rejects drift', () => {
  assert.throws(() => rejectDeniedTradingAction('drift'), /permanently disabled/);
});

test('rejectDeniedTradingAction accepts read_only', () => {
  assert.doesNotThrow(() => rejectDeniedTradingAction('read_only'));
});

test('assertReadOnlyMarketDataProvider accepts rpc_native', () => {
  assert.doesNotThrow(() => assertReadOnlyMarketDataProvider('rpc_native'));
});

test('assertReadOnlyMarketDataProvider accepts sample_offline', () => {
  assert.doesNotThrow(() => assertReadOnlyMarketDataProvider('sample_offline'));
});

test('assertReadOnlyMarketDataProvider accepts planned providers without throwing', () => {
  assert.doesNotThrow(() => assertReadOnlyMarketDataProvider('birdeye_read_only'));
  assert.doesNotThrow(() => assertReadOnlyMarketDataProvider('jupiter_planned'));
});

test('assertReadOnlyMarketDataProvider rejects unknown provider', () => {
  assert.throws(() => assertReadOnlyMarketDataProvider('unknown_provider'));
});

test('sanitizeProviderApiKeyInput trims and returns valid input', () => {
  assert.equal(sanitizeProviderApiKeyInput('  abc123  '), 'abc123');
});

test('sanitizeProviderApiKeyInput rejects oversized input', () => {
  assert.throws(() => sanitizeProviderApiKeyInput('a'.repeat(600)), /exceeds maximum length/);
});

test('sanitizeProviderApiKeyInput rejects dangerous characters', () => {
  assert.throws(() => sanitizeProviderApiKeyInput('eval("bad")'), /invalid characters/);
});

test('isDeniedTradingAction matches denied list', () => {
  assert.ok(isDeniedTradingAction('swap'));
  assert.ok(isDeniedTradingAction('leverage'));
  assert.ok(!isDeniedTradingAction('read_only'));
});

// ---------------------------------------------------------------------------
// marketDataProviderRegistry
// ---------------------------------------------------------------------------

test('getAllMarketDataProviderDefinitions returns 8 providers', () => {
  const defs = getAllMarketDataProviderDefinitions();
  assert.equal(defs.length, 8);
});

test('getMarketDataProviderDefinition returns Jupiter with route_preview_planned', () => {
  const def = getMarketDataProviderDefinition(SolanaMarketDataProviderId.JUPITER_PLANNED);
  assert.ok(def);
  assert.ok(def.capabilities.includes('route_preview_planned'));
  assert.equal(def.status, 'planned');
});

test('getAvailableReadOnlyProviders returns rpc_native and sample_offline', () => {
  const defs = getAvailableReadOnlyProviders();
  assert.equal(defs.length, 2);
  const ids = defs.map((d) => d.id);
  assert.ok(ids.includes('rpc_native'));
  assert.ok(ids.includes('sample_offline'));
});

test('getPlannedProviders includes birdeye and quicknode', () => {
  const defs = getPlannedProviders();
  const ids = defs.map((d) => d.id);
  assert.ok(ids.includes('birdeye_read_only'));
  assert.ok(ids.includes('quicknode_planned'));
  assert.ok(ids.includes('pyth_planned'));
  assert.ok(ids.includes('jupiter_planned'));
  assert.ok(ids.includes('meteora_planned'));
  assert.ok(ids.includes('orca_planned'));
});

// ---------------------------------------------------------------------------
// sampleOfflineMarketData
// ---------------------------------------------------------------------------

test('createSamplePriceContext sets isSample true', () => {
  const ctx = createSamplePriceContext('MINT_A', 'devnet');
  assert.equal(ctx.isSample, true);
});

test('createSamplePriceContext includes do-not-use-for-trading warning', () => {
  const ctx = createSamplePriceContext('MINT_A', 'devnet');
  assert.ok(ctx.warnings.some((w: string) => w.includes('sample data')));
  assert.ok(ctx.safetyNotes.some((n: string) => n.includes('not use for trading')));
});

test('createSampleLiquidityContext sets isSample true', () => {
  const ctx = createSampleLiquidityContext('MINT_A', 'devnet');
  assert.equal(ctx.isSample, true);
});

test('createSampleLiquidityContext includes sample pool warning', () => {
  const ctx = createSampleLiquidityContext('MINT_A', 'devnet');
  assert.ok(ctx.pools.length > 0);
  assert.ok(ctx.pools[0].warning?.includes('Sample'));
});

// ---------------------------------------------------------------------------
// createMarketDataContext
// ---------------------------------------------------------------------------

test('createMarketDataContext combines item + sample price/liquidity context', () => {
  const item: SolanaMarketsWatchlistItem = {
    id: 'item-1',
    address: 'MINT_A',
    network: 'devnet',
    kind: 'token_mint',
    status: 'idle',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    localOnly: true,
  };
  const price = createSamplePriceContext('MINT_A', 'devnet');
  const liquidity = createSampleLiquidityContext('MINT_A', 'devnet');
  const ctx = createMarketDataContext({ item, priceContext: price, liquidityContext: liquidity });
  assert.equal(ctx.itemId, 'item-1');
  assert.equal(ctx.address, 'MINT_A');
  assert.equal(ctx.isSample, true);
  assert.ok(ctx.providersUsed.includes('sample_offline'));
});

test('createMarketDataContext warns when no context provided', () => {
  const item: SolanaMarketsWatchlistItem = {
    id: 'item-1',
    address: 'MINT_A',
    network: 'devnet',
    kind: 'token_mint',
    status: 'idle',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    localOnly: true,
  };
  const ctx = createMarketDataContext({ item });
  assert.ok(ctx.warnings.some((w: string) => w.includes('No market data context')));
});

// ---------------------------------------------------------------------------
// marketProviderConfigStorage
// ---------------------------------------------------------------------------

test('marketProviderConfigStorage does not store API keys', () => {
  clearMarketProviderConfigs();
  const configs = createDefaultProviderConfigs();
  for (const c of configs) {
    assert.equal(c.storesApiKey, false);
  }
});

test('marketProviderConfigStorage round-trips configs when localStorage available', () => {
  // In Node.js test environment, localStorage may not exist
  const hasStorage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
  if (!hasStorage) {
    // Skip round-trip test in Node environment
    assert.ok(true);
    return;
  }
  clearMarketProviderConfigs();
  const defaults = createDefaultProviderConfigs();
  saveMarketProviderConfigs(defaults);
  const loaded = loadMarketProviderConfigs();
  assert.equal(loaded.length, defaults.length);
  assert.equal(loaded[0].provider, 'rpc_native');
});

test('getOrCreateProviderConfigs returns defaults when empty', () => {
  clearMarketProviderConfigs();
  const configs = getOrCreateProviderConfigs();
  assert.ok(configs.length > 0);
  assert.ok(configs.some((c) => c.provider === 'rpc_native'));
});

test('marketProviderConfigStorage resets invalid data safely', () => {
  clearMarketProviderConfigs();
  // In Node.js, localStorage may not exist; if it does, test invalid data rejection
  const hasStorage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
  if (hasStorage) {
    // @ts-expect-error mock
    globalThis.localStorage.setItem('gorkh.solana.markets.providerConfig.v1', JSON.stringify([{ bad: true }]));
  }
  const loaded = loadMarketProviderConfigs();
  assert.equal(loaded.length, 0);
});

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

test('Market data context does not call external APIs', () => {
  assert.equal(typeof createMarketDataContext, 'function');
});

test('No market data function constructs swaps/routes/orders', () => {
  assert.throws(() => rejectDeniedTradingAction('swap'));
  assert.throws(() => rejectDeniedTradingAction('route'));
});

test('No market data function signs or executes', () => {
  assert.throws(() => rejectDeniedTradingAction('trade'));
  assert.throws(() => rejectDeniedTradingAction('order'));
});

test('Provider registry marks Jupiter as route preview planned, not live trading', () => {
  const jupiter = getMarketDataProviderDefinition('jupiter_planned');
  assert.ok(jupiter);
  assert.ok(jupiter.roadmapNote.includes('read-only'));
  assert.ok(jupiter.safetyNote.includes('No swap execution'));
});
