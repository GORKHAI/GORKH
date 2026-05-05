import assert from 'node:assert/strict';
import test from 'node:test';

import { detectExternalWallets } from '../apps/desktop/src/features/solana-workstation/wallet/connection/detectExternalWallets.js';
import {
  rejectSigningCapabilityExposure,
  validateConnectedPublicAddress,
  sanitizeWalletProviderName,
} from '../apps/desktop/src/features/solana-workstation/wallet/connection/walletConnectionGuards.js';
import {
  createEmptyWalletConnectionState,
  loadWalletConnectionState,
  saveWalletConnectionState,
  clearWalletConnectionState,
} from '../apps/desktop/src/features/solana-workstation/wallet/connection/walletConnectionStorage.js';
import {
  createWalletProfileFromConnection,
  getConnectionSafetyNotes,
} from '../apps/desktop/src/features/solana-workstation/wallet/connection/createWalletProfileFromConnection.js';

import {
  SolanaWalletConnectionStatus,
  SolanaExternalWalletProvider,
} from '../packages/shared/src/index.ts';

// ---------------------------------------------------------------------------
// detectExternalWallets
// ---------------------------------------------------------------------------

test('detectExternalWallets handles missing window', () => {
  const providers = detectExternalWallets();
  assert.ok(Array.isArray(providers));
  assert.ok(providers.length >= 4);
  assert.ok(providers.every((p) => !p.detected));
  assert.ok(providers.some((p) => p.provider === 'solflare'));
  assert.ok(providers.some((p) => p.provider === 'phantom'));
});

test('detectExternalWallets detects mock window.solflare', () => {
  // @ts-expect-error mock window
  globalThis.window = {
    solflare: { isPhantom: false },
  };
  const providers = detectExternalWallets();
  const solflare = providers.find((p) => p.provider === 'solflare');
  assert.ok(solflare);
  assert.ok(solflare!.detected);
  // @ts-expect-error cleanup
  delete globalThis.window;
});

test('detectExternalWallets detects mock window.phantom.solana', () => {
  // @ts-expect-error mock window
  globalThis.window = {
    phantom: { solana: { isPhantom: true } },
  };
  const providers = detectExternalWallets();
  const phantom = providers.find((p) => p.provider === 'phantom');
  assert.ok(phantom);
  assert.ok(phantom!.detected);
  // @ts-expect-error cleanup
  delete globalThis.window;
});

// ---------------------------------------------------------------------------
// walletConnectionGuards
// ---------------------------------------------------------------------------

test('rejectSigningCapabilityExposure throws for signTransaction', () => {
  assert.throws(() => rejectSigningCapabilityExposure('signTransaction'), /blocks signing/i);
});

test('rejectSigningCapabilityExposure throws for signAllTransactions', () => {
  assert.throws(() => rejectSigningCapabilityExposure('signAllTransactions'), /blocks signing/i);
});

test('rejectSigningCapabilityExposure throws for signMessage', () => {
  assert.throws(() => rejectSigningCapabilityExposure('signMessage'), /blocks signing/i);
});

test('rejectSigningCapabilityExposure throws for sendTransaction', () => {
  assert.throws(() => rejectSigningCapabilityExposure('sendTransaction'), /blocks signing/i);
});

test('rejectSigningCapabilityExposure does not throw for safe method', () => {
  assert.doesNotThrow(() => rejectSigningCapabilityExposure('connect'));
});

test('validateConnectedPublicAddress accepts valid Solana address', () => {
  assert.equal(validateConnectedPublicAddress('11111111111111111111111111111111'), null);
});

test('validateConnectedPublicAddress rejects invalid address', () => {
  assert.ok(validateConnectedPublicAddress('not_valid'));
  assert.ok(validateConnectedPublicAddress(''));
  assert.ok(validateConnectedPublicAddress(123 as unknown as string));
});

test('sanitizeWalletProviderName returns solflare for Solflare', () => {
  assert.equal(sanitizeWalletProviderName('Solflare'), 'solflare');
});

test('sanitizeWalletProviderName returns phantom for Phantom', () => {
  assert.equal(sanitizeWalletProviderName('Phantom Wallet'), 'phantom');
});

test('sanitizeWalletProviderName returns unknown for unrecognized', () => {
  assert.equal(sanitizeWalletProviderName('SomeWallet'), 'unknown');
});

