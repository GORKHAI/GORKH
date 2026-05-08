import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ConsolidatedPortfolioSummarySchema,
  PortfolioContextSnapshotSchema,
  PortfolioPriceEstimateSchema,
  PortfolioSnapshotSchema,
  PortfolioTokenBalanceSchema,
  PortfolioWalletSummarySchema,
  WALLET_HUB_CONTEXT_STORAGE_KEY,
  WALLET_HUB_LOCKED_ROADMAP,
  WALLET_HUB_SAFETY_NOTES,
  WalletHubFilter,
  WalletHubProfileSchema,
  WalletLabelSchema,
  WalletProfileKind,
  WalletProfileStatus,
  WalletTagSchema,
} from '../dist/index.js';

test('Wallet Hub shared schemas validate safe serializable data', () => {
  const profile = WalletHubProfileSchema.parse({
    id: 'hub-1',
    kind: WalletProfileKind.WATCH_ONLY,
    status: WalletProfileStatus.WATCH_ONLY,
    label: 'Watch: DAO Treasury',
    publicAddress: '11111111111111111111111111111111',
    network: 'devnet',
    tags: ['watch-only', 'dao'],
    createdAt: 1,
    updatedAt: 1,
    localOnly: true,
    safetyNotes: WALLET_HUB_SAFETY_NOTES,
  });
  assert.equal(profile.kind, 'watch_only');
  assert.equal(WalletLabelSchema.parse('Treasury'), 'Treasury');
  assert.equal(WalletTagSchema.parse('cold'), 'cold');

  const price = PortfolioPriceEstimateSchema.parse({
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    priceUsd: '1',
    source: 'known_stable',
    estimated: true,
  });
  const token = PortfolioTokenBalanceSchema.parse({
    walletProfileId: profile.id,
    walletLabel: profile.label,
    mint: price.mint,
    symbol: price.symbol,
    tokenAccountCount: 1,
    amountRaw: '2500000',
    decimals: 6,
    uiAmountString: '2.5',
    priceEstimate: price,
    estimatedUsdValue: '2.50',
    priceUnavailable: false,
  });
  const wallet = PortfolioWalletSummarySchema.parse({
    walletProfileId: profile.id,
    walletLabel: profile.label,
    walletKind: profile.kind,
    walletStatus: profile.status,
    publicAddress: profile.publicAddress,
    network: profile.network,
    solBalanceLamports: '1000000000',
    solBalanceUi: '1',
    tokenBalances: [token],
    totalEstimatedUsdValue: '2.50',
    priceUnavailable: false,
    balanceStatus: 'loaded',
  });
  const summary = ConsolidatedPortfolioSummarySchema.parse({
    id: 'portfolio-1',
    filter: WalletHubFilter.ALL_WALLETS,
    walletCount: 1,
    watchOnlyCount: 1,
    localVaultCount: 0,
    browserHandoffCount: 0,
    totalEstimatedUsdValue: '2.50',
    priceUnavailable: false,
    wallets: [wallet],
    tokenBalances: [token],
    generatedAt: 1,
    localOnly: true,
  });
  assert.equal(summary.walletCount, 1);
});

test('Wallet Hub snapshots and context exclude secret fields', () => {
  const snapshot = PortfolioSnapshotSchema.parse({
    id: 'snap-1',
    summaryId: 'portfolio-1',
    filter: 'all_wallets',
    walletIds: ['hub-1'],
    publicAddresses: ['11111111111111111111111111111111'],
    tokenSummary: [{ mint: 'Mint1111111111111111111111111111111111', amountUi: '1' }],
    capturedAt: 1,
    redactionsApplied: ['walletHub.snapshot.secretFieldsExcluded'],
    localOnly: true,
  });
  const context = PortfolioContextSnapshotSchema.parse({
    storageKey: WALLET_HUB_CONTEXT_STORAGE_KEY,
    activeWalletLabel: 'Trading',
    activeWalletPublicAddress: '11111111111111111111111111111111',
    walletCount: 1,
    watchOnlyCount: 1,
    localVaultCount: 0,
    topTokens: ['USDC'],
    generatedAt: 1,
    summary: 'Wallet Hub has 1 profile. No secrets included.',
    redactionsApplied: ['walletHub.context.secretFieldsExcluded'],
    localOnly: true,
  });
  const serialized = JSON.stringify({ snapshot, context });
  assert.doesNotMatch(serialized, /privateKey|seed phrase|wallet JSON|cloak note|viewing key|zerion token|api key/i);
});

test('Wallet Hub locked roadmap includes required future sections', () => {
  const text = JSON.stringify(WALLET_HUB_LOCKED_ROADMAP);
  assert.match(text, /Ledger\/Trezor/);
  assert.match(text, /Squads v4/);
  assert.match(text, /NFT Gallery/);
  assert.match(text, /DeFi Positions/);
  assert.match(text, /Stake Accounts/);
  assert.match(text, /PnL Tracking/);
  assert.match(text, /Advanced Portfolio History/);
  assert.doesNotMatch(text, /Drift/i);
});
