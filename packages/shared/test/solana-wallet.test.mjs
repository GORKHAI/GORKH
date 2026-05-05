import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaWalletProfileStatus,
  SolanaWalletCapabilityStatus,
  SolanaWalletRouteKind,
  SolanaWalletActionKind,
  SolanaWalletActionStatus,
  SolanaWalletAssetKind,
  SolanaWalletProfileSchema,
  SolanaWalletReceiveRequestSchema,
  SolanaWalletSendDraftSchema,
  SolanaWalletReadOnlySnapshotSchema,
  SolanaWalletSnapshotResultSchema,
  SolanaWalletWorkspaceStateSchema,
  SolanaWalletContextSummarySchema,
  SolanaExternalWalletConnectionSchema,
  SolanaWalletConnectionStateSchema,
  SolanaWalletConnectionCapabilitySchema,
  SolanaWalletHandoffRequestSchema,
  SolanaWalletHandoffResultSchema,
  SolanaWalletHandoffPayloadSchema,
  SolanaWalletOwnershipProofStatus,
  SolanaWalletOwnershipProofStatusSchema,
  SolanaWalletOwnershipProofRequestSchema,
  SolanaWalletOwnershipProofResultSchema,
  SolanaWalletVerifiedOwnershipSchema,
  SolanaWalletPortfolioTokenHoldingSchema,
  SolanaWalletPortfolioSummarySchema,
  SolanaWalletPortfolioContextSummarySchema,
  SOLANA_WALLET_PHASE_10_SAFETY_NOTES,
  SOLANA_WALLET_READ_ONLY_SAFETY_NOTES,
  SOLANA_WALLET_DENIED_CAPABILITIES,
  SOLANA_WALLET_DISABLED_SIGNING_METHODS,
  SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES,
  SOLANA_WALLET_CONNECTION_STRATEGY,
  SOLANA_WALLET_ROUTE_LABELS,
  SOLANA_WALLET_ACTION_LABELS,
  SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES,
  SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS,
  SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
  SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS,
  SOLANA_WALLET_OWNERSHIP_PROOF_MESSAGE_TEMPLATE_VERSION,
  SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
  buildOwnershipProofMessage,
  isSolanaWalletProfileStatus,
  isSolanaWalletRouteKind,
  isDeniedWalletCapability,
  getWalletRouteLabel,
  getWalletActionLabel,
  isForbiddenHandoffPayloadField,
  hasForbiddenHandoffPayloadFields,
} from '../dist/index.js';

// ----------------------------------------------------------------------------
// Enum values
// ----------------------------------------------------------------------------

test('SolanaWalletProfileStatus contains all expected statuses', () => {
  assert.equal(SolanaWalletProfileStatus.LOCAL_PROFILE, 'local_profile');
  assert.equal(SolanaWalletProfileStatus.ADDRESS_ONLY, 'address_only');
  assert.equal(SolanaWalletProfileStatus.FUTURE_CONNECTED, 'future_connected');
  assert.equal(SolanaWalletProfileStatus.DISABLED, 'disabled');
  assert.equal(SolanaWalletProfileStatus.ARCHIVED, 'archived');
});

test('SolanaWalletCapabilityStatus contains all expected statuses', () => {
  assert.equal(SolanaWalletCapabilityStatus.AVAILABLE_READ_ONLY, 'available_read_only');
  assert.equal(SolanaWalletCapabilityStatus.PLANNED, 'planned');
  assert.equal(SolanaWalletCapabilityStatus.DISABLED, 'disabled');
});

test('SolanaWalletRouteKind contains all expected routes', () => {
  assert.equal(SolanaWalletRouteKind.UMBRA_PLANNED, 'umbra_planned');
  assert.equal(SolanaWalletRouteKind.CLOAK_PLANNED, 'cloak_planned');
  assert.equal(SolanaWalletRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED, 'token_2022_confidential_transfer_planned');
  assert.equal(SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY, 'manual_privacy_review_only');
});