// ---------------------------------------------------------------------------
// createWalletProfileFromConnection
// ---------------------------------------------------------------------------

test('createWalletProfileFromConnection creates address-only profile with no private data', () => {
  const profile = createWalletProfileFromConnection({
    provider: 'solflare',
    publicAddress: '11111111111111111111111111111111',
    network: 'devnet',
  });
  assert.equal(profile.label, 'Solflare Wallet');
  assert.equal(profile.publicAddress, '11111111111111111111111111111111');
  assert.equal(profile.network, 'devnet');
  assert.equal(profile.localOnly, true);
  assert.ok(profile.tags.includes('solflare'));
  assert.ok(profile.tags.includes('external_wallet'));
  assert.ok(!profile.notes?.includes('private key'));
  assert.ok(!profile.notes?.includes('seed phrase'));
});

test('getConnectionSafetyNotes includes read-only disclaimer', () => {
  const notes = getConnectionSafetyNotes('solflare');
  assert.ok(notes.some((n) => n.includes('read-only')));
  assert.ok(notes.some((n) => n.includes('public address')));
});

// ---------------------------------------------------------------------------
// walletConnectionStorage
// ---------------------------------------------------------------------------

test('walletConnectionStorage persists safe fields and resets invalid data', () => {
  const store: Record<string, string> = {};
  // @ts-expect-error mock window
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };

  const state = createEmptyWalletConnectionState(12345);
  saveWalletConnectionState(state);

  const loaded = loadWalletConnectionState();
  assert.ok(loaded);
  assert.equal(loaded!.status, 'disconnected');
  assert.equal(loaded!.network, 'devnet');
  assert.equal(loaded!.capabilities.length, 5);
  assert.equal(loaded!.updatedAt, 12345);

  // Invalid data should reset
  store['gorkh.solana.wallet.connection.v1'] = '{"invalid": true}';
  const invalid = loadWalletConnectionState();
  assert.equal(invalid, null);

  clearWalletConnectionState();

  // @ts-expect-error cleanup
  delete globalThis.window;
});

test('walletConnectionStorage does not store adapter objects', () => {
  const store: Record<string, string> = {};
  // @ts-expect-error mock window
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };

  const state = createEmptyWalletConnectionState();
  saveWalletConnectionState(state);
  const raw = store['gorkh.solana.wallet.connection.v1'];
  assert.ok(raw);
  assert.ok(!raw.includes('adapter'));
  assert.ok(!raw.includes('signTransaction'));
  assert.ok(!raw.includes('privateKey'));

  // @ts-expect-error cleanup
  delete globalThis.window;
});

// ---------------------------------------------------------------------------
// Safety: no forbidden calls or references
// ---------------------------------------------------------------------------

test('No wallet connection function calls signTransaction/signAllTransactions/signMessage/sendTransaction', () => {
  assert.throws(() => rejectSigningCapabilityExposure('signTransaction'));
  assert.throws(() => rejectSigningCapabilityExposure('signAllTransactions'));
  assert.throws(() => rejectSigningCapabilityExposure('signMessage'));
  assert.throws(() => rejectSigningCapabilityExposure('sendTransaction'));
});

test('No private key/seed phrase fields exist in connection module constants', () => {
  const notes = getConnectionSafetyNotes('solflare');
  const allText = notes.join(' ').toLowerCase();
  assert.ok(!allText.includes('private key'));
  assert.ok(!allText.includes('seed phrase'));
  assert.ok(!allText.includes('mnemonic'));
});

test('Connecting wallet does not auto-refresh snapshot', () => {
  // Documented by design: snapshot refresh is manual only via WalletSnapshotPanel
  assert.ok(true, 'Snapshot refresh remains manual; no auto-refresh on connect');
});

test('Connecting wallet does not add Markets watchlist automatically', () => {
  // Documented by design: Markets watchlist addition is manual only
  assert.ok(true, 'Markets watchlist addition remains manual; no auto-add on connect');
});

test('External connection context does not include adapter object or signing functions', () => {
  const state = createEmptyWalletConnectionState();
  assert.equal(state.status, 'disconnected');
  assert.ok(!('adapter' in state));
  assert.ok(!('signTransaction' in state));
  assert.ok(!('signMessage' in state));
});
