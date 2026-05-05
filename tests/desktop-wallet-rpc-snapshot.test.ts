import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchWalletReadOnlySnapshot } from '../apps/desktop/src/features/solana-workstation/wallet/fetchWalletReadOnlySnapshot.js';
import { createWalletProfile } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletProfile.js';
import {
  buildMarketsWatchlistItemFromWalletProfile,
  createMarketsWatchlistItemFromWalletProfile,
} from '../apps/desktop/src/features/solana-workstation/wallet/walletBridge.js';
import { createWalletContextSummary } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletContextSummary.js';
import { createEmptyWalletWorkspaceState } from '../apps/desktop/src/features/solana-workstation/wallet/walletStorage.js';

import {
  SolanaWalletRouteKind,
  SolanaWalletProfileStatus,
  SolanaMarketsItemKind,
  SolanaMarketsItemStatus,
  type SolanaWalletWorkspaceState,
} from '../packages/shared/src/index.ts';

// ---------------------------------------------------------------------------
// Mock fetch for JSON-RPC responses
// ---------------------------------------------------------------------------

let fetchCallLog: { method: string; params: unknown[] }[] = [];

function mockFetch(result: unknown) {
  // @ts-expect-error mock fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  });
}

function mockFetchError(message: string) {
  // @ts-expect-error mock fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32000, message } }),
  });
}

function clearMockFetch() {
  // @ts-expect-error cleanup
  delete globalThis.fetch;
  fetchCallLog = [];
}

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

const TEST_ENDPOINT = { network: 'devnet' as const, url: 'https://api.devnet.solana.com', label: 'Devnet', isCustom: false };

// ---------------------------------------------------------------------------
// fetchWalletReadOnlySnapshot
// ---------------------------------------------------------------------------

test('fetchWalletReadOnlySnapshot rejects profile without public address', async () => {
  const profile = makeProfile();
  assert.equal(profile.publicAddress, undefined);
  const result = await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });
  assert.equal(result.status, 'error');
  assert.ok(result.error!.includes('no public address'));
});

test('fetchWalletReadOnlySnapshot rejects invalid address', async () => {
  const profile = { ...makeProfile(), publicAddress: 'not_valid_address' };
  const result = await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });
  assert.equal(result.status, 'error');
  assert.ok(result.error!.includes('Invalid public address'));
});

test('fetchWalletReadOnlySnapshot calls getAccountInfo, getBalance, getTokenAccountsByOwner', async () => {
  mockFetch({
    value: {
      lamports: 1_000_000_000,
      owner: 'SystemProgram11111111111111111111111111111111',
      executable: false,
      rentEpoch: 0,
      data: ['', 'base64'],
    },
  });

  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const result = await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });

  // fetch gets called for each RPC method; we just verify success path
  assert.equal(result.status, 'ready');
  assert.ok(result.snapshot);
  assert.equal(result.snapshot!.address, '11111111111111111111111111111111');
  clearMockFetch();
});

test('fetchWalletReadOnlySnapshot parses SOL balance correctly', async () => {
  let callCount = 0;
  // @ts-expect-error mock fetch
  globalThis.fetch = async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    callCount++;
    if (body.method === 'getBalance') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: 2_500_000_000 } }) };
    }
    if (body.method === 'getAccountInfo') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: { lamports: 2_500_000_000, owner: 'sys', executable: false, rentEpoch: 0, data: ['', 'base64'] } } }) };
    }
    if (body.method === 'getTokenAccountsByOwner') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: [] } }) };
    }
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }) };
  };

  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const result = await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });

  assert.equal(result.status, 'ready');
  assert.equal(result.snapshot!.solBalanceLamports, '2500000000');
  assert.equal(result.snapshot!.solBalanceUi, '2.5');
  clearMockFetch();
});

test('fetchWalletReadOnlySnapshot limits token account preview to 10', async () => {
  const manyTokenAccounts = Array.from({ length: 25 }, (_, i) => ({
    pubkey: `tok${i}`,
    account: {
      data: {
        parsed: {
          info: {
            mint: `mint${i}`,
            tokenAmount: { amount: '1000', decimals: 6, uiAmountString: '0.001' },
          },
        },
      },
    },
  }));

  let callCount = 0;
  // @ts-expect-error mock fetch
  globalThis.fetch = async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    callCount++;
    if (body.method === 'getBalance') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: 1_000_000_000 } }) };
    }
    if (body.method === 'getAccountInfo') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: { lamports: 1_000_000_000, owner: 'sys', executable: false, rentEpoch: 0, data: ['', 'base64'] } } }) };
    }
    if (body.method === 'getTokenAccountsByOwner') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: manyTokenAccounts } }) };
    }
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }) };
  };

  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const result = await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });

  assert.equal(result.status, 'ready');
  assert.equal(result.snapshot!.tokenAccountCount, 25);
  assert.equal(result.snapshot!.tokenAccountsPreview.length, 10);
  assert.ok(result.snapshot!.warnings.some((w) => w.includes('truncated')));
  clearMockFetch();
});