test('SolanaWalletActionKind contains all expected actions', () => {
  assert.equal(SolanaWalletActionKind.RECEIVE_PRIVATE, 'receive_private');
  assert.equal(SolanaWalletActionKind.SEND_PRIVATE, 'send_private');
  assert.equal(SolanaWalletActionKind.VIEW_WALLET, 'view_wallet');
  assert.equal(SolanaWalletActionKind.OPEN_MARKETS, 'open_markets');
  assert.equal(SolanaWalletActionKind.REVIEW_PRIVACY, 'review_privacy');
  assert.equal(SolanaWalletActionKind.COPY_RECEIVE_REQUEST, 'copy_receive_request');
});

test('SolanaWalletActionStatus contains all expected statuses', () => {
  assert.equal(SolanaWalletActionStatus.DRAFT, 'draft');
  assert.equal(SolanaWalletActionStatus.PREVIEW_READY, 'preview_ready');
  assert.equal(SolanaWalletActionStatus.REQUIRES_MANUAL_REVIEW, 'requires_manual_review');
  assert.equal(SolanaWalletActionStatus.BLOCKED_EXECUTION_DISABLED, 'blocked_execution_disabled');
  assert.equal(SolanaWalletActionStatus.REJECTED_LOCAL, 'rejected_local');
  assert.equal(SolanaWalletActionStatus.ARCHIVED_LOCAL, 'archived_local');
});

test('SolanaWalletAssetKind contains all expected asset kinds', () => {
  assert.equal(SolanaWalletAssetKind.SOL, 'SOL');
  assert.equal(SolanaWalletAssetKind.USDC, 'USDC');
  assert.equal(SolanaWalletAssetKind.SPL_TOKEN, 'SPL_TOKEN');
  assert.equal(SolanaWalletAssetKind.TOKEN_2022, 'TOKEN_2022');
  assert.equal(SolanaWalletAssetKind.UNKNOWN, 'UNKNOWN');
});

// ----------------------------------------------------------------------------
// Schema validation
// ----------------------------------------------------------------------------

