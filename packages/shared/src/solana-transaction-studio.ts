import { z } from 'zod';

import { SolanaRpcNetworkSchema } from './solana-rpc.js';

// ============================================================================
// GORKH Transaction Studio — Shared Domain Types (v0.1)
// ============================================================================
// Decode + Simulate + Explain only. No signing. No broadcasting. No bundles.
// ============================================================================

export const TransactionStudioInputKind = {
  SIGNATURE: 'signature',
  SERIALIZED_TRANSACTION_BASE64: 'serialized_transaction_base64',
  SERIALIZED_TRANSACTION_BASE58: 'serialized_transaction_base58',
  ADDRESS: 'address',
  AGENT_DRAFT: 'agent_draft',
  CLOAK_DRAFT: 'cloak_draft',
  ZERION_PROPOSAL: 'zerion_proposal',
  UNKNOWN: 'unknown',
} as const;
export type TransactionStudioInputKind =
  (typeof TransactionStudioInputKind)[keyof typeof TransactionStudioInputKind];

export const TransactionStudioSource = {
  PASTED: 'pasted',
  SHIELD: 'shield',
  AGENT: 'agent',
  WALLET: 'wallet',
  CLOAK: 'cloak',
  ZERION: 'zerion',
  BUILDER: 'builder',
  HISTORY: 'history',
} as const;
export type TransactionStudioSource =
  (typeof TransactionStudioSource)[keyof typeof TransactionStudioSource];

export const TransactionStudioRiskLevel = {
  INFO: 'info',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type TransactionStudioRiskLevel =
  (typeof TransactionStudioRiskLevel)[keyof typeof TransactionStudioRiskLevel];

export const TransactionStudioSimulationStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable',
} as const;

export const TransactionStudioInputKindSchema = z.enum([
  TransactionStudioInputKind.SIGNATURE,
  TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64,
  TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE58,
  TransactionStudioInputKind.ADDRESS,
  TransactionStudioInputKind.AGENT_DRAFT,
  TransactionStudioInputKind.CLOAK_DRAFT,
  TransactionStudioInputKind.ZERION_PROPOSAL,
  TransactionStudioInputKind.UNKNOWN,
]);

export const TransactionStudioSourceSchema = z.enum([
  TransactionStudioSource.PASTED,
  TransactionStudioSource.SHIELD,
  TransactionStudioSource.AGENT,
  TransactionStudioSource.WALLET,
  TransactionStudioSource.CLOAK,
  TransactionStudioSource.ZERION,
  TransactionStudioSource.BUILDER,
  TransactionStudioSource.HISTORY,
]);

export const TransactionStudioRiskLevelSchema = z.enum([
  TransactionStudioRiskLevel.INFO,
  TransactionStudioRiskLevel.LOW,
  TransactionStudioRiskLevel.MEDIUM,
  TransactionStudioRiskLevel.HIGH,
  TransactionStudioRiskLevel.CRITICAL,
]);

export const TransactionStudioInputSchema = z.object({
  id: z.string().min(1),
  kind: TransactionStudioInputKindSchema,
  source: TransactionStudioSourceSchema,
  rawInput: z.string(),
  label: z.string().optional(),
  createdAt: z.number().int(),
  redactionsApplied: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});
export type TransactionStudioInput = z.infer<typeof TransactionStudioInputSchema>;

export const TransactionStudioInstructionSchema = z.object({
  index: z.number().int().nonnegative(),
  programId: z.string().min(1),
  programName: z.string().optional(),
  knownProgram: z.boolean(),
  accountIndexes: z.array(z.number().int().nonnegative()),
  accountAddresses: z.array(z.string()),
  dataLength: z.number().int().nonnegative(),
  decodedKind: z.string().optional(),
  summary: z.string(),
  warnings: z.array(z.string()).default([]),
});
export type TransactionStudioInstruction = z.infer<typeof TransactionStudioInstructionSchema>;

export const TransactionStudioAccountMetaSchema = z.object({
  index: z.number().int().nonnegative(),
  address: z.string().min(1),
  signer: z.boolean(),
  writable: z.boolean(),
  source: z.enum(['static', 'lookup_table', 'unresolved']),
  label: z.string().optional(),
  warnings: z.array(z.string()).default([]),
});
export type TransactionStudioAccountMeta = z.infer<typeof TransactionStudioAccountMetaSchema>;

export const TransactionStudioDecodedTransactionSchema = z.object({
  id: z.string().min(1),
  inputId: z.string().min(1),
  format: z.enum(['legacy', 'versioned_v0', 'unknown']),
  signatureCount: z.number().int().nonnegative(),
  requiredSignatureCount: z.number().int().nonnegative(),
  recentBlockhash: z.string().optional(),
  accountCount: z.number().int().nonnegative(),
  instructionCount: z.number().int().nonnegative(),
  programIds: z.array(z.string()),
  knownProgramCount: z.number().int().nonnegative(),
  unknownProgramCount: z.number().int().nonnegative(),
  signerCount: z.number().int().nonnegative(),
  writableAccountCount: z.number().int().nonnegative(),
  usesAddressLookupTables: z.boolean(),
  instructions: z.array(TransactionStudioInstructionSchema),
  accounts: z.array(TransactionStudioAccountMetaSchema),
  createdAt: z.number().int(),
  warnings: z.array(z.string()).default([]),
});
export type TransactionStudioDecodedTransaction = z.infer<
  typeof TransactionStudioDecodedTransactionSchema
>;

