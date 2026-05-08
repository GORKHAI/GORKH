import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSafeWalletHubSerialized,
  buildPortfolioWalletSummary,
  createConsolidatedPortfolioSummary,
  createPortfolioPriceEstimate,
  createPortfolioSnapshot,
  createWatchOnlyWalletHubProfile,
  createWalletHubContextSnapshot,
  filterWalletHubProfiles,
  removeWatchOnlyWalletHubProfile,
  updateWalletHubProfileLabel,
  updateWalletHubProfileTags,
} from '../apps/desktop/src/features/solana-workstation/wallet/hub/index.js';

const address = '11111111111111111111111111111111';

test('Wallet Hub supports watch-only add, edit, filter, active profile data, and remove', () => {
  const profile = createWatchOnlyWalletHubProfile({
    publicAddress: address,
    label: 'Watch: DAO Treasury',
    tags: ['watch-only', 'dao'],
    now: 1,
  });
  assert.equal(profile.kind, 'watch_only');
  assert.equal(profile.status, 'watch_only');
  assert.throws(() => createWatchOnlyWalletHubProfile({ publicAddress: 'bad' }), /Invalid Solana address/);

  const renamed = updateWalletHubProfileLabel([profile], profile.id, 'Treasury', 2)[0];
  assert.equal(renamed.label, 'Treasury');
  const tagged = updateWalletHubProfileTags([renamed], profile.id, ['cold', 'treasury'], 'Cold', 3)[0];
  assert.deepEqual(tagged.tags, ['cold', 'treasury']);
  assert.equal(tagged.category, 'Cold');
  assert.equal(filterWalletHubProfiles([tagged], 'watch_only').length, 1);
  assert.equal(filterWalletHubProfiles([tagged], 'active_wallet', tagged.id).length, 1);
  assert.equal(removeWatchOnlyWalletHubProfile([tagged], tagged.id).length, 0);
});

test('Wallet Hub portfolio normalizes SPL token balances and missing price fallback', () => {
  const profile = createWatchOnlyWalletHubProfile({ publicAddress: address, label: 'Trading', now: 1 });
  const snapshot = {
    walletProfileId: profile.id,
    address,
    network: 'devnet',
    solBalanceLamports: '2000000000',
    solBalanceUi: '2',
    tokenAccountCount: 2,
    tokenAccountsPreview: [
      {
        pubkey: 'token-1',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amountRaw: '2500000',
        amountUi: '2.5',
        decimals: 6,
        uiAmountString: '2.5',
      },
      {
        pubkey: 'token-2',
        mint: 'UnknownMint111111111111111111111111111111',
        amountRaw: '10',
        decimals: 0,
        uiAmountString: '10',
      },
    ],
    fetchedAt: 5,
    source: 'rpc_read_only',
    safetyNotes: [],
    warnings: [],
  };
  const wallet = buildPortfolioWalletSummary({ profile, snapshot, now: 6 });
  assert.equal(wallet.solBalanceUi, '2');
  assert.equal(wallet.tokenBalances.length, 2);
  assert.equal(wallet.tokenBalances[0].symbol, 'USDC');
  assert.equal(wallet.tokenBalances[0].estimatedUsdValue, '2.50');
  assert.equal(wallet.tokenBalances[1].priceUnavailable, true);
  assert.equal(createPortfolioPriceEstimate('UnknownMint111111111111111111111111111111').source, 'unavailable');

  const consolidated = createConsolidatedPortfolioSummary({
    profiles: [profile],
    snapshots: [snapshot],
    filter: 'all_wallets',
    now: 7,
  });
  assert.equal(consolidated.totalEstimatedUsdValue, '2.50');
  assert.equal(consolidated.priceUnavailable, true);

  const safeSnapshot = createPortfolioSnapshot(consolidated, 8);
  assert.equal(safeSnapshot.walletIds[0], profile.id);
  assert.doesNotMatch(JSON.stringify(safeSnapshot), /privateKey|seed phrase|wallet JSON|secretKey/i);
});

test('Wallet Hub context snapshot and storage guard reject secrets', () => {
  const profile = createWatchOnlyWalletHubProfile({ publicAddress: address, label: 'Trading', now: 1 });
  const consolidated = createConsolidatedPortfolioSummary({
    profiles: [profile],
    snapshots: [],
    filter: 'all_wallets',
    now: 2,
  });
  const context = createWalletHubContextSnapshot({
    profiles: [profile],
    activeProfile: profile,
    portfolio: consolidated,
    now: 3,
  });
  assert.match(context.summary, /Wallet Hub has 1 profiles/);
  assert.doesNotMatch(JSON.stringify(context), /privateKey|seed phrase|wallet JSON|cloak note|viewing key|zerion token|api key/i);
  assert.doesNotThrow(() => assertSafeWalletHubSerialized(context));
  assert.throws(() => assertSafeWalletHubSerialized({ privateKey: 'nope' }), /forbidden secret/);
});