test('SolanaWalletProfileSchema validates valid profile', () => {
  const valid = {
    id: 'wp1',
    label: 'My Wallet',
    publicAddress: '11111111111111111111111111111111',
    network: 'devnet',
    status: 'address_only',
    preferredPrivateRoute: 'manual_privacy_review_only',
    tags: ['personal'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    localOnly: true,
    safetyNotes: [],
  };
  const result = SolanaWalletProfileSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaWalletProfileSchema rejects missing label', () => {
  const invalid = { id: 'wp1', network: 'devnet', status: 'local_profile', preferredPrivateRoute: 'manual_privacy_review_only', tags: [], createdAt: 0, updatedAt: 0, localOnly: true, safetyNotes: [] };
  const result = SolanaWalletProfileSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test('SolanaWalletReceiveRequestSchema validates valid receive request', () => {
  const valid = {
    id: 'wr1',
    walletProfileId: 'wp1',
    route: 'manual_privacy_review_only',
    network: 'devnet',
    requestedAssetSymbol: 'USDC',
    payloadVersion: 'gorkh-wallet-receive-request-v1',
    payloadJson: '{}',
    createdAt: Date.now(),
    localOnly: true,
    safetyNotes: [],
  };
  const result = SolanaWalletReceiveRequestSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaWalletSendDraftSchema validates valid send draft', () => {
  const valid = {
    id: 'ws1',
    walletProfileId: 'wp1',
    route: 'cloak_planned',
    network: 'devnet',
    assetSymbol: 'USDC',
    assetKind: 'USDC',
    amountUi: '100',
    recipientAddressOrLabel: 'Alice',
    memoPolicy: 'no_memo',
    status: 'blocked_execution_disabled',
    riskLevel: 'medium',
    blockedReasons: ['Wallet connection disabled'],
    requiredManualReviews: ['Manual review'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    localOnly: true,
    safetyNotes: [],
  };
  const result = SolanaWalletSendDraftSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaWalletReadOnlySnapshotSchema validates valid snapshot', () => {
  const valid = {
    walletProfileId: 'wp1',
    address: '11111111111111111111111111111111',
    network: 'devnet',
    source: 'manual_address',
    safetyNotes: [],
  };
  const result = SolanaWalletReadOnlySnapshotSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaWalletReadOnlySnapshotSchema accepts snapshot with SOL balance and token preview', () => {
  const valid = {
    walletProfileId: 'wp1',
    address: '11111111111111111111111111111111',
    network: 'devnet',
    accountExists: true,
    owner: 'SystemProgram11111111111111111111111111111111',
    executable: false,
    dataLength: 0,
    solBalanceLamports: '1000000000',
    solBalanceUi: '1.0',
    tokenAccountCount: 2,
    tokenAccountsPreview: [
      { pubkey: 'tok1', mint: 'USDC11111111111111111111111111111111111111', amountRaw: '500000', amountUi: '0.5', decimals: 6, uiAmountString: '0.5' },
      { pubkey: 'tok2', mint: 'SOL11111111111111111111111111111111111111' },
    ],
    fetchedAt: Date.now(),
    source: 'rpc_read_only',
    safetyNotes: ['Read-only lookup.'],
    warnings: [],
  };
  const result = SolanaWalletReadOnlySnapshotSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaWalletSnapshotResultSchema accepts ready state', () => {
  const ready = {
    status: 'ready',
    snapshot: {
      walletProfileId: 'wp1',
      address: '11111111111111111111111111111111',
      network: 'devnet',
      solBalanceLamports: '1000000000',
      solBalanceUi: '1.0',
      source: 'rpc_read_only',
      safetyNotes: [],
      warnings: [],
    },
    fetchedAt: Date.now(),
  };
  assert.ok(SolanaWalletSnapshotResultSchema.safeParse(ready).success);
});

test('SolanaWalletSnapshotResultSchema accepts error state', () => {
  const error = {
    status: 'error',
    error: 'RPC timeout',
    fetchedAt: Date.now(),
  };
  assert.ok(SolanaWalletSnapshotResultSchema.safeParse(error).success);
});

test('SolanaWalletWorkspaceStateSchema validates valid workspace', () => {
  const valid = {
    profiles: [],
    receiveRequests: [],
    sendDrafts: [],
    readOnlySnapshots: [],
    updatedAt: Date.now(),
  };
  const result = SolanaWalletWorkspaceStateSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaWalletContextSummarySchema validates valid summary', () => {
  const valid = {
    generatedAt: new Date().toISOString(),
    network: 'devnet',
    receiveRequestCount: 0,
    sendDraftCount: 0,
    markdown: '# Summary',
    redactionsApplied: [],
    safetyNotes: [],
  };
  const result = SolanaWalletContextSummarySchema.safeParse(valid);
  assert.ok(result.success);
});

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

test('SOLANA_WALLET_PHASE_10_SAFETY_NOTES contains wallet shell disclaimer', () => {
  assert.ok(SOLANA_WALLET_PHASE_10_SAFETY_NOTES.length >= 4);
  assert.ok(SOLANA_WALLET_PHASE_10_SAFETY_NOTES.some((n) => n.includes('wallet shell')));
  assert.ok(SOLANA_WALLET_PHASE_10_SAFETY_NOTES.some((n) => n.includes('No private key')));
  assert.ok(SOLANA_WALLET_PHASE_10_SAFETY_NOTES.some((n) => n.includes('No signing')));
  assert.ok(SOLANA_WALLET_PHASE_10_SAFETY_NOTES.some((n) => n.includes('planned integrations')));
});

test('SOLANA_WALLET_READ_ONLY_SAFETY_NOTES includes read-only/no signing/cannot move funds/RPC privacy', () => {
  assert.ok(SOLANA_WALLET_READ_ONLY_SAFETY_NOTES.length >= 4);
  assert.ok(SOLANA_WALLET_READ_ONLY_SAFETY_NOTES.some((n) => n.includes('Read-only')));
  assert.ok(SOLANA_WALLET_READ_ONLY_SAFETY_NOTES.some((n) => n.includes('No wallet connection or signing')));
  assert.ok(SOLANA_WALLET_READ_ONLY_SAFETY_NOTES.some((n) => n.includes('cannot move funds')));
  assert.ok(SOLANA_WALLET_READ_ONLY_SAFETY_NOTES.some((n) => n.includes('RPC providers can observe')));
});

test('SOLANA_WALLET_DENIED_CAPABILITIES denies keys, signing, execution, and drift', () => {
  assert.ok(isDeniedWalletCapability('private_key_import'));
  assert.ok(isDeniedWalletCapability('seed_phrase'));
  assert.ok(isDeniedWalletCapability('mnemonic'));
  assert.ok(isDeniedWalletCapability('wallet_json'));
  assert.ok(isDeniedWalletCapability('keypair_generation'));
  assert.ok(isDeniedWalletCapability('signing'));
  assert.ok(isDeniedWalletCapability('transaction_execution'));
  assert.ok(isDeniedWalletCapability('swap_execution'));
  assert.ok(isDeniedWalletCapability('trade_execution'));
  assert.ok(isDeniedWalletCapability('stealth_address_generation'));
  assert.ok(isDeniedWalletCapability('note_generation'));
  assert.ok(isDeniedWalletCapability('commitment_generation'));
  assert.ok(isDeniedWalletCapability('nullifier_generation'));
  assert.ok(isDeniedWalletCapability('zk_proof_generation'));
  assert.ok(isDeniedWalletCapability('umbra_api_call'));
  assert.ok(isDeniedWalletCapability('cloak_api_call'));
  assert.ok(isDeniedWalletCapability('token_2022_transaction_construction'));
  assert.ok(isDeniedWalletCapability('drift'));
  assert.ok(!isDeniedWalletCapability('some_random_capability'));
});

test('SOLANA_WALLET_ROUTE_LABELS maps all routes', () => {
  assert.equal(getWalletRouteLabel('umbra_planned'), 'Umbra Planned');
  assert.equal(getWalletRouteLabel('cloak_planned'), 'Cloak Planned');
  assert.equal(getWalletRouteLabel('token_2022_confidential_transfer_planned'), 'Token-2022 Confidential Transfers Planned');
  assert.equal(getWalletRouteLabel('manual_privacy_review_only'), 'Manual Privacy Review Only');
});

test('SOLANA_WALLET_ACTION_LABELS maps all actions', () => {
  assert.equal(getWalletActionLabel('receive_private'), 'Receive Privately');
  assert.equal(getWalletActionLabel('send_private'), 'Send Privately');
  assert.equal(getWalletActionLabel('view_wallet'), 'View Wallet');
  assert.equal(getWalletActionLabel('open_markets'), 'Open Markets');
  assert.equal(getWalletActionLabel('review_privacy'), 'Review Privacy');
  assert.equal(getWalletActionLabel('copy_receive_request'), 'Copy Receive Request');
});

// ----------------------------------------------------------------------------
// Utility guards
// ----------------------------------------------------------------------------

test('isSolanaWalletProfileStatus validates known statuses', () => {
  assert.ok(isSolanaWalletProfileStatus('local_profile'));
  assert.ok(isSolanaWalletProfileStatus('address_only'));
  assert.ok(!isSolanaWalletProfileStatus('not_a_status'));
});

test('isSolanaWalletRouteKind validates known routes', () => {
  assert.ok(isSolanaWalletRouteKind('umbra_planned'));
  assert.ok(isSolanaWalletRouteKind('manual_privacy_review_only'));
  assert.ok(!isSolanaWalletRouteKind('not_a_route'));
});

// ----------------------------------------------------------------------------
// Safety: no HumanRail, White Protocol, payroll, or invoice references
// ----------------------------------------------------------------------------

test('SOLANA_WALLET_DENIED_CAPABILITIES includes drift', () => {
  assert.ok(SOLANA_WALLET_DENIED_CAPABILITIES.includes('drift'));
});

test('SOLANA_WALLET_ROUTE_LABELS does not reference HumanRail or White Protocol', () => {
  const labels = Object.values(SOLANA_WALLET_ROUTE_LABELS).join(' ').toLowerCase();
  assert.ok(!labels.includes('humanrail'), 'route labels should not contain humanrail');
  assert.ok(!labels.includes('white protocol'), 'route labels should not contain white protocol');
});

test('SOLANA_WALLET_ACTION_LABELS does not reference HumanRail or White Protocol', () => {
  const labels = Object.values(SOLANA_WALLET_ACTION_LABELS).join(' ').toLowerCase();
  assert.ok(!labels.includes('humanrail'), 'action labels should not contain humanrail');
  assert.ok(!labels.includes('white protocol'), 'action labels should not contain white protocol');
});

test('Wallet constants do not include payroll or invoice', () => {
  const allText = [
    ...SOLANA_WALLET_PHASE_10_SAFETY_NOTES,
    ...SOLANA_WALLET_READ_ONLY_SAFETY_NOTES,
    ...SOLANA_WALLET_DENIED_CAPABILITIES,
    ...Object.values(SOLANA_WALLET_ROUTE_LABELS),
    ...Object.values(SOLANA_WALLET_ACTION_LABELS),
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('payroll'), 'wallet constants should not contain payroll');
  assert.ok(!allText.includes('invoice'), 'wallet constants should not contain invoice');
});

test('SolanaWalletConnectionState schema accepts connected_read_only', () => {
  const valid = {
    status: 'connected_read_only',
    provider: 'solflare',
    publicAddress: '11111111111111111111111111111111',
    network: 'devnet',
    capabilities: [
      { name: 'read_address', status: 'enabled_read_only', safetyNote: 'Safe' },
      { name: 'sign', status: 'disabled_signing', safetyNote: 'Signing disabled' },
    ],
    updatedAt: Date.now(),
  };
  assert.ok(SolanaWalletConnectionStateSchema.safeParse(valid).success);
});

test('SolanaExternalWalletConnection schema accepts Solflare public address', () => {
  const valid = {
    id: 'conn-1',
    provider: 'solflare',
    publicAddress: '11111111111111111111111111111111',
    network: 'devnet',
    status: 'connected_read_only',
    connectedAt: Date.now(),
    localOnly: true,
    safetyNotes: ['Read-only.'],
  };
  assert.ok(SolanaExternalWalletConnectionSchema.safeParse(valid).success);
});

test('SOLANA_WALLET_DISABLED_SIGNING_METHODS includes signTransaction, signAllTransactions, signMessage, sendTransaction', () => {
  assert.ok(SOLANA_WALLET_DISABLED_SIGNING_METHODS.includes('signTransaction'));
  assert.ok(SOLANA_WALLET_DISABLED_SIGNING_METHODS.includes('signAllTransactions'));
  assert.ok(SOLANA_WALLET_DISABLED_SIGNING_METHODS.includes('signMessage'));
  assert.ok(SOLANA_WALLET_DISABLED_SIGNING_METHODS.includes('sendTransaction'));
});

test('SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES includes read-only/no signatures/no execution', () => {
  assert.ok(SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES.some((n) => n.includes('read-only')));
  assert.ok(SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES.some((n) => n.includes('does not request signatures')));
  assert.ok(SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES.some((n) => n.includes('does not construct or execute')));
  assert.ok(SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES.some((n) => n.includes('public wallet address')));
});

test('SOLANA_WALLET_CONNECTION_STRATEGY includes Solflare first, Wallet Standard later, local generated future, private-key import disabled, Turnkey future', () => {
  assert.ok(SOLANA_WALLET_CONNECTION_STRATEGY.solflareFirst);
  assert.ok(SOLANA_WALLET_CONNECTION_STRATEGY.walletStandardCompatibleLater);
  assert.ok(SOLANA_WALLET_CONNECTION_STRATEGY.localGeneratedWalletFuture);
  assert.ok(SOLANA_WALLET_CONNECTION_STRATEGY.privateKeyImportDisabled);
  assert.ok(SOLANA_WALLET_CONNECTION_STRATEGY.turnkeyFuturePolicyWallet);
});

test('Wallet constants do not include HumanRail or White Protocol', () => {
  const allText = [
    ...SOLANA_WALLET_PHASE_10_SAFETY_NOTES,
    ...SOLANA_WALLET_READ_ONLY_SAFETY_NOTES,
    ...SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES,
    ...SOLANA_WALLET_DENIED_CAPABILITIES,
    ...SOLANA_WALLET_DISABLED_SIGNING_METHODS,
    ...Object.values(SOLANA_WALLET_ROUTE_LABELS),
    ...Object.values(SOLANA_WALLET_ACTION_LABELS),
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('humanrail'), 'wallet constants should not contain humanrail');
  assert.ok(!allText.includes('white protocol'), 'wallet constants should not contain white protocol');
});

test('Wallet connection constants do not include Drift', () => {
  const allText = [
    ...SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES,
    ...SOLANA_WALLET_DISABLED_SIGNING_METHODS,
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('drift'), 'wallet connection constants should not contain drift');
});

// ----------------------------------------------------------------------------
// Handoff Types (Phase 14)
// ----------------------------------------------------------------------------

test('SolanaWalletHandoffRequestSchema validates valid request', () => {
  const valid = {
    id: 'handoff-id-1',
    requestId: 'req-1',
    nonce: 'nonce-1',
    network: 'devnet',
    expiry: Date.now() + 300000,
    createdAt: Date.now(),
  };
  assert.ok(SolanaWalletHandoffRequestSchema.safeParse(valid).success);
});

test('SolanaWalletHandoffResultSchema validates valid result', () => {
  const valid = {
    requestId: 'req-1',
    nonce: 'nonce-1',
    publicAddress: '11111111111111111111111111111111',
    provider: 'solflare',
    network: 'devnet',
    connectedAt: Date.now(),
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaWalletHandoffResultSchema.safeParse(valid).success);
});

test('SolanaWalletHandoffPayloadSchema validates valid payload', () => {
  const valid = {
    version: 'gorkh-wallet-handoff-v1',
    requestId: 'req-1',
    nonce: 'nonce-1',
    publicAddress: '11111111111111111111111111111111',
    provider: 'phantom',
    network: 'devnet',
    connectedAt: Date.now(),
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaWalletHandoffPayloadSchema.safeParse(valid).success);
});

test('SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES includes browser handoff warnings', () => {
  assert.ok(SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES.some((n) => n.includes('public wallet address')));
  assert.ok(SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES.some((n) => n.includes('private key')));
  assert.ok(SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES.some((n) => n.includes('read-only profile')));
});

test('SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS includes dangerous keys', () => {
  assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('privateKey'));
  assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('seedPhrase'));
  assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('signature'));
  assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('signedTransaction'));
});