export const TransactionStudioBalanceChangeSchema = z.object({
  account: z.string().min(1),
  mint: z.string().optional(),
  owner: z.string().optional(),
  preAmount: z.string().optional(),
  postAmount: z.string().optional(),
  delta: z.string().optional(),
  decimals: z.number().int().nonnegative().optional(),
  uiAmountString: z.string().optional(),
  source: z.enum(['sol', 'spl_token', 'unknown']),
});
export type TransactionStudioBalanceChange = z.infer<
  typeof TransactionStudioBalanceChangeSchema
>;

export const TransactionStudioSimulationResultSchema = z.object({
  id: z.string().min(1),
  inputId: z.string().min(1),
  status: z.enum(['idle', 'running', 'success', 'failed', 'unavailable']),
  err: z.unknown().optional(),
  computeUnitsConsumed: z.number().optional(),
  logs: z.array(z.string()).default([]),
  replacementBlockhash: z.string().optional(),
  accountChanges: z.array(z.unknown()).default([]),
  balanceChanges: z.array(TransactionStudioBalanceChangeSchema).default([]),
  tokenBalanceChanges: z.array(TransactionStudioBalanceChangeSchema).default([]),
  warnings: z.array(z.string()).default([]),
  simulatedAt: z.number().int().optional(),
});
export type TransactionStudioSimulationResult = z.infer<
  typeof TransactionStudioSimulationResultSchema
>;

export const TransactionStudioRiskFindingSchema = z.object({
  id: z.string().min(1),
  level: TransactionStudioRiskLevelSchema,
  title: z.string().min(1),
  description: z.string(),
  recommendation: z.string(),
  relatedProgramId: z.string().optional(),
  relatedAccount: z.string().optional(),
  relatedInstructionIndex: z.number().int().nonnegative().optional(),
});
export type TransactionStudioRiskFinding = z.infer<typeof TransactionStudioRiskFindingSchema>;

export const TransactionStudioRiskReportSchema = z.object({
  id: z.string().min(1),
  inputId: z.string().min(1),
  highestLevel: TransactionStudioRiskLevelSchema,
  findings: z.array(TransactionStudioRiskFindingSchema),
  signerWarnings: z.array(z.string()).default([]),
  writableAccountWarnings: z.array(z.string()).default([]),
  unknownProgramWarnings: z.array(z.string()).default([]),
  simulationWarnings: z.array(z.string()).default([]),
  createdAt: z.number().int(),
});
export type TransactionStudioRiskReport = z.infer<typeof TransactionStudioRiskReportSchema>;

export const TransactionStudioExplanationSchema = z.object({
  id: z.string().min(1),
  inputId: z.string().min(1),
  summary: z.string(),
  plainEnglishSteps: z.array(z.string()),
  programsInvolved: z.array(z.string()),
  possibleUserImpact: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
});
export type TransactionStudioExplanation = z.infer<typeof TransactionStudioExplanationSchema>;

export const TransactionStudioHandoffSchema = z.object({
  id: z.string().min(1),
  source: TransactionStudioSourceSchema,
  targetModule: z.literal('transaction_studio'),
  inputKind: TransactionStudioInputKindSchema,
  label: z.string(),
  rawInput: z.string().optional(),
  decodedSummary: z.string().optional(),
  executionBlocked: z.literal(true),
  createdAt: z.number().int(),
  warnings: z.array(z.string()).default([]),
});
export type TransactionStudioHandoff = z.infer<typeof TransactionStudioHandoffSchema>;

export const TransactionStudioWorkspaceStateSchema = z.object({
  id: z.string().min(1),
  selectedNetwork: SolanaRpcNetworkSchema,
  selectedEndpoint: z.string().url().optional(),
  activeInput: TransactionStudioInputSchema.optional(),
  activeDecodedTransaction: TransactionStudioDecodedTransactionSchema.optional(),
  activeSimulation: TransactionStudioSimulationResultSchema.optional(),
  activeRiskReport: TransactionStudioRiskReportSchema.optional(),
  activeExplanation: TransactionStudioExplanationSchema.optional(),
  lastUpdatedAt: z.number().int(),
  localOnly: z.literal(true),
});
export type TransactionStudioWorkspaceState = z.infer<
  typeof TransactionStudioWorkspaceStateSchema
>;

export const TRANSACTION_STUDIO_PHASE_1_SAFETY_NOTES = [
  'Transaction Studio v0.1 is decode, simulation, explanation, and review only.',
  'No signing, wallet execution, transaction broadcast, raw broadcast, or Jito bundle submission is available.',
  'Simulation uses current RPC state and does not guarantee future execution.',
  'Agent, Cloak, Zerion, Wallet, Shield, and Builder handoffs are review-only.',
] as const;

export const TRANSACTION_STUDIO_BLOCKED_CAPABILITIES = [
  'signing',
  'transaction_broadcast',
  'raw_broadcast',
  'jito_bundle_submission',
  'mev_bundle_execution',
  'autonomous_execution',
  'private_key_access',
  'seed_phrase_access',
  'wallet_json_access',
] as const;

export const TRANSACTION_STUDIO_COMING_SOON_FEATURES = [
  'visual_transaction_builder',
  'batch_transaction_builder',
  'priority_fee_advisor',
  'replay_against_current_state',
  'jito_bundle_composer_locked',
  'raw_transaction_broadcast_locked',
] as const;

export const TRANSACTION_STUDIO_ALLOWED_RPC_METHODS = [
  'getAccountInfo',
  'getBalance',
  'getTransaction',
  'getLatestBlockhash',
  'getMultipleAccounts',
  'simulateTransaction',
  'getTokenAccountsByOwner',
] as const;
