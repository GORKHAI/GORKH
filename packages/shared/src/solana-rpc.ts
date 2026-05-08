import { z } from 'zod';

// ============================================================================
// GORKH Shield RPC — Shared Domain Types (Phase 3)
// ============================================================================
// Read-only Solana RPC layer for account lookup, signature lookup,
// transaction simulation preview, and address lookup table resolution.
// No signing, no sending, no execution.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaRpcNetwork = {
  DEVNET: 'devnet',
  MAINNET_BETA: 'mainnet-beta',
  LOCALNET: 'localnet',
} as const;
export type SolanaRpcNetwork = (typeof SolanaRpcNetwork)[keyof typeof SolanaRpcNetwork];

export const SolanaRpcCommitment = {
  PROCESSED: 'processed',
  CONFIRMED: 'confirmed',
  FINALIZED: 'finalized',
} as const;
export type SolanaRpcCommitment = (typeof SolanaRpcCommitment)[keyof typeof SolanaRpcCommitment];

export const SolanaRpcRequestStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
export type SolanaRpcRequestStatus =
  (typeof SolanaRpcRequestStatus)[keyof typeof SolanaRpcRequestStatus];

// ----------------------------------------------------------------------------
// Method Allowlists
// ----------------------------------------------------------------------------

export const ALLOWED_SOLANA_RPC_METHODS = [
  'getAccountInfo',
  'getBalance',
  'getTransaction',
  'getLatestBlockhash',
  'getTokenAccountsByOwner',
  'getMultipleAccounts',
  'simulateTransaction',
  'getTokenSupply',
  'getTokenLargestAccounts',
  'getHealth',
  'getVersion',
  'getSlot',
  'getBlockHeight',
  'getEpochInfo',
  'getLeaderSchedule',
  'getProgramAccounts',
  'getParsedAccountInfo',
  'getParsedTokenAccountsByOwner',
  'getSignatureStatuses',
] as const;

export const DENIED_SOLANA_RPC_METHODS = [
  'sendTransaction',
  'sendRawTransaction',
  'requestAirdrop',
] as const;

export type SolanaRpcMethod = (typeof ALLOWED_SOLANA_RPC_METHODS)[number];
export type SolanaRpcDeniedMethod = (typeof DENIED_SOLANA_RPC_METHODS)[number];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaRpcNetworkSchema = z.enum([
  SolanaRpcNetwork.DEVNET,
  SolanaRpcNetwork.MAINNET_BETA,
  SolanaRpcNetwork.LOCALNET,
]);

export const SolanaRpcCommitmentSchema = z.enum([
  SolanaRpcCommitment.PROCESSED,
  SolanaRpcCommitment.CONFIRMED,
  SolanaRpcCommitment.FINALIZED,
]);

export const SolanaRpcEndpointConfigSchema = z.object({
  network: SolanaRpcNetworkSchema,
  url: z.string().url(),
  label: z.string().min(1),
  isCustom: z.boolean().default(false),
});

export const SolanaRpcMethodSchema = z.enum([
  'getAccountInfo',
  'getBalance',
  'getTransaction',
  'getLatestBlockhash',
  'getTokenAccountsByOwner',
  'getMultipleAccounts',
  'simulateTransaction',
  'getTokenSupply',
  'getTokenLargestAccounts',
  'getHealth',
  'getVersion',
  'getSlot',
  'getBlockHeight',
  'getEpochInfo',
  'getLeaderSchedule',
  'getProgramAccounts',
  'getParsedAccountInfo',
  'getParsedTokenAccountsByOwner',
  'getSignatureStatuses',
]);

export const SolanaAccountLookupResultSchema = z.object({
  address: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  exists: z.boolean(),
  lamports: z.number().optional(),
  owner: z.string().optional(),
  executable: z.boolean().optional(),
  rentEpoch: z.number().optional(),
  dataLength: z.number().optional(),
  parsedType: z.string().optional(),
  tokenMint: z.string().optional(),
  tokenOwner: z.string().optional(),
  tokenAmountUi: z.string().optional(),
  raw: z.unknown().optional(),
  fetchedAt: z.number().int(),
});