test('hasForbiddenHandoffPayloadFields detects forbidden fields', () => {
  assert.ok(hasForbiddenHandoffPayloadFields({ privateKey: 'abc', publicAddress: 'xyz' }));
  assert.ok(!hasForbiddenHandoffPayloadFields({ publicAddress: 'xyz', provider: 'solflare' }));
});

// ----------------------------------------------------------------------------
// Ownership Proof Types (Phase 15)
// ----------------------------------------------------------------------------

test('SolanaWalletOwnershipProofStatus contains all expected statuses', () => {
  assert.equal(SolanaWalletOwnershipProofStatus.NOT_REQUESTED, 'not_requested');
  assert.equal(SolanaWalletOwnershipProofStatus.REQUESTED, 'requested');
  assert.equal(SolanaWalletOwnershipProofStatus.SIGNED, 'signed');
  assert.equal(SolanaWalletOwnershipProofStatus.VERIFIED, 'verified');
  assert.equal(SolanaWalletOwnershipProofStatus.FAILED, 'failed');
  assert.equal(SolanaWalletOwnershipProofStatus.EXPIRED, 'expired');
  assert.equal(SolanaWalletOwnershipProofStatus.UNSUPPORTED, 'unsupported');
});

test('SolanaWalletOwnershipProofRequestSchema validates valid request', () => {
  const valid = {
    id: 'proof-req-1',
    handoffRequestId: 'handoff-1',
    publicAddress: '11111111111111111111111111111111',
    provider: 'solflare',
    network: 'devnet',
    nonce: 'nonce-1',
    domain: 'app.gorkh.ai',
    statement: 'Test statement',
    message: 'Test message',
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000,
    status: 'requested',
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaWalletOwnershipProofRequestSchema.safeParse(valid).success);
});

