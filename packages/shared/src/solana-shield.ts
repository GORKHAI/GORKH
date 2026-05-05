import { z } from 'zod';

import {
  SolanaProtocolRegistryId,
  GORKH_SOLANA_PROTOCOL_REGISTRY,
  type SolanaProtocolRegistryDefinition,
} from './solana-protocol-registry.js';

// ============================================================================
// GORKH Shield — Shared Domain Types (Phase 2)
// ============================================================================
// Offline Solana transaction decode + risk explanation foundation.
// No RPC calls. No signing. No execution. No private keys.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaShieldInputKind = {
  ADDRESS: 'address',
  SIGNATURE: 'signature',
  SERIALIZED_TRANSACTION_BASE64: 'serialized_transaction_base64',
  UNKNOWN: 'unknown',
} as const;
export type SolanaShieldInputKind =
  (typeof SolanaShieldInputKind)[keyof typeof SolanaShieldInputKind];

export const SolanaTransactionFormat = {
  LEGACY: 'legacy',
  VERSIONED: 'versioned',
  UNKNOWN: 'unknown',
} as const;
export type SolanaTransactionFormat =
  (typeof SolanaTransactionFormat)[keyof typeof SolanaTransactionFormat];

export const SolanaKnownProgramCategory = {
  CORE: 'core',
  TOKEN: 'token',
  COMPUTE: 'compute',
  MEMO: 'memo',
  SYSTEM: 'system',
  ASSOCIATED_TOKEN: 'associated_token',
  STAKE: 'stake',
  ADDRESS_LOOKUP_TABLE: 'address_lookup_table',
  TRUSTED_PROTOCOL: 'trusted_protocol',
  USER_PROTOCOL: 'user_protocol',
  UNKNOWN: 'unknown',
} as const;
export type SolanaKnownProgramCategory =
  (typeof SolanaKnownProgramCategory)[keyof typeof SolanaKnownProgramCategory];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaShieldInputKindSchema = z.enum([
  SolanaShieldInputKind.ADDRESS,
  SolanaShieldInputKind.SIGNATURE,
  SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64,
  SolanaShieldInputKind.UNKNOWN,
]);

export const SolanaTransactionFormatSchema = z.enum([
  SolanaTransactionFormat.LEGACY,
  SolanaTransactionFormat.VERSIONED,
  SolanaTransactionFormat.UNKNOWN,
]);

export const SolanaKnownProgramCategorySchema = z.enum([
  SolanaKnownProgramCategory.CORE,
  SolanaKnownProgramCategory.TOKEN,
  SolanaKnownProgramCategory.COMPUTE,
  SolanaKnownProgramCategory.MEMO,
  SolanaKnownProgramCategory.SYSTEM,
  SolanaKnownProgramCategory.ASSOCIATED_TOKEN,
  SolanaKnownProgramCategory.STAKE,
  SolanaKnownProgramCategory.ADDRESS_LOOKUP_TABLE,
  SolanaKnownProgramCategory.TRUSTED_PROTOCOL,
  SolanaKnownProgramCategory.USER_PROTOCOL,
  SolanaKnownProgramCategory.UNKNOWN,
]);

export const SolanaKnownProgramDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  programId: z.string().min(1),
  category: SolanaKnownProgramCategorySchema,
  safetyLabel: z.enum(['known_core', 'known_protocol', 'unknown']),
  description: z.string(),
});

export const SolanaTrustedProtocolIdSchema = z.enum([
  SolanaProtocolRegistryId.SOLFLARE,
  SolanaProtocolRegistryId.KAMINO,
  SolanaProtocolRegistryId.DFLOW,
  SolanaProtocolRegistryId.QUICKNODE,
  SolanaProtocolRegistryId.BIRDEYE,
  SolanaProtocolRegistryId.UMBRA,
  SolanaProtocolRegistryId.CLOAK,
  SolanaProtocolRegistryId.SNS,
  SolanaProtocolRegistryId.ZERION_CLI,
  SolanaProtocolRegistryId.IKA,
  SolanaProtocolRegistryId.TOKEN_2022_CONFIDENTIAL_TRANSFERS,
  SolanaProtocolRegistryId.LIGHT_PROTOCOL,
  SolanaProtocolRegistryId.SQUADS,
  SolanaProtocolRegistryId.TURNKEY,
  SolanaProtocolRegistryId.BLOWFISH,
  SolanaProtocolRegistryId.PYTH,
  SolanaProtocolRegistryId.JUPITER,
  SolanaProtocolRegistryId.METEORA,
  SolanaProtocolRegistryId.ORCA,
  SolanaProtocolRegistryId.JITO,
  SolanaProtocolRegistryId.SOLANA_ACTIONS_BLINKS,
]);

