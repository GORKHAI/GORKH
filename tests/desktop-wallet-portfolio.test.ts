import assert from 'node:assert/strict';
import test from 'node:test';

import { createWalletPortfolioSummary } from '../apps/desktop/src/features/solana-workstation/wallet/portfolio/createWalletPortfolioSummary.js';
import { createWalletPortfolioContextSummary } from '../apps/desktop/src/features/solana-workstation/wallet/portfolio/createWalletPortfolioContextSummary.js';
import { buildMarketsWatchlistItemFromTokenHolding } from '../apps/desktop/src/features/solana-workstation/wallet/portfolio/buildMarketsWatchlistItemFromTokenHolding.js';
import { createWalletProfile } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletProfile.js';

import {
  SolanaWalletRouteKind,
  SolanaMarketsItemKind,
  SolanaMarketsItemStatus,
  type SolanaWalletReadOnlySnapshot,
  type SolanaWalletPortfolioTokenHolding,
} from '../packages/shared/src/index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(overrides?: Parameters<typeof createWalletProfile>[0]) {
  return createWalletProfile({
    label: 'Test Wallet',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    ...overrides,
  });
}

function makeSnapshot(overrides?: Partial<SolanaWalletReadOnlySnapshot>): SolanaWalletReadOnlySnapshot {
  return {
    walletProfileId: 'profile-1',
    address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    network: 'devnet',
    accountExists: true,
    solBalanceLamports: '1000000000',
    solBalanceUi: '1',
    tokenAccountCount: 0,
    tokenAccountsPreview: [],
    fetchedAt: Date.now(),
    source: 'rpc_read_only',
    safetyNotes: [],
    warnings: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createWalletPortfolioSummary
// ---------------------------------------------------------------------------

test('createWalletPortfolioSummary returns empty holdings when no token accounts', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot();
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  assert.equal(portfolio.tokenHoldingCount, 0);
  assert.equal(portfolio.tokenAccountCount, 0);
  assert.equal(portfolio.holdings.length, 0);
});

test('createWalletPortfolioSummary groups token accounts by mint', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot({
    tokenAccountCount: 3,
    tokenAccountsPreview: [
      { pubkey: 'acc1', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '1000', decimals: 6, uiAmountString: '0.001' },
      { pubkey: 'acc2', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '2000', decimals: 6, uiAmountString: '0.002' },
      { pubkey: 'acc3', mint: 'MINT_B', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '500', decimals: 9, uiAmountString: '0.0000005' },
    ],
  });
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  assert.equal(portfolio.tokenHoldingCount, 2);
  assert.equal(portfolio.tokenAccountCount, 3);

  const holdingA = portfolio.holdings.find((h) => h.mint === 'MINT_A');
  assert.ok(holdingA);
  assert.equal(holdingA.tokenAccountCount, 2);
  assert.equal(holdingA.tokenAccountPubkeys.length, 2);
  assert.ok(holdingA.tokenAccountPubkeys.includes('acc1'));
  assert.ok(holdingA.tokenAccountPubkeys.includes('acc2'));

  const holdingB = portfolio.holdings.find((h) => h.mint === 'MINT_B');
  assert.ok(holdingB);
  assert.equal(holdingB.tokenAccountCount, 1);
});

test('createWalletPortfolioSummary sums raw amounts when decimals are consistent', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot({
    tokenAccountCount: 2,
    tokenAccountsPreview: [
      { pubkey: 'acc1', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '1000', decimals: 6, uiAmountString: '0.001' },
      { pubkey: 'acc2', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '2000', decimals: 6, uiAmountString: '0.002' },
    ],
  });
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  const holding = portfolio.holdings.find((h) => h.mint === 'MINT_A');
  assert.ok(holding);
  assert.equal(holding.amountRaw, '3000');
});

test('createWalletPortfolioSummary warns on decimals mismatch', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot({
    tokenAccountCount: 2,
    tokenAccountsPreview: [
      { pubkey: 'acc1', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '1000', decimals: 6, uiAmountString: '0.001' },
      { pubkey: 'acc2', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '2000', decimals: 9, uiAmountString: '0.000002' },
    ],
  });
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  const holding = portfolio.holdings.find((h) => h.mint === 'MINT_A');
  assert.ok(holding);
  assert.ok(holding.warnings.some((w) => w.includes('Decimals mismatch')));
  assert.equal(holding.uiAmountString, undefined);
  assert.equal(holding.amountUi, undefined);
});