export const SolanaSignatureLookupResultSchema = z.object({
  signature: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  found: z.boolean(),
  slot: z.number().optional(),
  blockTime: z.number().optional(),
  confirmationStatus: z.string().optional(),
  err: z.unknown().optional(),
  fee: z.number().optional(),
  computeUnitsConsumed: z.number().optional(),
  accountKeys: z.array(z.string()).optional(),
  instructions: z.array(z.unknown()).optional(),
  logs: z.array(z.string()).optional(),
  raw: z.unknown().optional(),
  fetchedAt: z.number().int(),
});

export const SolanaSimulationPreviewSchema = z.object({
  network: SolanaRpcNetworkSchema,
  success: z.boolean(),
  err: z.unknown().optional(),
  logs: z.array(z.string()),
  unitsConsumed: z.number().optional(),
  accounts: z.array(z.unknown()).optional(),
  replacementBlockhash: z.string().optional(),
  raw: z.unknown().optional(),
  simulatedAt: z.number().int(),
  warning: z.string(),
});

export const SolanaAddressLookupTableResolutionSchema = z.object({
  lookupTableAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  found: z.boolean(),
  writableIndexes: z.array(z.number().int().nonnegative()),
  readonlyIndexes: z.array(z.number().int().nonnegative()),
  resolvedWritableAddresses: z.array(z.string()),
  resolvedReadonlyAddresses: z.array(z.string()),
  error: z.string().optional(),
  fetchedAt: z.number().int(),
});

export const SolanaShieldRpcAnalysisSchema = z.object({
  input: z.string(),
  inputKind: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  accountLookup: SolanaAccountLookupResultSchema.optional(),
  signatureLookup: SolanaSignatureLookupResultSchema.optional(),
  simulationPreview: SolanaSimulationPreviewSchema.optional(),
  lookupTableResolutions: z.array(SolanaAddressLookupTableResolutionSchema).optional(),
  riskFindings: z.array(z.unknown()),
  summary: z.string(),
  safetyStatus: z.enum(['rpc_read_only', 'simulation_preview', 'lookup_failed', 'unsupported']),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaRpcEndpointConfig = z.infer<typeof SolanaRpcEndpointConfigSchema>;
export type SolanaAccountLookupResult = z.infer<typeof SolanaAccountLookupResultSchema>;
export type SolanaSignatureLookupResult = z.infer<typeof SolanaSignatureLookupResultSchema>;
export type SolanaSimulationPreview = z.infer<typeof SolanaSimulationPreviewSchema>;
export type SolanaAddressLookupTableResolution = z.infer<
  typeof SolanaAddressLookupTableResolutionSchema
>;
export type SolanaShieldRpcAnalysis = z.infer<typeof SolanaShieldRpcAnalysisSchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const DEFAULT_SOLANA_RPC_ENDPOINTS: Record<SolanaRpcNetwork, SolanaRpcEndpointConfig> = {
  [SolanaRpcNetwork.DEVNET]: {
    network: SolanaRpcNetwork.DEVNET,
    url: 'https://api.devnet.solana.com',
    label: 'Solana Devnet',
    isCustom: false,
  },
  [SolanaRpcNetwork.MAINNET_BETA]: {
    network: SolanaRpcNetwork.MAINNET_BETA,
    url: 'https://api.mainnet-beta.solana.com',
    label: 'Solana Mainnet',
    isCustom: false,
  },
  [SolanaRpcNetwork.LOCALNET]: {
    network: SolanaRpcNetwork.LOCALNET,
    url: 'http://127.0.0.1:8899',
    label: 'Local Validator',
    isCustom: false,
  },
};

// ----------------------------------------------------------------------------
// Guards
// ----------------------------------------------------------------------------

export function isAllowedSolanaRpcMethod(method: string): method is SolanaRpcMethod {
  return ALLOWED_SOLANA_RPC_METHODS.includes(method as SolanaRpcMethod);
}

export function isDeniedSolanaRpcMethod(method: string): method is SolanaRpcDeniedMethod {
  return DENIED_SOLANA_RPC_METHODS.includes(method as SolanaRpcDeniedMethod);
}

export function assertAllowedSolanaRpcMethod(method: string): asserts method is SolanaRpcMethod {
  if (isDeniedSolanaRpcMethod(method)) {
    throw new Error(`RPC method "${method}" is denied for safety.`);
  }
  if (!isAllowedSolanaRpcMethod(method)) {
    throw new Error(`RPC method "${method}" is not in the allowed list.`);
  }
}
