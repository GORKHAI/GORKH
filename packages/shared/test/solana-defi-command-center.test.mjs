import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFI_COMMAND_CENTER_BLOCKED_ACTIONS,
  DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY,
  DeFiAdapterStatus,
  DeFiCommandCenterContextSnapshotSchema,
  DeFiApiEnvelopeSchema,
  DeFiBackendHealthSchema,
  DeFiDataSourceSchema,
  DeFiPortfolioSummarySchema,
  DeFiProtocolCategory,
  DeFiProtocolName,
  DeFiQuoteInputSchema,
  DeFiQuoteSummarySchema,
  DeFiYieldOpportunitySchema,
} from '../dist/index.js';

test('DeFi shared schemas validate safe portfolio, quote, yield, and context shapes', () => {
  const source = DeFiDataSourceSchema.parse({
    id: 'backend',
    label: 'GORKH read-only backend',
    kind: 'backend',
    status: DeFiAdapterStatus.LOADED,
    warnings: ['No secrets included.'],
  });
  assert.equal(source.kind, 'backend');

  const health = DeFiBackendHealthSchema.parse({
    enabled: true,
    configuredAdapters: ['Jupiter Quote API'],
    unavailableAdapters: ['Kamino read-only adapter requires KAMINO_API_BASE.'],
    cacheTtlMs: 30000,
    requestTimeoutMs: 8000,
    sources: [source],
    updatedAt: 1,
  });
  assert.equal(health.enabled, true);

  const envelope = DeFiApiEnvelopeSchema.parse({
    ok: true,
    status: 'loaded',
    data: health,
    updatedAt: 1,
  });
  assert.equal(envelope.status, 'loaded');

  const portfolio = DeFiPortfolioSummarySchema.parse({
    id: 'defi-portfolio-test',
    walletScope: 'all_wallets',
    walletCount: 2,
    protocolCount: 0,
    positionCount: 0,
    valueDisplayedSeparately: true,
    protocolsDetected: [],
    categoryBreakdown: [
      { category: DeFiProtocolCategory.LIQUIDITY, count: 0 },
      { category: DeFiProtocolCategory.LENDING, count: 0 },
    ],
    positions: [],
    lpPositions: [],
    lendingPositions: [],
    yieldOpportunities: [],
    lstComparisons: [],
    adapterStatuses: [
      {
        protocolName: DeFiProtocolName.KAMINO,
        category: DeFiProtocolCategory.LENDING,
        status: DeFiAdapterStatus.UNAVAILABLE,
        reason: 'Protocol adapter not connected in v0.1.',
      },
    ],
    generatedAt: 1,
    warnings: ['Displayed separately to avoid double-counting.'],
    localOnly: true,
  });
  assert.equal(portfolio.valueDisplayedSeparately, true);

  const quoteInput = DeFiQuoteInputSchema.parse({
    inputMintOrSymbol: 'SOL',
    outputMintOrSymbol: 'USDC',
    amount: '1000000',
    slippageBps: 50,
    source: 'pasted',
    localOnly: true,
  });
  assert.equal(quoteInput.source, 'pasted');

  const quote = DeFiQuoteSummarySchema.parse({
    id: 'quote-1',
    provider: 'Jupiter',
    inputMintOrSymbol: 'SOL',
    outputMintOrSymbol: 'USDC',
    quoteTimestamp: 2,
    status: 'unavailable',
    executionLocked: true,
    redactionsApplied: ['jupiter.executablePayloadExcluded'],
    localOnly: true,
  });
  assert.equal(quote.executionLocked, true);

  const yieldRow = DeFiYieldOpportunitySchema.parse({
    id: 'yield-1',
    asset: 'USDC',
    protocolName: DeFiProtocolName.KAMINO,
    productType: 'lending',
    riskNote: 'APY unavailable.',
    sourceLabel: 'adapter unavailable',
    status: DeFiAdapterStatus.UNAVAILABLE,
    localOnly: true,
  });
  assert.equal(yieldRow.status, DeFiAdapterStatus.UNAVAILABLE);

  const context = DeFiCommandCenterContextSnapshotSchema.parse({
    storageKey: DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY,
    selectedWalletScope: 'all_wallets',
    detectedProtocolCount: 0,
    topPositionsSummary: [],
    lendingRiskSummary: 'No lending position data loaded.',
    lpSummary: 'No LP position data loaded.',
    yieldComparisonSummary: 'Unavailable.',
    lstComparisonSummary: 'Unavailable.',
    jupiterQuoteSummary: 'No quote requested.',
    generatedAt: 3,
    summary: 'Read-only DeFi context summary.',
    redactionsApplied: ['defi.executableTransactionsExcluded'],
    localOnly: true,
  });
  assert.equal(context.storageKey, 'gorkh.solana.defiCommandCenter.lastContext.v1');
});

test('DeFi quote schema has no executable transaction payload fields', () => {
  const shapeKeys = [
    ...Object.keys(DeFiQuoteSummarySchema.shape),
    ...Object.keys(DeFiDataSourceSchema.shape),
    ...Object.keys(DeFiBackendHealthSchema.shape),
    ...Object.keys(DeFiApiEnvelopeSchema.shape),
  ];
  for (const forbidden of [
    'swapTransaction',
    'serializedTransaction',
    'transaction',
    'tx',
    'unsignedTransaction',
    'signedTransaction',
    'transactionPayload',
    'instructions',
    'signers',
    'privateKey',
    'secretKey',
    'seedPhrase',
    'walletJson',
    'rawTransaction',
    'signingPayload',
    'executePayload',
  ]) {
    assert.equal(shapeKeys.includes(forbidden), false, `${forbidden} must not be present`);
  }
});

test('DeFi locked actions include swap, lending, LP, staking, and optimizer execution', () => {
  for (const action of [
    'Execute Swap',
    'Place Limit Order',
    'Cancel Limit Order',
    'Deposit to Lending',
    'Borrow',
    'Repay',
    'Withdraw',
    'Add Liquidity',
    'Remove Liquidity',
    'Stake / Unstake LST',
    'Auto Yield Optimize',
  ]) {
    assert.equal(DEFI_COMMAND_CENTER_BLOCKED_ACTIONS.includes(action), true);
  }
});