test('SolanaWalletOwnershipProofResultSchema validates signed result', () => {
  const valid = {
    requestId: 'proof-req-1',
    handoffRequestId: 'handoff-1',
    nonce: 'nonce-1',
    publicAddress: '11111111111111111111111111111111',
    provider: 'phantom',
    network: 'devnet',
    message: 'Test message',
    signature: 'abc123',
    signatureEncoding: 'base58',
    signedAt: Date.now(),
    status: 'signed',
    verificationStatus: 'not_verified',
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaWalletOwnershipProofResultSchema.safeParse(valid).success);
});

test('SolanaWalletVerifiedOwnershipSchema validates verified proof', () => {
  const valid = {
    publicAddress: '11111111111111111111111111111111',
    provider: 'solflare',
    network: 'devnet',
    message: 'Test message',
    signature: 'abc123',
    verifiedAt: Date.now(),
    verifier: 'local_ed25519',
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaWalletVerifiedOwnershipSchema.safeParse(valid).success);
});

test('SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES includes message signing cannot move funds', () => {
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES.some((n) => n.includes('message signing only')));
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES.some((n) => n.includes('cannot move funds')));
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES.some((n) => n.includes('does not request transaction signatures')));
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES.some((n) => n.includes('optional')));
});

test('SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS includes transaction signing', () => {
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS.includes('signTransaction'));
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS.includes('signAllTransactions'));
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS.includes('sendTransaction'));
  assert.ok(SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS.includes('sendRawTransaction'));
  assert.ok(!SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS.includes('signMessage'));
});