export const SolanaTrustedProtocolDefinitionSchema = z.object({
  id: SolanaTrustedProtocolIdSchema,
  name: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  supportedModes: z.array(z.string()),
  safetyNote: z.string(),
});

export const SolanaDecodedAccountMetaSchema = z.object({
  index: z.number().int().nonnegative(),
  address: z.string().min(1),
  isSigner: z.boolean(),
  isWritable: z.boolean(),
  source: z.enum(['static', 'lookup_table', 'unknown']),
});

export const SolanaDecodedInstructionSchema = z.object({
  index: z.number().int().nonnegative(),
  programId: z.string().min(1),
  programName: z.string(),
  programCategory: SolanaKnownProgramCategorySchema,
  accountIndexes: z.array(z.number().int().nonnegative()),
  accounts: z.array(SolanaDecodedAccountMetaSchema).optional(),
  dataBase64: z.string(),
  dataLength: z.number().int().nonnegative(),
  isKnownProgram: z.boolean(),
});

export const SolanaDecodedTransactionSchema = z.object({
  inputKind: SolanaShieldInputKindSchema,
  format: SolanaTransactionFormatSchema,
  signatureCount: z.number().int().nonnegative(),
  requiredSignatureCount: z.number().int().nonnegative(),
  signatures: z.array(z.string()),
  recentBlockhash: z.string().optional(),
  accountKeys: z.array(z.string()),
  instructions: z.array(SolanaDecodedInstructionSchema),
  addressTableLookups: z.array(
    z.object({
      accountKey: z.string().min(1),
      writableIndexes: z.array(z.number().int().nonnegative()),
      readonlyIndexes: z.array(z.number().int().nonnegative()),
    })
  ),
  warnings: z.array(z.string()),
});

export const SolanaShieldRiskFindingSchema = z.object({
  id: z.string().min(1),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1),
  description: z.string(),
  affectedInstructionIndexes: z.array(z.number().int().nonnegative()).optional(),
  affectedAccounts: z.array(z.string()).optional(),
  recommendation: z.string(),
});

