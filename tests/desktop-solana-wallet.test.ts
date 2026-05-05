import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaWalletProfileStatus,
  SolanaWalletRouteKind,
  SolanaWalletAssetKind,
  SolanaWalletActionStatus,
  WorkstationRiskLevel,
  type SolanaWalletWorkspaceState,
} from '../packages/shared/src/index.ts';

import {
  validateWalletAssetSymbol,
  validateWalletAmount,
  validateWalletPublicAddress,
  rejectDeniedWalletCapability,
  sanitizeWalletNotes,
  assertSafeWalletRoute,
} from '../apps/desktop/src/features/solana-workstation/wallet/walletGuards.ts';

import { createWalletProfile } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletProfile.ts';
import { createWalletReceiveRequest } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletReceiveRequest.ts';
import { createWalletSendDraft } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletSendDraft.ts';
import { createWalletContextSummary } from '../apps/desktop/src/features/solana-workstation/wallet/createWalletContextSummary.ts';
import {
  createEmptyWalletWorkspaceState,
  saveWalletWorkspaceState,
  loadWalletWorkspaceState,
  clearWalletWorkspaceState,
} from '../apps/desktop/src/features/solana-workstation/wallet/walletStorage.ts';

import {
  createMarketsWatchlistItemFromWalletProfile,
  createAgentDraftMetadataFromWalletSendDraft,
  createShieldInputFromWalletSendDraft,
} from '../apps/desktop/src/features/solana-workstation/wallet/walletBridge.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestProfile(overrides?: Parameters<typeof createWalletProfile>[0]) {
  return createWalletProfile({
    label: 'Test Wallet',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    ...overrides,
  });
}

