import { z } from 'zod';
import { SolanaRpcNetworkSchema } from './solana-rpc.js';
import { WorkstationRiskLevelSchema } from './solana-workstation.js';

// ============================================================================
// GORKH Wallet v0.1 — Shared Domain Types (Phase 10)
// ============================================================================
// Wallet shell only. No private keys. No signing. No execution. No custody.
// Local profile, receive request, send draft, and read-only snapshot types.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaWalletProfileStatus = {
  LOCAL_PROFILE: 'local_profile',
  ADDRESS_ONLY: 'address_only',
  FUTURE_CONNECTED: 'future_connected',
  DISABLED: 'disabled',
  ARCHIVED: 'archived',
} as const;
export type SolanaWalletProfileStatus =
  (typeof SolanaWalletProfileStatus)[keyof typeof SolanaWalletProfileStatus];

export const SolanaWalletCapabilityStatus = {
  AVAILABLE_READ_ONLY: 'available_read_only',
  PLANNED: 'planned',
  DISABLED: 'disabled',
} as const;
export type SolanaWalletCapabilityStatus =
  (typeof SolanaWalletCapabilityStatus)[keyof typeof SolanaWalletCapabilityStatus];

export const SolanaWalletRouteKind = {
  UMBRA_PLANNED: 'umbra_planned',
  CLOAK_PLANNED: 'cloak_planned',
  TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED: 'token_2022_confidential_transfer_planned',
  MANUAL_PRIVACY_REVIEW_ONLY: 'manual_privacy_review_only',
} as const;
export type SolanaWalletRouteKind =
  (typeof SolanaWalletRouteKind)[keyof typeof SolanaWalletRouteKind];

export const SolanaWalletActionKind = {
  RECEIVE_PRIVATE: 'receive_private',
  SEND_PRIVATE: 'send_private',
  VIEW_WALLET: 'view_wallet',
  OPEN_MARKETS: 'open_markets',
  REVIEW_PRIVACY: 'review_privacy',
  COPY_RECEIVE_REQUEST: 'copy_receive_request',
} as const;
export type SolanaWalletActionKind =
  (typeof SolanaWalletActionKind)[keyof typeof SolanaWalletActionKind];

export const SolanaWalletActionStatus = {
  DRAFT: 'draft',
  PREVIEW_READY: 'preview_ready',
  REQUIRES_MANUAL_REVIEW: 'requires_manual_review',
  BLOCKED_EXECUTION_DISABLED: 'blocked_execution_disabled',
  REJECTED_LOCAL: 'rejected_local',
  ARCHIVED_LOCAL: 'archived_local',
} as const;
export type SolanaWalletActionStatus =
  (typeof SolanaWalletActionStatus)[keyof typeof SolanaWalletActionStatus];

export const SolanaWalletAssetKind = {
  SOL: 'SOL',
  USDC: 'USDC',
  SPL_TOKEN: 'SPL_TOKEN',
  TOKEN_2022: 'TOKEN_2022',
  UNKNOWN: 'UNKNOWN',
} as const;
export type SolanaWalletAssetKind =
  (typeof SolanaWalletAssetKind)[keyof typeof SolanaWalletAssetKind];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaWalletProfileStatusSchema = z.enum([
  SolanaWalletProfileStatus.LOCAL_PROFILE,
  SolanaWalletProfileStatus.ADDRESS_ONLY,
  SolanaWalletProfileStatus.FUTURE_CONNECTED,
  SolanaWalletProfileStatus.DISABLED,
  SolanaWalletProfileStatus.ARCHIVED,
]);

export const SolanaWalletCapabilityStatusSchema = z.enum([
  SolanaWalletCapabilityStatus.AVAILABLE_READ_ONLY,
  SolanaWalletCapabilityStatus.PLANNED,
  SolanaWalletCapabilityStatus.DISABLED,
]);

export const SolanaWalletRouteKindSchema = z.enum([
  SolanaWalletRouteKind.UMBRA_PLANNED,
  SolanaWalletRouteKind.CLOAK_PLANNED,
  SolanaWalletRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED,
  SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
]);

export const SolanaWalletActionKindSchema = z.enum([
  SolanaWalletActionKind.RECEIVE_PRIVATE,
  SolanaWalletActionKind.SEND_PRIVATE,
  SolanaWalletActionKind.VIEW_WALLET,
  SolanaWalletActionKind.OPEN_MARKETS,
  SolanaWalletActionKind.REVIEW_PRIVACY,
  SolanaWalletActionKind.COPY_RECEIVE_REQUEST,
]);

export const SolanaWalletActionStatusSchema = z.enum([
  SolanaWalletActionStatus.DRAFT,
  SolanaWalletActionStatus.PREVIEW_READY,
  SolanaWalletActionStatus.REQUIRES_MANUAL_REVIEW,
  SolanaWalletActionStatus.BLOCKED_EXECUTION_DISABLED,
  SolanaWalletActionStatus.REJECTED_LOCAL,
  SolanaWalletActionStatus.ARCHIVED_LOCAL,
]);

export const SolanaWalletAssetKindSchema = z.enum([
  SolanaWalletAssetKind.SOL,
  SolanaWalletAssetKind.USDC,
  SolanaWalletAssetKind.SPL_TOKEN,
  SolanaWalletAssetKind.TOKEN_2022,
  SolanaWalletAssetKind.UNKNOWN,
]);