export const SolanaShieldAnalysisSchema = z.object({
  input: z.string(),
  inputKind: SolanaShieldInputKindSchema,
  decodedTransaction: SolanaDecodedTransactionSchema.optional(),
  riskFindings: z.array(SolanaShieldRiskFindingSchema),
  summary: z.string(),
  safetyStatus: z.enum(['decode_only', 'cannot_decode', 'ready_for_future_simulation']),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaKnownProgramDefinition = z.infer<typeof SolanaKnownProgramDefinitionSchema>;
export type SolanaTrustedProtocolId = z.infer<typeof SolanaTrustedProtocolIdSchema>;
export type SolanaTrustedProtocolDefinition = z.infer<typeof SolanaTrustedProtocolDefinitionSchema>;
export type SolanaDecodedAccountMeta = z.infer<typeof SolanaDecodedAccountMetaSchema>;
export type SolanaDecodedInstruction = z.infer<typeof SolanaDecodedInstructionSchema>;
export type SolanaDecodedTransaction = z.infer<typeof SolanaDecodedTransactionSchema>;
export type SolanaShieldRiskFinding = z.infer<typeof SolanaShieldRiskFindingSchema>;
export type SolanaShieldAnalysis = z.infer<typeof SolanaShieldAnalysisSchema>;

// ----------------------------------------------------------------------------
// Constants — Core Programs
// ----------------------------------------------------------------------------

export const SOLANA_CORE_PROGRAMS: SolanaKnownProgramDefinition[] = [
  {
    id: 'system',
    name: 'System Program',
    programId: '11111111111111111111111111111111',
    category: SolanaKnownProgramCategory.SYSTEM,
    safetyLabel: 'known_core',
    description: 'Create accounts, transfer lamports, and assign program ownership.',
  },
  {
    id: 'token',
    name: 'SPL Token Program',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    category: SolanaKnownProgramCategory.TOKEN,
    safetyLabel: 'known_core',
    description: 'Transfer, mint, freeze, and manage SPL tokens.',
  },
  {
    id: 'token_2022',
    name: 'Token-2022 Program',
    programId: 'TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q',
    category: SolanaKnownProgramCategory.TOKEN,
    safetyLabel: 'known_core',
    description: 'Extended SPL token program with transfer hooks, metadata, and confidential transfers.',
  },
  {
    id: 'associated_token',
    name: 'Associated Token Program',
    programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    category: SolanaKnownProgramCategory.ASSOCIATED_TOKEN,
    safetyLabel: 'known_core',
    description: 'Create and manage associated token accounts deterministically.',
  },
  {
    id: 'compute_budget',
    name: 'Compute Budget Program',
    programId: 'ComputeBudget111111111111111111111111111111',
    category: SolanaKnownProgramCategory.COMPUTE,
    safetyLabel: 'known_core',
    description: 'Request additional compute units or set priority fees.',
  },
  {
    id: 'memo',
    name: 'Memo Program',
    programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    category: SolanaKnownProgramCategory.MEMO,
    safetyLabel: 'known_core',
    description: 'Attach arbitrary UTF-8 memos to transactions.',
  },
  {
    id: 'memo_v1',
    name: 'Memo Program v1',
    programId: 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
    category: SolanaKnownProgramCategory.MEMO,
    safetyLabel: 'known_core',
    description: 'Legacy memo program (deprecated).',
  },
  {
    id: 'address_lookup_table',
    name: 'Address Lookup Table Program',
    programId: 'AddressLookupTab1e1111111111111111111111111',
    category: SolanaKnownProgramCategory.ADDRESS_LOOKUP_TABLE,
    safetyLabel: 'known_core',
    description: 'Create and manage on-chain address lookup tables for versioned transactions.',
  },
  {
    id: 'stake',
    name: 'Stake Program',
    programId: 'Stake11111111111111111111111111111111111111',
    category: SolanaKnownProgramCategory.STAKE,
    safetyLabel: 'known_core',
    description: 'Create, delegate, withdraw, and manage stake accounts.',
  },
];

// ----------------------------------------------------------------------------
// Constants — Trusted Protocols (derived from canonical registry)
// ----------------------------------------------------------------------------
// Drift, HumanRail, and White Protocol are intentionally excluded.
// ----------------------------------------------------------------------------

function mapRegistryToTrusted(def: SolanaProtocolRegistryDefinition): SolanaTrustedProtocolDefinition {
  return {
    id: def.id as z.infer<typeof SolanaTrustedProtocolIdSchema>,
    name: def.name,
    category: def.category,
    status: def.status,
    supportedModes: def.supportedModes,
    safetyNote: def.safetyNote,
  };
}

export const TRUSTED_SOLANA_PROTOCOLS: SolanaTrustedProtocolDefinition[] =
  GORKH_SOLANA_PROTOCOL_REGISTRY.map(mapRegistryToTrusted);

// ----------------------------------------------------------------------------
// Lookup Helpers
// ----------------------------------------------------------------------------

export function getKnownProgram(programId: string): SolanaKnownProgramDefinition | undefined {
  return SOLANA_CORE_PROGRAMS.find((p) => p.programId === programId);
}

export function classifyProgram(programId: string): SolanaKnownProgramCategory {
  return getKnownProgram(programId)?.category ?? SolanaKnownProgramCategory.UNKNOWN;
}

export function getProgramDisplayName(programId: string): string {
  return getKnownProgram(programId)?.name ?? 'Unknown Program';
}

export function isTrustedProtocol(id: string): boolean {
  return TRUSTED_SOLANA_PROTOCOLS.some((p) => p.id === id);
}

export function getTrustedProtocol(
  id: string
): SolanaTrustedProtocolDefinition | undefined {
  return TRUSTED_SOLANA_PROTOCOLS.find((p) => p.id === id);
}

export function isProtocolMainnetFacing(id: string): boolean {
  const def = GORKH_SOLANA_PROTOCOL_REGISTRY.find((p) => p.id === id);
  return def?.mainnetFacing ?? false;
}