test('SOLANA_WALLET_OWNERSHIP_PROOF_MESSAGE_TEMPLATE_VERSION equals expected value', () => {
  assert.equal(SOLANA_WALLET_OWNERSHIP_PROOF_MESSAGE_TEMPLATE_VERSION, 'gorkh-wallet-ownership-proof-v1');
});

test('buildOwnershipProofMessage is deterministic and includes required fields', () => {
  const now = Date.now();
  const msg = buildOwnershipProofMessage({
    publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    provider: 'solflare',
    network: 'devnet',
    requestId: 'req-1',
    nonce: 'nonce-abc',
    domain: 'app.gorkh.ai',
    createdAt: now,
    expiresAt: now + 300000,
  });
  assert.ok(msg.includes('GORKH Wallet Ownership Proof'));
  assert.ok(msg.includes('gorkh-wallet-ownership-proof-v1'));
  assert.ok(msg.includes('HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'));
  assert.ok(msg.includes('solflare'));
  assert.ok(msg.includes('devnet'));
  assert.ok(msg.includes('req-1'));
  assert.ok(msg.includes('nonce-abc'));
  assert.ok(msg.includes('app.gorkh.ai'));
  assert.ok(msg.includes('cannot move funds'));
  assert.ok(msg.includes('Issued At'));
  assert.ok(msg.includes('Expires At'));
});