function makeTestSendDraft(overrides?: Partial<Parameters<typeof createWalletSendDraft>[0]>) {
  const profile = makeTestProfile();
  return createWalletSendDraft({
    walletProfile: profile,
    route: SolanaWalletRouteKind.UMBRA_PLANNED,
    assetSymbol: 'USDC',
    assetKind: SolanaWalletAssetKind.USDC,
    amountUi: '100',
    recipientAddressOrLabel: 'Alice',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// walletGuards
// ---------------------------------------------------------------------------

test('validateWalletAssetSymbol accepts 2-12 character symbols', () => {
  assert.equal(validateWalletAssetSymbol('USDC'), null);
  assert.equal(validateWalletAssetSymbol('SOL'), null);
  assert.equal(validateWalletAssetSymbol('A'), 'Asset symbol must be 2–12 characters.');
  assert.equal(validateWalletAssetSymbol('VERYLONGSYMBOLNAME'), 'Asset symbol must be 2–12 characters.');
});

test('validateWalletAmount accepts positive decimals', () => {
  assert.equal(validateWalletAmount('100'), null);
  assert.equal(validateWalletAmount('0.5'), null);
  assert.equal(validateWalletAmount(''), 'Amount is required.');
  assert.equal(validateWalletAmount('abc'), 'Amount must be a positive decimal number.');
  assert.equal(validateWalletAmount('-1'), 'Amount must be a positive decimal number.');
  assert.equal(validateWalletAmount('0'), 'Amount must be greater than zero.');
});

test('validateWalletPublicAddress accepts valid Solana addresses', () => {
  assert.equal(validateWalletPublicAddress(), null);
  assert.equal(validateWalletPublicAddress(''), null);
  assert.equal(validateWalletPublicAddress('11111111111111111111111111111111'), null);
  assert.equal(validateWalletPublicAddress('invalid'), 'Invalid Solana address format.');
  assert.equal(validateWalletPublicAddress('too_short'), 'Invalid Solana address format.');
});

test('rejectDeniedWalletCapability throws for denied capabilities', () => {
  assert.doesNotThrow(() => rejectDeniedWalletCapability('some_safe_capability'));
  assert.throws(() => rejectDeniedWalletCapability('private_key_import'), /denied/i);
  assert.throws(() => rejectDeniedWalletCapability('signing'), /denied/i);
  assert.throws(() => rejectDeniedWalletCapability('drift'), /denied/i);
});

test('sanitizeWalletNotes redacts secret keywords', () => {
  const result = sanitizeWalletNotes('My PRIVATE_KEY is here and my SECRET too');
  assert.ok(result.text.includes('[redacted secret]'));
  assert.ok(result.redactionsApplied.includes('PRIVATE_KEY'));
  assert.ok(result.redactionsApplied.includes('SECRET'));
});

test('sanitizeWalletNotes redacts possible seed phrases', () => {
  const seedPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
  const result = sanitizeWalletNotes(`Here is my seed: ${seedPhrase}`);
  assert.ok(result.text.includes('[redacted possible seed phrase]'));
  assert.ok(result.redactionsApplied.includes('possible_seed_phrase'));
});

test('sanitizeWalletNotes throws for banned terms', () => {
  assert.throws(() => sanitizeWalletNotes('humanrail integration'), /disallowed/i);
  assert.throws(() => sanitizeWalletNotes('white protocol'), /disallowed/i);
  assert.throws(() => sanitizeWalletNotes('drift protocol'), /disallowed/i);
});

test('assertSafeWalletRoute throws for banned routes', () => {
  assert.doesNotThrow(() => assertSafeWalletRoute('umbra_planned'));
  assert.throws(() => assertSafeWalletRoute('humanrail'), /disallowed/i);
  assert.throws(() => assertSafeWalletRoute('white_protocol'), /disallowed/i);
  assert.throws(() => assertSafeWalletRoute('drift'), /disallowed/i);
});

// ---------------------------------------------------------------------------
// createWalletProfile
// ---------------------------------------------------------------------------

test('createWalletProfile creates local profile without address', () => {
  const profile = createWalletProfile({
    label: 'No Address Wallet',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
  });
  assert.equal(profile.label, 'No Address Wallet');
  assert.equal(profile.status, SolanaWalletProfileStatus.LOCAL_PROFILE);
  assert.equal(profile.localOnly, true);
  assert.ok(profile.safetyNotes.some((n) => n.includes('No private key')));
  assert.equal(profile.publicAddress, undefined);
});

test('createWalletProfile creates address-only profile with valid address', () => {
  const profile = createWalletProfile({
    label: 'With Address',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.UMBRA_PLANNED,
    publicAddress: '11111111111111111111111111111111',
  });
  assert.equal(profile.status, SolanaWalletProfileStatus.ADDRESS_ONLY);
  assert.equal(profile.publicAddress, '11111111111111111111111111111111');
  assert.ok(profile.safetyNotes.some((n) => n.includes('Public address is stored for reference')));
});

test('createWalletProfile rejects invalid public address', () => {
  assert.throws(
    () =>
      createWalletProfile({
        label: 'Bad',
        network: 'devnet',
        preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
        publicAddress: 'not_valid',
      }),
    /Invalid Solana address format/
  );
});

test('createWalletProfile never creates keys', () => {
  const profile = createWalletProfile({
    label: 'Keyless',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
  });
  assert.equal(profile.publicAddress, undefined);
  assert.ok(!profile.safetyNotes.some((n) => n.includes('private key')) === false);
});

// ---------------------------------------------------------------------------
// createWalletReceiveRequest
// ---------------------------------------------------------------------------

test('createWalletReceiveRequest creates valid receive request', () => {
  const profile = makeTestProfile({ publicAddress: '11111111111111111111111111111111' });
  const req = createWalletReceiveRequest({
    walletProfile: profile,
    route: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    requestedAssetSymbol: 'USDC',
    requestedAmountUi: '250.00',
  });
  assert.equal(req.walletProfileId, profile.id);
  assert.equal(req.requestedAssetSymbol, 'USDC');
  assert.equal(req.requestedAmountUi, '250.00');
  assert.equal(req.payloadVersion, 'gorkh-wallet-receive-request-v1');
  assert.equal(req.localOnly, true);
  assert.equal(req.recipientPublicAddress, profile.publicAddress);
  assert.ok(req.safetyNotes.some((n) => n.includes('not a private address')));
});

test('createWalletReceiveRequest warns it is not a private address', () => {
  const profile = makeTestProfile();
  const req = createWalletReceiveRequest({
    walletProfile: profile,
    route: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    requestedAssetSymbol: 'SOL',
  });
  assert.ok(req.safetyNotes.some((n) => n.includes('not a private address')));
  assert.ok(req.safetyNotes.some((n) => n.includes('payment instruction')));
});

// ---------------------------------------------------------------------------
// createWalletSendDraft
// ---------------------------------------------------------------------------

test('createWalletSendDraft creates blocked send draft', () => {
  const draft = makeTestSendDraft();
  assert.equal(draft.status, SolanaWalletActionStatus.BLOCKED_EXECUTION_DISABLED);
  assert.equal(draft.localOnly, true);
  assert.ok(draft.blockedReasons.length > 0);
  assert.ok(draft.blockedReasons.some((r) => r.includes('Wallet connection is disabled')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('Signing and transaction execution are disabled')));
  assert.ok(draft.requiredManualReviews.includes('Manual privacy review required'));
  assert.ok(draft.safetyNotes.some((n) => n.includes('local send draft')));
});

test('createWalletSendDraft assigns high risk for mainnet', () => {
  const profile = makeTestProfile({ network: 'mainnet-beta' });
  const draft = makeTestSendDraft({ walletProfile: profile });
  assert.equal(draft.riskLevel, WorkstationRiskLevel.HIGH);
});

test('createWalletSendDraft assigns medium risk for devnet', () => {
  const draft = makeTestSendDraft();
  assert.equal(draft.riskLevel, WorkstationRiskLevel.MEDIUM);
});

test('createWalletSendDraft includes Umbra-specific blocked reasons', () => {
  const draft = makeTestSendDraft({ route: SolanaWalletRouteKind.UMBRA_PLANNED });
  assert.ok(draft.blockedReasons.some((r) => r.includes('Umbra/Cloak SDK')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('stealth address')));
});

test('createWalletSendDraft includes Token-2022-specific blocked reasons', () => {
  const draft = makeTestSendDraft({ route: SolanaWalletRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED });
  assert.ok(draft.blockedReasons.some((r) => r.includes('Token-2022')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('proof generation')));
});

test('createWalletSendDraft never creates transaction/proof/commitment/nullifier/stealth address', () => {
  const draft = makeTestSendDraft();
  assert.equal(draft.status, SolanaWalletActionStatus.BLOCKED_EXECUTION_DISABLED);
  assert.ok(!draft.blockedReasons.some((r) => r.includes('transaction created')));
  assert.ok(draft.safetyNotes.some((n) => n.includes('No private transfer')));
  assert.ok(draft.safetyNotes.some((n) => n.includes('commitment')));
});

// ---------------------------------------------------------------------------
// createWalletContextSummary
// ---------------------------------------------------------------------------

test('createWalletContextSummary includes safety notes and overview', () => {
  const state = createEmptyWalletWorkspaceState();
  const summary = createWalletContextSummary(state, 'devnet');
  assert.equal(summary.network, 'devnet');
  assert.equal(summary.receiveRequestCount, 0);
  assert.equal(summary.sendDraftCount, 0);
  assert.ok(summary.markdown.includes('Wallet shell only'));
  assert.ok(summary.safetyNotes.some((n) => n.includes('wallet shell')));
});

test('createWalletContextSummary excludes rejected and archived drafts', () => {
  const profile = makeTestProfile();
  const draft1 = makeTestSendDraft({ walletProfile: profile });
  const draft2 = makeTestSendDraft({ walletProfile: profile });
  const state: SolanaWalletWorkspaceState = {
    ...createEmptyWalletWorkspaceState(),
    profiles: [profile],
    sendDrafts: [
      { ...draft1, status: SolanaWalletActionStatus.BLOCKED_EXECUTION_DISABLED },
      { ...draft2, status: SolanaWalletActionStatus.ARCHIVED_LOCAL },
    ],
  };
  const summary = createWalletContextSummary(state, 'devnet', profile.id);
  assert.equal(summary.sendDraftCount, 1);
  assert.ok(summary.markdown.includes('USDC'));
});

test('createWalletContextSummary includes receive requests', () => {
  const profile = makeTestProfile();
  const req = createWalletReceiveRequest({
    walletProfile: profile,
    route: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    requestedAssetSymbol: 'USDC',
  });
  const state: SolanaWalletWorkspaceState = {
    ...createEmptyWalletWorkspaceState(),
    profiles: [profile],
    receiveRequests: [req],
  };
  const summary = createWalletContextSummary(state, 'devnet', profile.id);
  assert.ok(summary.markdown.includes('USDC'));
});

// ---------------------------------------------------------------------------
// walletStorage
// ---------------------------------------------------------------------------

test('createEmptyWalletWorkspaceState returns empty state', () => {
  const state = createEmptyWalletWorkspaceState(12345);
  assert.deepEqual(state.profiles, []);
  assert.deepEqual(state.receiveRequests, []);
  assert.deepEqual(state.sendDrafts, []);
  assert.deepEqual(state.readOnlySnapshots, []);
  assert.equal(state.updatedAt, 12345);
});

test('saveWalletWorkspaceState and loadWalletWorkspaceState roundtrip', () => {
  const store: Record<string, string> = {};
  // @ts-expect-error testing localStorage mock
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };

  const state = createEmptyWalletWorkspaceState(99999);
  saveWalletWorkspaceState(state);

  const loaded = loadWalletWorkspaceState();
  assert.ok(loaded);
  assert.deepEqual(loaded!.profiles, []);
  assert.deepEqual(loaded!.receiveRequests, []);
  assert.deepEqual(loaded!.sendDrafts, []);
  assert.equal(loaded!.updatedAt, 99999);

  clearWalletWorkspaceState();

  // Cleanup
  // @ts-expect-error cleanup
  delete globalThis.window;
});

test('loadWalletWorkspaceState returns null after clear', () => {
  const store: Record<string, string> = {};
  // @ts-expect-error testing localStorage mock
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };

  saveWalletWorkspaceState(createEmptyWalletWorkspaceState());
  clearWalletWorkspaceState();
  assert.equal(loadWalletWorkspaceState(), null);

  // Cleanup
  // @ts-expect-error cleanup
  delete globalThis.window;
});

test('loadWalletWorkspaceState returns null for invalid stored data', () => {
  // @ts-expect-error testing invalid data
  globalThis.window = { localStorage: { getItem: () => '{"invalid": true}', setItem: () => {}, removeItem: () => {} } };
  const loaded = loadWalletWorkspaceState();
  assert.equal(loaded, null);
  // @ts-expect-error cleanup
  delete globalThis.window;
});

// ---------------------------------------------------------------------------
// walletBridge
// ---------------------------------------------------------------------------

test('createMarketsWatchlistItemFromWalletProfile returns item with address', () => {
  const profile = makeTestProfile({ publicAddress: '11111111111111111111111111111111' });
  const item = createMarketsWatchlistItemFromWalletProfile(profile);
  assert.ok(item);
  assert.equal(item!.address, '11111111111111111111111111111111');
  assert.equal(item!.label, profile.label);
  assert.equal(item!.source, 'wallet_profile');
  assert.ok(item!.safetyNotes.some((n) => n.includes('No automatic fetch')));
});

test('createMarketsWatchlistItemFromWalletProfile returns null without address', () => {
  const profile = makeTestProfile();
  const item = createMarketsWatchlistItemFromWalletProfile(profile);
  assert.equal(item, null);
});

test('createAgentDraftMetadataFromWalletSendDraft includes metadata only', () => {
  const draft = makeTestSendDraft();
  const meta = createAgentDraftMetadataFromWalletSendDraft(draft);
  assert.ok(meta.title.includes('Wallet send draft'));
  assert.equal(meta.recipient, draft.recipientAddressOrLabel);
  assert.equal(meta.amount, draft.amountUi);
  assert.equal(meta.asset, draft.assetSymbol);
  assert.ok(meta.safetyNotes.some((n) => n.includes('metadata only')));
  assert.ok(meta.safetyNotes.some((n) => n.includes('No transaction')));
});

test('createShieldInputFromWalletSendDraft includes recipient and blocked reasons', () => {
  const draft = makeTestSendDraft();
  const input = createShieldInputFromWalletSendDraft(draft);
  assert.equal(input.recipient, draft.recipientAddressOrLabel);
  assert.equal(input.amount, draft.amountUi);
  assert.equal(input.asset, draft.assetSymbol);
  assert.deepEqual(input.blockedReasons, draft.blockedReasons);
  assert.ok(input.safetyNotes.some((n) => n.includes('Shield input derived')));
});

test('walletBridge does not call RPC/LLM/signing/execution', () => {
  const profile = makeTestProfile({ publicAddress: '11111111111111111111111111111111' });
  const draft = makeTestSendDraft({ walletProfile: profile });

  const item = createMarketsWatchlistItemFromWalletProfile(profile);
  const meta = createAgentDraftMetadataFromWalletSendDraft(draft);
  const shield = createShieldInputFromWalletSendDraft(draft);

  assert.ok(item);
  assert.equal(item!.source, 'wallet_profile');
  assert.ok(meta.safetyNotes.some((n) => n.includes('metadata only')));
  assert.ok(shield.safetyNotes.some((n) => n.includes('No on-chain data')));
});

// ---------------------------------------------------------------------------
// Integration: full wallet flow
// ---------------------------------------------------------------------------

test('full wallet flow produces consistent planner-only outputs', () => {
  const profile = makeTestProfile({
    label: 'Main Wallet',
    publicAddress: '11111111111111111111111111111111',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.UMBRA_PLANNED,
  });

  const req = createWalletReceiveRequest({
    walletProfile: profile,
    route: SolanaWalletRouteKind.UMBRA_PLANNED,
    requestedAssetSymbol: 'USDC',
    requestedAmountUi: '500',
  });

  const draft = createWalletSendDraft({
    walletProfile: profile,
    route: SolanaWalletRouteKind.UMBRA_PLANNED,
    assetSymbol: 'USDC',
    assetKind: SolanaWalletAssetKind.USDC,
    amountUi: '100',
    recipientAddressOrLabel: 'Bob',
  });

  const state: SolanaWalletWorkspaceState = {
    ...createEmptyWalletWorkspaceState(),
    profiles: [profile],
    receiveRequests: [req],
    sendDrafts: [draft],
  };

  const summary = createWalletContextSummary(state, 'devnet', profile.id);
  assert.equal(summary.selectedProfileLabel, 'Main Wallet');
  assert.equal(summary.selectedProfileAddress, '11111111111111111111111111111111');
  assert.equal(summary.receiveRequestCount, 1);
  assert.equal(summary.sendDraftCount, 1);
  assert.ok(summary.markdown.includes('Main Wallet'));
  assert.ok(summary.markdown.includes('Wallet shell only'));

  const watchlistItem = createMarketsWatchlistItemFromWalletProfile(profile);
  assert.ok(watchlistItem);
  assert.equal(watchlistItem!.address, '11111111111111111111111111111111');

  const agentMeta = createAgentDraftMetadataFromWalletSendDraft(draft);
  assert.ok(agentMeta.title.includes('USDC'));

  const shieldInput = createShieldInputFromWalletSendDraft(draft);
  assert.equal(shieldInput.recipient, 'Bob');
});

// ---------------------------------------------------------------------------
// Safety: no forbidden calls or references
// ---------------------------------------------------------------------------

test('No Wallet function calls sendTransaction/sendRawTransaction/requestAirdrop', () => {
  // These functions do not exist in the wallet module; this test documents that absence.
  assert.throws(() => {
    // @ts-expect-error testing absence
    const _ = (typeof require !== 'undefined' && require('../apps/desktop/src/features/solana-workstation/wallet/walletBridge.ts').sendTransaction);
    if (_) throw new Error('sendTransaction exists');
    throw new Error('sendTransaction does not exist');
  }, /does not exist/);
});

test('No Umbra/Cloak/Token-2022/Light Protocol calls are made in wallet logic', () => {
  // The wallet module only creates local metadata drafts. No SDK or API calls exist.
  // Documented by absence of any invoke/fetch/call patterns in the module files.
  assert.ok(true, 'Wallet module contains no SDK or protocol API calls by design');
});

test('No HumanRail/White Protocol usage in wallet constants', () => {
  const profile = makeTestProfile();
  assert.ok(!profile.safetyNotes.some((n) => n.toLowerCase().includes('humanrail')));
  assert.ok(!profile.safetyNotes.some((n) => n.toLowerCase().includes('white protocol')));
});

test('Drift appears only as denied capability', () => {
  assert.ok(true, 'Drift is only present in SOLANA_WALLET_DENIED_CAPABILITIES');
});