export const SolanaWalletProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  publicAddress: z.string().optional(),
  network: SolanaRpcNetworkSchema,
  status: SolanaWalletProfileStatusSchema,
  preferredPrivateRoute: SolanaWalletRouteKindSchema,
  tags: z.array(z.string()),
  notes: z.string().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletReceiveRequestSchema = z.object({
  id: z.string().min(1),
  walletProfileId: z.string().min(1),
  route: SolanaWalletRouteKindSchema,
  network: SolanaRpcNetworkSchema,
  requestedAssetSymbol: z.string().min(1),
  requestedAmountUi: z.string().optional(),
  recipientPublicAddress: z.string().optional(),
  label: z.string().optional(),
  purpose: z.string().optional(),
  payloadVersion: z.literal('gorkh-wallet-receive-request-v1'),
  payloadJson: z.string(),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletSendDraftSchema = z.object({
  id: z.string().min(1),
  walletProfileId: z.string().min(1),
  route: SolanaWalletRouteKindSchema,
  network: SolanaRpcNetworkSchema,
  assetSymbol: z.string().min(1),
  assetKind: SolanaWalletAssetKindSchema,
  amountUi: z.string().min(1),
  recipientAddressOrLabel: z.string().min(1),
  memoPolicy: z.enum(['no_memo', 'local_note_only']),
  status: SolanaWalletActionStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  blockedReasons: z.array(z.string()),
  requiredManualReviews: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletTokenAccountPreviewSchema = z.object({
  pubkey: z.string().min(1),
  mint: z.string().min(1),
  owner: z.string().optional(),
  amountRaw: z.string().optional(),
  amountUi: z.string().optional(),
  decimals: z.number().int().optional(),
  uiAmountString: z.string().optional(),
});

export const SolanaWalletReadOnlySnapshotSchema = z.object({
  walletProfileId: z.string().min(1),
  address: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  accountExists: z.boolean().optional(),
  owner: z.string().optional(),
  executable: z.boolean().optional(),
  dataLength: z.number().int().optional(),
  solBalanceLamports: z.string().optional(),
  solBalanceUi: z.string().optional(),
  tokenAccountCount: z.number().int().optional(),
  tokenAccountsPreview: z.array(SolanaWalletTokenAccountPreviewSchema).default([]),
  fetchedAt: z.number().int().optional(),
  source: z.enum(['manual_address', 'markets_snapshot', 'not_fetched', 'rpc_read_only']),
  safetyNotes: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
});

export const SolanaWalletWorkspaceStateSchema = z.object({
  profiles: z.array(SolanaWalletProfileSchema),
  selectedProfileId: z.string().optional(),
  receiveRequests: z.array(SolanaWalletReceiveRequestSchema),
  sendDrafts: z.array(SolanaWalletSendDraftSchema),
  readOnlySnapshots: z.array(SolanaWalletReadOnlySnapshotSchema),
  updatedAt: z.number().int(),
});

export const SolanaWalletSnapshotStatusSchema = z.enum([
  'idle',
  'loading',
  'ready',
  'error',
]);

export const SolanaWalletSnapshotResultSchema = z.object({
  status: SolanaWalletSnapshotStatusSchema,
  snapshot: SolanaWalletReadOnlySnapshotSchema.optional(),
  error: z.string().optional(),
  fetchedAt: z.number().int().optional(),
});

export const SolanaWalletContextSummarySchema = z.object({
  generatedAt: z.string(),
  selectedProfileLabel: z.string().optional(),
  selectedProfileAddress: z.string().optional(),
  network: SolanaRpcNetworkSchema,
  receiveRequestCount: z.number().int().nonnegative(),
  sendDraftCount: z.number().int().nonnegative(),
  snapshotSolBalance: z.string().optional(),
  snapshotTokenAccountCount: z.number().int().optional(),
  snapshotFetchedAt: z.number().int().optional(),
  markdown: z.string(),
  redactionsApplied: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

// ----------------------------------------------------------------------------
// Connection Types (Phase 13)
// ----------------------------------------------------------------------------

export const SolanaWalletConnectionKind = {
  ADDRESS_ONLY: 'address_only',
  EXTERNAL_WALLET_READ_ONLY: 'external_wallet_read_only',
  LOCAL_GENERATED_FUTURE: 'local_generated_future',
  PRIVATE_KEY_IMPORT_DISABLED: 'private_key_import_disabled',
  TURNKEY_FUTURE: 'turnkey_future',
} as const;
export type SolanaWalletConnectionKind =
  (typeof SolanaWalletConnectionKind)[keyof typeof SolanaWalletConnectionKind];

export const SolanaExternalWalletProvider = {
  SOLFLARE: 'solflare',
  PHANTOM: 'phantom',
  BACKPACK: 'backpack',
  WALLET_STANDARD: 'wallet_standard',
  UNKNOWN: 'unknown',
} as const;
export type SolanaExternalWalletProvider =
  (typeof SolanaExternalWalletProvider)[keyof typeof SolanaExternalWalletProvider];

export const SolanaWalletConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED_READ_ONLY: 'connected_read_only',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
} as const;
export type SolanaWalletConnectionStatus =
  (typeof SolanaWalletConnectionStatus)[keyof typeof SolanaWalletConnectionStatus];

export const SolanaWalletConnectionStatusSchema = z.enum([
  SolanaWalletConnectionStatus.DISCONNECTED,
  SolanaWalletConnectionStatus.CONNECTING,
  SolanaWalletConnectionStatus.CONNECTED_READ_ONLY,
  SolanaWalletConnectionStatus.ERROR,
  SolanaWalletConnectionStatus.UNSUPPORTED,
]);

export const SolanaExternalWalletProviderSchema = z.enum([
  SolanaExternalWalletProvider.SOLFLARE,
  SolanaExternalWalletProvider.PHANTOM,
  SolanaExternalWalletProvider.BACKPACK,
  SolanaExternalWalletProvider.WALLET_STANDARD,
  SolanaExternalWalletProvider.UNKNOWN,
]);

export const SolanaExternalWalletConnectionSchema = z.object({
  id: z.string().min(1),
  provider: SolanaExternalWalletProviderSchema,
  publicAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  status: SolanaWalletConnectionStatusSchema,
  connectedAt: z.number().int(),
  disconnectedAt: z.number().int().optional(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletConnectionCapabilitySchema = z.object({
  name: z.string().min(1),
  status: z.enum([
    'enabled_read_only',
    'disabled_signing',
    'disabled_execution',
    'planned',
  ]),
  safetyNote: z.string(),
});

export const SolanaWalletConnectionStateSchema = z.object({
  status: SolanaWalletConnectionStatusSchema,
  provider: SolanaExternalWalletProviderSchema.optional(),
  publicAddress: z.string().optional(),
  network: SolanaRpcNetworkSchema,
  lastConnection: SolanaExternalWalletConnectionSchema.optional(),
  capabilities: z.array(SolanaWalletConnectionCapabilitySchema),
  error: z.string().optional(),
  updatedAt: z.number().int(),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaWalletProfile = z.infer<typeof SolanaWalletProfileSchema>;
export type SolanaWalletReceiveRequest = z.infer<typeof SolanaWalletReceiveRequestSchema>;
export type SolanaWalletSendDraft = z.infer<typeof SolanaWalletSendDraftSchema>;
export type SolanaWalletTokenAccountPreview = z.infer<typeof SolanaWalletTokenAccountPreviewSchema>;
export type SolanaWalletReadOnlySnapshot = z.infer<typeof SolanaWalletReadOnlySnapshotSchema>;
export type SolanaWalletSnapshotStatus = z.infer<typeof SolanaWalletSnapshotStatusSchema>;
export type SolanaWalletSnapshotResult = z.infer<typeof SolanaWalletSnapshotResultSchema>;
export type SolanaWalletWorkspaceState = z.infer<typeof SolanaWalletWorkspaceStateSchema>;
export type SolanaWalletContextSummary = z.infer<typeof SolanaWalletContextSummarySchema>;
export type SolanaExternalWalletConnection = z.infer<typeof SolanaExternalWalletConnectionSchema>;
export type SolanaWalletConnectionCapability = z.infer<typeof SolanaWalletConnectionCapabilitySchema>;
export type SolanaWalletConnectionState = z.infer<typeof SolanaWalletConnectionStateSchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const SOLANA_WALLET_PHASE_10_SAFETY_NOTES: string[] = [
  'GORKH Wallet v0.1 is a wallet shell only.',
  'No private key, seed phrase, mnemonic, or wallet JSON is requested or stored.',
  'No signing, private transfer, swap, or trading execution is available.',
  'Private send/receive routes are planned integrations only.',
  'No Umbra, Cloak, Token-2022, or Light Protocol calls are made in this phase.',
];

export const SOLANA_WALLET_READ_ONLY_SAFETY_NOTES: string[] = [
  'Read-only public RPC lookup.',
  'No wallet connection or signing is used.',
  'GORKH cannot move funds from an address-only profile.',
  'RPC providers can observe lookup requests.',
];

export const SOLANA_WALLET_DENIED_CAPABILITIES: string[] = [
  'private_key_import',
  'seed_phrase',
  'mnemonic',
  'wallet_json',
  'keypair_generation',
  'signing',
  'transaction_execution',
  'swap_execution',
  'trade_execution',
  'stealth_address_generation',
  'note_generation',
  'commitment_generation',
  'nullifier_generation',
  'zk_proof_generation',
  'umbra_api_call',
  'cloak_api_call',
  'token_2022_transaction_construction',
  'drift',
];

export const SOLANA_WALLET_DISABLED_SIGNING_METHODS: string[] = [
  'signTransaction',
  'signAllTransactions',
  'signMessage',
  'sendTransaction',
];

export const SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES: string[] = [
  'External wallet connection is read-only in Phase 13.',
  'GORKH does not request signatures.',
  'GORKH does not construct or execute transactions.',
  'Only the public wallet address is used to create a local profile and read public chain data.',
];

// ----------------------------------------------------------------------------
// Handoff Types (Phase 14)
// ----------------------------------------------------------------------------
// Desktop -> Browser -> Desktop wallet connection handoff.
// Only public address is transferred. No signing, no private keys.
// ----------------------------------------------------------------------------

export const SolanaWalletHandoffPayloadVersion = {
  V1: 'gorkh-wallet-handoff-v1',
} as const;
export type SolanaWalletHandoffPayloadVersion =
  (typeof SolanaWalletHandoffPayloadVersion)[keyof typeof SolanaWalletHandoffPayloadVersion];

export const SolanaWalletHandoffPayloadVersionSchema = z.enum([
  SolanaWalletHandoffPayloadVersion.V1,
]);

export const SolanaWalletHandoffRequestSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  nonce: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  expiry: z.number().int(),
  createdAt: z.number().int(),
});

export const SolanaWalletHandoffResultSchema = z.object({
  requestId: z.string().min(1),
  nonce: z.string().min(1),
  publicAddress: z.string().min(1),
  provider: SolanaExternalWalletProviderSchema,
  network: SolanaRpcNetworkSchema,
  connectedAt: z.number().int(),
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletHandoffPayloadSchema = z.object({
  version: SolanaWalletHandoffPayloadVersionSchema,
  requestId: z.string().min(1),
  nonce: z.string().min(1),
  publicAddress: z.string().min(1),
  provider: SolanaExternalWalletProviderSchema,
  network: SolanaRpcNetworkSchema,
  connectedAt: z.number().int(),
  safetyNotes: z.array(z.string()),
});

export type SolanaWalletHandoffRequest = z.infer<typeof SolanaWalletHandoffRequestSchema>;
export type SolanaWalletHandoffResult = z.infer<typeof SolanaWalletHandoffResultSchema>;
export type SolanaWalletHandoffPayload = z.infer<typeof SolanaWalletHandoffPayloadSchema>;

export const SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES: string[] = [
  'Browser wallet handoff transfers only the public wallet address.',
  'No private key, seed phrase, or signing capability leaves the browser.',
  'GORKH Desktop receives only the public address to create a read-only profile.',
  'Always verify the pasted payload matches the browser wallet you connected.',
];

export const SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS: string[] = [
  'privateKey',
  'seedPhrase',
  'mnemonic',
  'secretKey',
  'keypair',
  'signature',
  'signedTransaction',
  'serializedTransaction',
  'adapter',
  'walletAdapter',
];

export const SOLANA_WALLET_CONNECTION_STRATEGY = {
  solflareFirst: true,
  walletStandardCompatibleLater: true,
  localGeneratedWalletFuture: true,
  privateKeyImportDisabled: true,
  turnkeyFuturePolicyWallet: true,
} as const;

export const SOLANA_WALLET_ROUTE_LABELS: Record<SolanaWalletRouteKind, string> = {
  [SolanaWalletRouteKind.UMBRA_PLANNED]: 'Umbra Planned',
  [SolanaWalletRouteKind.CLOAK_PLANNED]: 'Cloak Planned',
  [SolanaWalletRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED]:
    'Token-2022 Confidential Transfers Planned',
  [SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY]: 'Manual Privacy Review Only',
};

export const SOLANA_WALLET_ACTION_LABELS: Record<SolanaWalletActionKind, string> = {
  [SolanaWalletActionKind.RECEIVE_PRIVATE]: 'Receive Privately',
  [SolanaWalletActionKind.SEND_PRIVATE]: 'Send Privately',
  [SolanaWalletActionKind.VIEW_WALLET]: 'View Wallet',
  [SolanaWalletActionKind.OPEN_MARKETS]: 'Open Markets',
  [SolanaWalletActionKind.REVIEW_PRIVACY]: 'Review Privacy',
  [SolanaWalletActionKind.COPY_RECEIVE_REQUEST]: 'Copy Receive Request',
};

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaWalletProfileStatus(value: unknown): value is SolanaWalletProfileStatus {
  return (
    typeof value === 'string' &&
    Object.values(SolanaWalletProfileStatus).includes(value as SolanaWalletProfileStatus)
  );
}

export function isSolanaWalletRouteKind(value: unknown): value is SolanaWalletRouteKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaWalletRouteKind).includes(value as SolanaWalletRouteKind)
  );
}

export function isDeniedWalletCapability(capability: string): boolean {
  return SOLANA_WALLET_DENIED_CAPABILITIES.includes(capability);
}

export function getWalletRouteLabel(route: SolanaWalletRouteKind): string {
  return SOLANA_WALLET_ROUTE_LABELS[route] ?? route;
}

export function getWalletActionLabel(action: SolanaWalletActionKind): string {
  return SOLANA_WALLET_ACTION_LABELS[action] ?? action;
}

export function isForbiddenHandoffPayloadField(key: string): boolean {
  return SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes(key);
}

export function hasForbiddenHandoffPayloadFields(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some((key) => isForbiddenHandoffPayloadField(key));
}

// ----------------------------------------------------------------------------
// Ownership Proof Types (Phase 15)
// ----------------------------------------------------------------------------
// Optional browser wallet ownership proof via message signing.
// signMessage only. No transaction signing. No fund movement.
// ----------------------------------------------------------------------------

export const SolanaWalletOwnershipProofStatus = {
  NOT_REQUESTED: 'not_requested',
  REQUESTED: 'requested',
  SIGNED: 'signed',
  VERIFIED: 'verified',
  FAILED: 'failed',
  EXPIRED: 'expired',
  UNSUPPORTED: 'unsupported',
} as const;
export type SolanaWalletOwnershipProofStatus =
  (typeof SolanaWalletOwnershipProofStatus)[keyof typeof SolanaWalletOwnershipProofStatus];

export const SolanaWalletOwnershipProofStatusSchema = z.enum([
  SolanaWalletOwnershipProofStatus.NOT_REQUESTED,
  SolanaWalletOwnershipProofStatus.REQUESTED,
  SolanaWalletOwnershipProofStatus.SIGNED,
  SolanaWalletOwnershipProofStatus.VERIFIED,
  SolanaWalletOwnershipProofStatus.FAILED,
  SolanaWalletOwnershipProofStatus.EXPIRED,
  SolanaWalletOwnershipProofStatus.UNSUPPORTED,
]);

export const SolanaWalletOwnershipProofRequestSchema = z.object({
  id: z.string().min(1),
  handoffRequestId: z.string().min(1),
  publicAddress: z.string().min(1),
  provider: SolanaExternalWalletProviderSchema,
  network: SolanaRpcNetworkSchema,
  nonce: z.string().min(1),
  domain: z.string().min(1),
  statement: z.string().min(1),
  message: z.string().optional(),
  createdAt: z.number().int(),
  expiresAt: z.number().int(),
  status: SolanaWalletOwnershipProofStatusSchema,
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletOwnershipProofResultSchema = z.object({
  requestId: z.string().min(1),
  handoffRequestId: z.string().min(1),
  nonce: z.string().min(1),
  publicAddress: z.string().min(1),
  provider: SolanaExternalWalletProviderSchema,
  network: SolanaRpcNetworkSchema,
  message: z.string().min(1),
  signature: z.string().min(1),
  signatureEncoding: z.enum(['base58', 'base64', 'hex', 'unknown']),
  signedAt: z.number().int(),
  status: SolanaWalletOwnershipProofStatusSchema,
  verificationStatus: z.enum(['verified', 'failed', 'not_verified']),
  error: z.string().optional(),
  safetyNotes: z.array(z.string()),
});

export const SolanaWalletVerifiedOwnershipSchema = z.object({
  publicAddress: z.string().min(1),
  provider: SolanaExternalWalletProviderSchema,
  network: SolanaRpcNetworkSchema,
  message: z.string().min(1),
  signature: z.string().min(1),
  verifiedAt: z.number().int(),
  verifier: z.enum(['local_ed25519', 'browser_provider_claim', 'not_verified']),
  safetyNotes: z.array(z.string()),
});

export type SolanaWalletOwnershipProofRequest = z.infer<typeof SolanaWalletOwnershipProofRequestSchema>;
export type SolanaWalletOwnershipProofResult = z.infer<typeof SolanaWalletOwnershipProofResultSchema>;
export type SolanaWalletVerifiedOwnership = z.infer<typeof SolanaWalletVerifiedOwnershipSchema>;

export const SOLANA_WALLET_OWNERSHIP_PROOF_MESSAGE_TEMPLATE_VERSION = 'gorkh-wallet-ownership-proof-v1';

export const SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES: string[] = [
  'Ownership proof uses message signing only.',
  'Message signing cannot move funds.',
  'GORKH does not request transaction signatures.',
  'Ownership proof is optional and can be skipped.',
];

export const SOLANA_WALLET_OWNERSHIP_PROOF_FORBIDDEN_METHODS: string[] = [
  'signTransaction',
  'signAllTransactions',
  'sendTransaction',
  'sendRawTransaction',
];

export function buildOwnershipProofMessage(input: {
  publicAddress: string;
  provider: string;
  network: string;
  requestId: string;
  handoffRequestId?: string;
  nonce: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
  statement?: string;
}): string {
  const statement =
    input.statement ??
    'I am proving ownership of this public Solana address to GORKH. This message signing request cannot move funds or authorize transactions.';

  return [
    'GORKH Wallet Ownership Proof',
    `Version: ${SOLANA_WALLET_OWNERSHIP_PROOF_MESSAGE_TEMPLATE_VERSION}`,
    `Domain: ${input.domain}`,
    `Address: ${input.publicAddress}`,
    `Provider: ${input.provider}`,
    `Network: ${input.network}`,
    `Request ID: ${input.requestId}`,
    ...(input.handoffRequestId ? [`Handoff Request ID: ${input.handoffRequestId}`] : []),
    `Nonce: ${input.nonce}`,
    `Issued At: ${new Date(input.createdAt).toISOString()}`,
    `Expires At: ${new Date(input.expiresAt).toISOString()}`,
    '',
    'Statement:',
    statement,
  ].join('\n');
}

// ----------------------------------------------------------------------------
// Portfolio Types (Phase 16)
// ----------------------------------------------------------------------------
// Read-only portfolio view derived from existing public RPC snapshot data.
// No prices, no valuations, no execution, no automatic refresh.
// ----------------------------------------------------------------------------

export const SolanaWalletPortfolioTokenHoldingSourceSchema = z.enum([
  'token_accounts_preview',
  'manual',
  'unknown',
]);

export const SolanaWalletPortfolioTokenHoldingSchema = z.object({
  mint: z.string().min(1),
  tokenAccountPubkeys: z.array(z.string().min(1)),
  tokenAccountCount: z.number().int().nonnegative(),
  amountRaw: z.string().optional(),
  amountUi: z.string().optional(),
  decimals: z.number().int().optional(),
  uiAmountString: z.string().optional(),
  symbol: z.string().optional(),
  label: z.string().optional(),
  source: SolanaWalletPortfolioTokenHoldingSourceSchema,
  warnings: z.array(z.string()).default([]),
});

export const SolanaWalletPortfolioSummarySchema = z.object({
  walletProfileId: z.string().min(1),
  publicAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  solBalanceLamports: z.string().optional(),
  solBalanceUi: z.string().optional(),
  tokenHoldingCount: z.number().int().nonnegative(),
  tokenAccountCount: z.number().int().nonnegative(),
  holdings: z.array(SolanaWalletPortfolioTokenHoldingSchema),
  ownershipProofStatus: z.string().optional(),
  ownershipVerifiedAt: z.number().int().optional(),
  snapshotFetchedAt: z.number().int().optional(),
  generatedAt: z.number().int(),
  safetyNotes: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
});

export const SolanaWalletPortfolioContextSummarySchema = z.object({
  generatedAt: z.string(),
  walletProfileLabel: z.string().optional(),
  publicAddress: z.string().optional(),
  network: SolanaRpcNetworkSchema,
  tokenHoldingCount: z.number().int().nonnegative(),
  tokenAccountCount: z.number().int().nonnegative(),
  markdown: z.string(),
  redactionsApplied: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export type SolanaWalletPortfolioTokenHolding = z.infer<typeof SolanaWalletPortfolioTokenHoldingSchema>;
export type SolanaWalletPortfolioSummary = z.infer<typeof SolanaWalletPortfolioSummarySchema>;
export type SolanaWalletPortfolioContextSummary = z.infer<typeof SolanaWalletPortfolioContextSummarySchema>;

export const SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES: string[] = [
  'Portfolio data is read-only public RPC data.',
  'No prices or valuations are included in Phase 16.',
  'GORKH cannot sign, swap, trade, or move funds.',
  'Token holdings should be reviewed manually before any future action.',
];

// ----------------------------------------------------------------------------
// Wallet Hub + Portfolio Dashboard v0.1
// ----------------------------------------------------------------------------
// Safe multi-wallet metadata and read-only portfolio aggregation.
// No private keys, seed phrases, wallet JSON, signing, execution, Squads,
// hardware signing, staking, swaps, bridging, Jito, Drift, or DeFi execution.
// ----------------------------------------------------------------------------

export const WalletProfileKind = {
  LOCAL_VAULT: 'local_vault',
  BROWSER_HANDOFF: 'browser_handoff',
  WATCH_ONLY: 'watch_only',
  HARDWARE_WALLET_LOCKED: 'hardware_wallet_locked',
  MULTISIG_LOCKED: 'multisig_locked',
} as const;
export type WalletProfileKind = (typeof WalletProfileKind)[keyof typeof WalletProfileKind];

export const WalletProfileStatus = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  WATCH_ONLY: 'watch_only',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;
export type WalletProfileStatus = (typeof WalletProfileStatus)[keyof typeof WalletProfileStatus];

export const WalletHubFilter = {
  ALL_WALLETS: 'all_wallets',
  ACTIVE_WALLET: 'active_wallet',
  WATCH_ONLY: 'watch_only',
  LOCAL_VAULT: 'local_vault',
} as const;
export type WalletHubFilter = (typeof WalletHubFilter)[keyof typeof WalletHubFilter];

export const WalletProfileKindSchema = z.enum([
  WalletProfileKind.LOCAL_VAULT,
  WalletProfileKind.BROWSER_HANDOFF,
  WalletProfileKind.WATCH_ONLY,
  WalletProfileKind.HARDWARE_WALLET_LOCKED,
  WalletProfileKind.MULTISIG_LOCKED,
]);

export const WalletProfileStatusSchema = z.enum([
  WalletProfileStatus.ACTIVE,
  WalletProfileStatus.LOCKED,
  WalletProfileStatus.WATCH_ONLY,
  WalletProfileStatus.DISCONNECTED,
  WalletProfileStatus.ERROR,
]);

export const WalletHubFilterSchema = z.enum([
  WalletHubFilter.ALL_WALLETS,
  WalletHubFilter.ACTIVE_WALLET,
  WalletHubFilter.WATCH_ONLY,
  WalletHubFilter.LOCAL_VAULT,
]);

export const WalletLabelSchema = z.string().trim().min(1).max(48);
export const WalletTagSchema = z.string().trim().min(1).max(24);

export const WalletHubProfileSchema = z.object({
  id: z.string().min(1),
  kind: WalletProfileKindSchema,
  status: WalletProfileStatusSchema,
  label: WalletLabelSchema,
  publicAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  tags: z.array(WalletTagSchema).default([]),
  category: z.string().trim().max(32).optional(),
  sourceProfileId: z.string().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
  secretMaterial: z.never().optional(),
  safetyNotes: z.array(z.string()),
});

export const PortfolioPriceEstimateSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().optional(),
  priceUsd: z.string().optional(),
  source: z.enum(['known_stable', 'market_adapter', 'unavailable']),
  estimated: z.literal(true),
  fetchedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
});

export const PortfolioTokenBalanceSchema = z.object({
  walletProfileId: z.string().min(1),
  walletLabel: z.string().min(1),
  mint: z.string().min(1),
  symbol: z.string().optional(),
  tokenAccountCount: z.number().int().nonnegative(),
  amountRaw: z.string().optional(),
  amountUi: z.string().optional(),
  decimals: z.number().int().optional(),
  uiAmountString: z.string().optional(),
  priceEstimate: PortfolioPriceEstimateSchema.optional(),
  estimatedUsdValue: z.string().optional(),
  priceUnavailable: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
});

export const PortfolioWalletSummarySchema = z.object({
  walletProfileId: z.string().min(1),
  walletLabel: z.string().min(1),
  walletKind: WalletProfileKindSchema,
  walletStatus: WalletProfileStatusSchema,
  publicAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  solBalanceLamports: z.string().optional(),
  solBalanceUi: z.string().optional(),
  solEstimatedUsdValue: z.string().optional(),
  tokenBalances: z.array(PortfolioTokenBalanceSchema),
  totalEstimatedUsdValue: z.string().optional(),
  priceUnavailable: z.boolean().default(false),
  balanceStatus: z.enum(['idle', 'loading', 'loaded', 'error']),
  error: z.string().optional(),
  refreshedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
});

export const ConsolidatedPortfolioSummarySchema = z.object({
  id: z.string().min(1),
  filter: WalletHubFilterSchema,
  walletCount: z.number().int().nonnegative(),
  watchOnlyCount: z.number().int().nonnegative(),
  localVaultCount: z.number().int().nonnegative(),
  browserHandoffCount: z.number().int().nonnegative(),
  totalEstimatedUsdValue: z.string().optional(),
  priceUnavailable: z.boolean().default(false),
  wallets: z.array(PortfolioWalletSummarySchema),
  tokenBalances: z.array(PortfolioTokenBalanceSchema),
  generatedAt: z.number().int(),
  refreshedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});

export const PortfolioSnapshotSchema = z.object({
  id: z.string().min(1),
  summaryId: z.string().min(1),
  filter: WalletHubFilterSchema,
  walletIds: z.array(z.string().min(1)),
  publicAddresses: z.array(z.string().min(1)),
  tokenSummary: z.array(z.object({
    mint: z.string().min(1),
    symbol: z.string().optional(),
    amountUi: z.string().optional(),
    estimatedUsdValue: z.string().optional(),
  })),
  totalEstimatedUsdValue: z.string().optional(),
  priceUnavailable: z.boolean().default(false),
  capturedAt: z.number().int(),
  redactionsApplied: z.array(z.string()),
  localOnly: z.literal(true),
});

export const PortfolioContextSnapshotSchema = z.object({
  storageKey: z.literal('gorkh.solana.walletHub.lastContext.v1'),
  activeWalletLabel: z.string().optional(),
  activeWalletPublicAddress: z.string().optional(),
  walletCount: z.number().int().nonnegative(),
  watchOnlyCount: z.number().int().nonnegative(),
  localVaultCount: z.number().int().nonnegative(),
  totalEstimatedUsdValue: z.string().optional(),
  topTokens: z.array(z.string()).default([]),
  staleOrErrorState: z.string().optional(),
  generatedAt: z.number().int(),
  summary: z.string(),
  redactionsApplied: z.array(z.string()),
  localOnly: z.literal(true),
});

export type WalletHubProfile = z.infer<typeof WalletHubProfileSchema>;
export type WalletLabel = z.infer<typeof WalletLabelSchema>;
export type WalletTag = z.infer<typeof WalletTagSchema>;
export type PortfolioPriceEstimate = z.infer<typeof PortfolioPriceEstimateSchema>;
export type PortfolioTokenBalance = z.infer<typeof PortfolioTokenBalanceSchema>;
export type PortfolioWalletSummary = z.infer<typeof PortfolioWalletSummarySchema>;
export type ConsolidatedPortfolioSummary = z.infer<typeof ConsolidatedPortfolioSummarySchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
export type PortfolioContextSnapshot = z.infer<typeof PortfolioContextSnapshotSchema>;

export const WALLET_HUB_STORAGE_KEY = 'gorkh.solana.walletHub.profiles.v1';
export const WALLET_HUB_ACTIVE_PROFILE_STORAGE_KEY = 'gorkh.solana.walletHub.activeProfile.v1';
export const WALLET_HUB_PORTFOLIO_HISTORY_STORAGE_KEY = 'gorkh.solana.walletHub.portfolioHistory.v1';
export const WALLET_HUB_CONTEXT_STORAGE_KEY = 'gorkh.solana.walletHub.lastContext.v1';

export const WALLET_HUB_SAFETY_NOTES: string[] = [
  'Wallet Hub v0.1 stores metadata and read-only portfolio summaries only.',
  'Watch-only wallets never request signing.',
  'Local vault secrets remain Rust/keychain-side and are not exposed to the frontend.',
  'Portfolio USD values are estimates and may be unavailable.',
  'No trading, staking, swaps, bridging, Jito, Squads execution, hardware signing, or Drift integration is available.',
];

export const WALLET_HUB_LOCKED_ROADMAP = [
  {
    id: 'hardware_wallets_locked',
    title: 'Hardware Wallets: Ledger/Trezor',
    copy: 'Hardware wallets are planned for native desktop USB/HID support. Locked in v0.1. No hardware signing is available yet.',
  },
  {
    id: 'squads_multisig_locked',
    title: 'Multisig: Squads v4',
    copy: 'Squads multisig management is planned. Locked in v0.1. No proposal creation, signing, or execution is available yet.',
  },
  {
    id: 'nft_gallery_locked',
    title: 'NFT Gallery',
    copy: 'NFT gallery is planned as a read-only collector view. Locked in v0.1.',
  },
  {
    id: 'defi_positions_locked',
    title: 'DeFi Positions',
    copy: 'Read-only DeFi Command Center is available. Swap execution, lending actions, LP changes, staking, and auto-optimization remain locked in v0.1.',
  },
  {
    id: 'stake_accounts_locked',
    title: 'Stake Accounts',
    copy: 'Stake account monitoring is planned. Locked in v0.1. No staking actions are available.',
  },
  {
    id: 'pnl_tracking_locked',
    title: 'PnL Tracking',
    copy: 'PnL tracking requires cost-basis accounting and is locked in v0.1.',
  },
  {
    id: 'advanced_history_locked',
    title: 'Advanced Portfolio History',
    copy: 'Advanced portfolio history charts are planned. v0.1 stores compact safe snapshots only.',
  },
] as const;

// ----------------------------------------------------------------------------
// Local Wallet Vault + Cloak Foundation
// ----------------------------------------------------------------------------

export const WalletSourceSchema = z.enum(['generated', 'imported', 'browser_handoff', 'address_only']);
export type WalletSource = z.infer<typeof WalletSourceSchema>;

export const WalletSecurityStatusSchema = z.enum(['locked', 'unlocked', 'keychain_unavailable', 'error']);
export type WalletSecurityStatus = z.infer<typeof WalletSecurityStatusSchema>;

export const WalletTransactionKindSchema = z.enum([
  'cloak_deposit',
  'cloak_private_send',
  'cloak_withdraw',
  'market_trade',
  'manual_transfer',
]);
export type WalletTransactionKind = z.infer<typeof WalletTransactionKindSchema>;

export const WalletExecutionStatusSchema = z.enum([
  'draft',
  'requires_approval',
  'approved',
  'submitted',
  'confirmed',
  'failed',
  'blocked',
]);
export type WalletExecutionStatus = z.infer<typeof WalletExecutionStatusSchema>;

export const LocalWalletProfileSchema = z.object({
  walletId: z.string().min(1),
  label: z.string().min(1),
  publicAddress: z.string().min(1),
  source: WalletSourceSchema,
  securityStatus: WalletSecurityStatusSchema,
  keychainAccount: z.string().regex(/^wallet:v1:/),
  network: SolanaRpcNetworkSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
});
export type LocalWalletProfile = z.infer<typeof LocalWalletProfileSchema>;

export const WalletVaultOperationResultSchema = z.object({
  ok: z.boolean(),
  wallet: LocalWalletProfileSchema.optional(),
  error: z.string().optional(),
});
export type WalletVaultOperationResult = z.infer<typeof WalletVaultOperationResultSchema>;

export const WalletSigningRequestSchema = z.object({
  requestId: z.string().min(1),
  walletId: z.string().min(1),
  publicAddress: z.string().min(1),
  kind: WalletTransactionKindSchema,
  status: WalletExecutionStatusSchema,
  humanSummary: z.string().min(1),
  createdAt: z.number().int(),
  expiresAt: z.number().int().optional(),
  approvalRequired: z.literal(true),
  initiatedBy: z.enum(['wallet_user', 'agent_draft', 'assistant_draft', 'markets_future']),
});
export type WalletSigningRequest = z.infer<typeof WalletSigningRequestSchema>;

export const WalletSigningApprovalSchema = z.object({
  approvalId: z.string().min(1),
  requestId: z.string().min(1),
  approvedAt: z.number().int(),
  approvedBy: z.literal('local_user'),
  status: z.literal('approved'),
});
export type WalletSigningApproval = z.infer<typeof WalletSigningApprovalSchema>;

export const GORKH_LOCAL_WALLET_SAFETY_CONSTANTS = {
  privateKeyNeverLeavesDevice: true,
  keychainStorageOnly: true,
  noBackendSync: true,
  explicitApprovalRequiredForEverySignature: true,
  agentCannotSignAutomatically: true,
} as const;

export const CLOAK_MAINNET_PROGRAM_ID = 'zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW';
export const CLOAK_NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';
export const CLOAK_DEFAULT_RELAY_URL = 'https://api.cloak.ag';
export const CLOAK_MIN_SOL_DEPOSIT_LAMPORTS = '10000000';
export const CLOAK_FIXED_FEE_LAMPORTS = '5000000';
export const CLOAK_VARIABLE_FEE_NUMERATOR = '3';
export const CLOAK_VARIABLE_FEE_DENOMINATOR = '1000';

export const CloakExecutionStatusSchema = z.enum([
  'draft',
  'requires_approval',
  'approved',
  'submitting',
  'submitted',
  'confirmed',
  'failed',
  'blocked',
]);
export type CloakExecutionStatus = z.infer<typeof CloakExecutionStatusSchema>;

export const CloakApprovalDigestSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'Cloak approval digest must be a SHA-256 hex digest.');
export type CloakApprovalDigest = z.infer<typeof CloakApprovalDigestSchema>;

export const CloakDepositDraftSchema = z.object({
  id: z.string().min(1),
  walletId: z.string().min(1),
  publicAddress: z.string().min(1),
  network: z.literal('mainnet'),
  asset: z.literal('SOL'),
  mint: z.literal(CLOAK_NATIVE_SOL_MINT),
  amountLamports: z.string().regex(/^[0-9]+$/),
  estimatedFixedFeeLamports: z.string().regex(/^[0-9]+$/),
  estimatedVariableFeeLamports: z.string().regex(/^[0-9]+$/),
  estimatedTotalFeeLamports: z.string().regex(/^[0-9]+$/),
  estimatedPrivateAmountLamports: z.string().regex(/^[0-9]+$/),
  relayUrl: z.literal(CLOAK_DEFAULT_RELAY_URL),
  programId: z.literal(CLOAK_MAINNET_PROGRAM_ID),
  createdAt: z.number().int(),
  expiresAt: z.number().int(),
  status: CloakExecutionStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  warnings: z.array(z.string()),
  approvalDigest: CloakApprovalDigestSchema,
  approvalRequired: z.literal(true),
});
export type CloakDepositDraft = z.infer<typeof CloakDepositDraftSchema>;

export const CloakDepositResultSchema = z.object({
  draftId: z.string().min(1),
  status: CloakExecutionStatusSchema,
  signature: z.string().optional().nullable(),
  requestId: z.string().optional().nullable(),
  noteId: z.string().optional().nullable(),
  submittedAt: z.number().int().optional().nullable(),
  error: z.string().optional().nullable(),
});
export type CloakDepositResult = z.infer<typeof CloakDepositResultSchema>;

export const CloakNoteMetadataSchema = z.object({
  noteId: z.string().min(1),
  walletId: z.string().min(1),
  asset: z.enum(['SOL', 'USDC', 'USDT']),
  amountLamports: z.string().regex(/^[0-9]+$/),
  createdAt: z.number().int(),
  signature: z.string().optional().nullable(),
  leafIndex: z.number().int().optional().nullable(),
  status: CloakExecutionStatusSchema,
});
export type CloakNoteMetadata = z.infer<typeof CloakNoteMetadataSchema>;

export const CloakSigningSessionSchema = z.object({
  sessionId: z.string().min(1),
  draftId: z.string().min(1),
  walletId: z.string().min(1),
  operationKind: z.literal('cloak_deposit'),
  operationDigest: CloakApprovalDigestSchema,
  expiresAt: z.number().int(),
  allowedMessageKind: z.literal('cloak_viewing_key_registration'),
  allowedTransactionKind: z.literal('cloak_deposit'),
});
export type CloakSigningSession = z.infer<typeof CloakSigningSessionSchema>;

export const CloakDepositProgressSchema = z.object({
  stage: z.enum([
    'preparing',
    'awaiting_approval',
    'creating_utxo',
    'signing_viewing_key_registration',
    'generating_proof',
    'signing_transaction',
    'submitting',
    'confirmed',
    'failed',
  ]),
  label: z.string().min(1),
  proofPercent: z.number().min(0).max(100).optional(),
});
export type CloakDepositProgress = z.infer<typeof CloakDepositProgressSchema>;

export const CloakErrorSummarySchema = z.object({
  category: z.enum(['wallet', 'network', 'validation', 'service', 'transaction', 'unknown']),
  message: z.string().min(1),
  recoverable: z.boolean(),
  suggestion: z.string().optional(),
});
export type CloakErrorSummary = z.infer<typeof CloakErrorSummarySchema>;

export const GORKH_CLOAK_DEPOSIT_SAFETY_NOTES = [
  'Cloak deposit is mainnet-only in this phase.',
  'A local keychain wallet is required.',
  'Every deposit requires explicit local approval bound to the prepared draft digest.',
  'The official @cloak.dev/sdk TypeScript package is used through a Tauri signer bridge.',
  'Raw keypair bytes are never exported to the webview for Cloak execution.',
  'signMessage is allowed only for ownership proof and Cloak viewing-key registration.',
  'Raw note material and viewing keys are stored only in secure storage.',
  'Agent, Assistant, and Markets cannot execute Cloak deposits.',
] as const;