test('buildOwnershipProofMessage uses custom statement when provided', () => {
  const msg = buildOwnershipProofMessage({
    publicAddress: '11111111111111111111111111111111',
    provider: 'phantom',
    network: 'devnet',
    requestId: 'req-2',
    nonce: 'nonce-2',
    domain: 'localhost',
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000,
    statement: 'Custom ownership statement.',
  });
  assert.ok(msg.includes('Custom ownership statement.'));
});

test('Ownership proof constants do not include HumanRail or White Protocol', () => {
  const allText = [
    ...SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('humanrail'));
  assert.ok(!allText.includes('white protocol'));
});

test('Ownership proof constants do not include Drift', () => {
  const allText = [
    ...SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
    ...SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS,
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('drift'));
});

// ----------------------------------------------------------------------------
// Portfolio Types (Phase 16)
// ----------------------------------------------------------------------------

test('SolanaWalletPortfolioTokenHolding schema accepts valid holding', () => {
  const valid = {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenAccountPubkeys: ['abc123'],
    tokenAccountCount: 1,
    amountRaw: '1000000',
    amountUi: '1.0',
    decimals: 6,
    uiAmountString: '1.0',
    source: 'token_accounts_preview',
    warnings: [],
  };
  assert.ok(SolanaWalletPortfolioTokenHoldingSchema.safeParse(valid).success);
});