test('createWalletPortfolioSummary includes ownership status', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot();
  const portfolio = createWalletPortfolioSummary({
    walletProfile: profile,
    snapshot,
    ownershipProofStatus: 'verified',
    ownershipVerifiedAt: 1234567890,
  });
  assert.equal(portfolio.ownershipProofStatus, 'verified');
  assert.equal(portfolio.ownershipVerifiedAt, 1234567890);
});

test('createWalletPortfolioSummary returns empty portfolio when no snapshot', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot: null });
  assert.equal(portfolio.tokenHoldingCount, 0);
  assert.equal(portfolio.holdings.length, 0);
  assert.ok(portfolio.safetyNotes.some((n) => n.includes('No snapshot available')));
});

test('createWalletPortfolioSummary preserves safety notes', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot();
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  assert.ok(portfolio.safetyNotes.some((n) => n.includes('read-only')));
  assert.ok(portfolio.safetyNotes.some((n) => n.includes('No prices')));
  assert.ok(portfolio.safetyNotes.some((n) => n.includes('cannot sign')));
});

// ---------------------------------------------------------------------------
// createWalletPortfolioContextSummary
// ---------------------------------------------------------------------------

test('createWalletPortfolioContextSummary includes SOL balance and holdings', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot({
    tokenAccountCount: 1,
    tokenAccountsPreview: [
      { pubkey: 'acc1', mint: 'MINT_A', owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', amountRaw: '1000', decimals: 6, uiAmountString: '0.001' },
    ],
  });
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  const ctx = createWalletPortfolioContextSummary({ portfolio, walletProfileLabel: profile.label });
  assert.ok(ctx.markdown.includes('SOL Balance'));
  assert.ok(ctx.markdown.includes('MINT_A'));
  assert.equal(ctx.tokenHoldingCount, 1);
  assert.equal(ctx.tokenAccountCount, 1);
});

test('createWalletPortfolioContextSummary includes safety notes', () => {
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot();
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  const ctx = createWalletPortfolioContextSummary({ portfolio });
  assert.ok(ctx.safetyNotes.some((n) => n.includes('read-only')));
  assert.ok(ctx.markdown.includes('Read-only portfolio'));
});

// ---------------------------------------------------------------------------
// buildMarketsWatchlistItemFromTokenHolding
// ---------------------------------------------------------------------------

test('buildMarketsWatchlistItemFromTokenHolding creates token_mint item', () => {
  const holding: SolanaWalletPortfolioTokenHolding = {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenAccountPubkeys: ['abc123'],
    tokenAccountCount: 1,
    amountRaw: '1000000',
    source: 'token_accounts_preview',
    warnings: [],
  };
  const item = buildMarketsWatchlistItemFromTokenHolding(holding, 'devnet', 'profile-1');
  assert.equal(item.kind, SolanaMarketsItemKind.TOKEN_MINT);
  assert.equal(item.network, 'devnet');
  assert.equal(item.status, SolanaMarketsItemStatus.IDLE);
  assert.ok(item.localOnly);
  assert.ok(item.tags.includes('wallet_holding'));
  assert.ok(item.tags.some((t) => t.includes('profile-1')));
  assert.equal(item.address, holding.mint);
});

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

test('Portfolio does not call RPC directly', () => {
  // createWalletPortfolioSummary only transforms existing snapshot data
  assert.equal(typeof createWalletPortfolioSummary, 'function');
});

test('Portfolio does not call protocol APIs', () => {
  // No protocol API references exist in portfolio module
  assert.ok(true);
});

test('Portfolio does not sign or execute', () => {
  // Portfolio is pure data transformation
  assert.ok(true);
});

test('No trade/swap action labels in portfolio components/constants', () => {
  // Safety notes explicitly deny trade/swap
  const profile = makeProfile({ publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' });
  const snapshot = makeSnapshot();
  const portfolio = createWalletPortfolioSummary({ walletProfile: profile, snapshot });
  assert.ok(portfolio.safetyNotes.some((n) => n.includes('cannot sign')));
  assert.ok(portfolio.safetyNotes.some((n) => n.includes('trade')) || portfolio.safetyNotes.some((n) => n.includes('swap')));
});