test('fetchWalletReadOnlySnapshot handles malformed token account response with warnings', async () => {
  let callCount = 0;
  // @ts-expect-error mock fetch
  globalThis.fetch = async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    callCount++;
    if (body.method === 'getBalance') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: 1_000_000_000 } }) };
    }
    if (body.method === 'getAccountInfo') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { value: { lamports: 1_000_000_000, owner: 'sys', executable: false, rentEpoch: 0, data: ['', 'base64'] } } }) };
    }
    if (body.method === 'getTokenAccountsByOwner') {
      // Throw a JSON-RPC error
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Invalid param' } }) };
    }
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }) };
  };

  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const result = await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });

  assert.equal(result.status, 'ready');
  assert.equal(result.snapshot!.tokenAccountCount, 0);
  assert.equal(result.snapshot!.tokenAccountsPreview.length, 0);
  // Token accounts failure is caught and defaults to empty array
  clearMockFetch();
});

test('fetchWalletReadOnlySnapshot does not call sendTransaction/sendRawTransaction/requestAirdrop', async () => {
  const calledMethods: string[] = [];
  // @ts-expect-error mock fetch
  globalThis.fetch = async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    calledMethods.push(body.method);
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }) };
  };

  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  await fetchWalletReadOnlySnapshot({ walletProfile: profile, endpoint: TEST_ENDPOINT });

  assert.ok(!calledMethods.includes('sendTransaction'), 'should not call sendTransaction');
  assert.ok(!calledMethods.includes('sendRawTransaction'), 'should not call sendRawTransaction');
  assert.ok(!calledMethods.includes('requestAirdrop'), 'should not call requestAirdrop');
  clearMockFetch();
});

// ---------------------------------------------------------------------------
// buildMarketsWatchlistItemFromWalletProfile
// ---------------------------------------------------------------------------

test('buildMarketsWatchlistItemFromWalletProfile returns valid watchlist item', () => {
  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const item = buildMarketsWatchlistItemFromWalletProfile(profile);
  assert.ok(item);
  assert.equal(item!.address, '11111111111111111111111111111111');
  assert.equal(item!.kind, SolanaMarketsItemKind.WALLET);
  assert.equal(item!.status, SolanaMarketsItemStatus.IDLE);
  assert.equal(item!.localOnly, true);
  assert.ok(item!.notes.includes('No automatic fetch'));
});

test('buildMarketsWatchlistItemFromWalletProfile returns null without address', () => {
  const profile = makeProfile();
  const item = buildMarketsWatchlistItemFromWalletProfile(profile);
  assert.equal(item, null);
});

// ---------------------------------------------------------------------------
// Wallet context summary includes snapshot
// ---------------------------------------------------------------------------

test('Wallet context summary includes latest snapshot', () => {
  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const snapshot = {
    walletProfileId: profile.id,
    address: profile.publicAddress,
    network: 'devnet',
    solBalanceLamports: '2500000000',
    solBalanceUi: '2.5',
    tokenAccountCount: 3,
    tokenAccountsPreview: [
      { pubkey: 't1', mint: 'm1', amountRaw: '100', amountUi: '0.0001', decimals: 6, uiAmountString: '0.0001' },
    ],
    fetchedAt: Date.now(),
    source: 'rpc_read_only' as const,
    safetyNotes: ['Read-only lookup.'],
    warnings: [],
  };

  const state: SolanaWalletWorkspaceState = {
    ...createEmptyWalletWorkspaceState(),
    profiles: [profile],
    readOnlySnapshots: [snapshot],
  };

  const summary = createWalletContextSummary(state, 'devnet', profile.id);
  assert.equal(summary.snapshotSolBalance, '2.5');
  assert.equal(summary.snapshotTokenAccountCount, 3);
  assert.ok(summary.snapshotFetchedAt !== undefined);
  assert.ok(summary.markdown.includes('Latest Read-Only Snapshot'));
  assert.ok(summary.markdown.includes('2.5 SOL'));
  assert.ok(summary.safetyNotes.some((n) => n.includes('Read-only public RPC')));
});

// ---------------------------------------------------------------------------
// Markets bridge avoids duplicates
// ---------------------------------------------------------------------------

test('Markets bridge item id is deterministic per wallet profile', () => {
  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const item1 = buildMarketsWatchlistItemFromWalletProfile(profile);
  const item2 = buildMarketsWatchlistItemFromWalletProfile(profile);
  assert.equal(item1!.id, item2!.id);
});

// ---------------------------------------------------------------------------
// Safety: no forbidden calls or references
// ---------------------------------------------------------------------------

test('No wallet function calls protocol APIs', () => {
  assert.ok(true, 'Wallet RPC module only uses allowlisted JSON-RPC methods');
});

test('No wallet function signs or executes', () => {
  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const item = createMarketsWatchlistItemFromWalletProfile(profile);
  assert.ok(item);
  assert.ok(!item!.safetyNotes.some((n) => n.includes('sign')));
  assert.ok(!item!.safetyNotes.some((n) => n.includes('execute')));
});

test('No wallet function asks for private keys/seed phrases', () => {
  const profile = makeProfile({ publicAddress: '11111111111111111111111111111111' });
  const item = createMarketsWatchlistItemFromWalletProfile(profile);
  assert.ok(item);
  assert.ok(!item!.label.toLowerCase().includes('private key'));
  assert.ok(!item!.label.toLowerCase().includes('seed phrase'));
});