test('SolanaWalletPortfolioSummary schema accepts portfolio with SOL balance and holdings', () => {
  const valid = {
    walletProfileId: 'profile-1',
    publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    network: 'devnet',
    solBalanceLamports: '1000000000',
    solBalanceUi: '1',
    tokenHoldingCount: 1,
    tokenAccountCount: 2,
    holdings: [
      {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenAccountPubkeys: ['abc123', 'def456'],
        tokenAccountCount: 2,
        amountRaw: '2000000',
        source: 'token_accounts_preview',
        warnings: [],
      },
    ],
    generatedAt: Date.now(),
    safetyNotes: ['Safe'],
    warnings: [],
  };
  assert.ok(SolanaWalletPortfolioSummarySchema.safeParse(valid).success);
});

test('SolanaWalletPortfolioContextSummary schema accepts valid context summary', () => {
  const valid = {
    generatedAt: new Date().toISOString(),
    walletProfileLabel: 'Test Wallet',
    publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
    network: 'devnet',
    tokenHoldingCount: 0,
    tokenAccountCount: 0,
    markdown: '# Portfolio',
    redactionsApplied: [],
    safetyNotes: ['Safe'],
  };
  assert.ok(SolanaWalletPortfolioContextSummarySchema.safeParse(valid).success);
});

test('Portfolio safety notes include read-only/no prices/no execution', () => {
  assert.ok(SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES.some((n) => n.includes('read-only')));
  assert.ok(SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES.some((n) => n.includes('No prices')));
  assert.ok(SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES.some((n) => n.includes('cannot sign')));
  assert.ok(SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES.some((n) => n.includes('Token holdings')));
});

test('Portfolio constants do not include HumanRail or White Protocol', () => {
  const allText = [...SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES].join(' ').toLowerCase();
  assert.ok(!allText.includes('humanrail'));
  assert.ok(!allText.includes('white protocol'));
});

test('Portfolio constants do not include Drift', () => {
  const allText = [...SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES].join(' ').toLowerCase();
  assert.ok(!allText.includes('drift'));
});
