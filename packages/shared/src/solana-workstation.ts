import { z } from 'zod';

// ============================================================================
// Solana Workstation — Shared Domain Types (Phase 1 Foundation)
// ============================================================================
// This module defines the type system for GORKH Workstation's Solana-native
// surfaces. No blockchain execution, signing, or private key handling lives
// here. These are pure domain definitions for UI, policy, and future wiring.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaWorkstationMode = {
  AGENT: 'agent',
  BUILDER: 'builder',
  PRIVATE: 'private',
  MARKETS: 'markets',
} as const;
export type SolanaWorkstationMode =
  (typeof SolanaWorkstationMode)[keyof typeof SolanaWorkstationMode];

export const SolanaNetwork = {
  LOCALNET: 'localnet',
  DEVNET: 'devnet',
  MAINNET_BETA: 'mainnet-beta',
} as const;
export type SolanaNetwork = (typeof SolanaNetwork)[keyof typeof SolanaNetwork];

export const WorkstationRiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type WorkstationRiskLevel =
  (typeof WorkstationRiskLevel)[keyof typeof WorkstationRiskLevel];

export const WorkstationActionStatus = {
  DRAFT: 'draft',
  REQUIRES_APPROVAL: 'requires_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;
export type WorkstationActionStatus =
  (typeof WorkstationActionStatus)[keyof typeof WorkstationActionStatus];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaWorkstationModeSchema = z.enum([
  SolanaWorkstationMode.AGENT,
  SolanaWorkstationMode.BUILDER,
  SolanaWorkstationMode.PRIVATE,
  SolanaWorkstationMode.MARKETS,
]);

export const SolanaNetworkSchema = z.enum([
  SolanaNetwork.LOCALNET,
  SolanaNetwork.DEVNET,
  SolanaNetwork.MAINNET_BETA,
]);

export const WorkstationRiskLevelSchema = z.enum([
  WorkstationRiskLevel.LOW,
  WorkstationRiskLevel.MEDIUM,
  WorkstationRiskLevel.HIGH,
  WorkstationRiskLevel.CRITICAL,
]);

export const WorkstationActionStatusSchema = z.enum([
  WorkstationActionStatus.DRAFT,
  WorkstationActionStatus.REQUIRES_APPROVAL,
  WorkstationActionStatus.APPROVED,
  WorkstationActionStatus.REJECTED,
  WorkstationActionStatus.EXECUTED,
  WorkstationActionStatus.FAILED,
]);

export const WorkstationCapabilitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  available: z.boolean(),
  requiresApproval: z.boolean().default(false),
});

export const WorkstationModeDefinitionSchema = z.object({
  id: SolanaWorkstationModeSchema,
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  description: z.string(),
  primaryUseCases: z.array(z.string().min(1)),
  capabilities: z.array(WorkstationCapabilitySchema),
  maturity: z.literal('foundation'),
  safetyNote: z.string(),
});

export const WorkstationActionDraftSchema = z.object({
  id: z.string().min(1),
  mode: SolanaWorkstationModeSchema,
  title: z.string().min(1),
  description: z.string(),
  status: WorkstationActionStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  network: SolanaNetworkSchema.optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  // No programId, accounts, or instructions yet — Phase 1 is UI foundation only
});

export const WorkstationPolicySummarySchema = z.object({
  policyId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  allowedModes: z.array(SolanaWorkstationModeSchema),
  maxRiskLevel: WorkstationRiskLevelSchema,
  requireExplicitApproval: z.boolean(),
  createdAt: z.number().int(),
});

export const WorkstationAgentProfileSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  mode: z.literal(SolanaWorkstationMode.AGENT),
  policy: WorkstationPolicySummarySchema,
});

export const WorkstationWalletProfileSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  mode: z.literal(SolanaWorkstationMode.PRIVATE),
  policy: WorkstationPolicySummarySchema,
});

export const WorkstationFeatureFlagsSchema = z.object({
  workstationEnabled: z.boolean().default(true),
  agentModeEnabled: z.boolean().default(false),
  builderModeEnabled: z.boolean().default(false),
  privateModeEnabled: z.boolean().default(false),
  marketsModeEnabled: z.boolean().default(false),
  shieldDecodeEnabled: z.boolean().default(false),
  shieldSimulateEnabled: z.boolean().default(false),
  shieldExplainEnabled: z.boolean().default(false),
  shieldApproveEnabled: z.boolean().default(false),
  shieldAttestEnabled: z.boolean().default(false),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type WorkstationCapability = z.infer<typeof WorkstationCapabilitySchema>;
export type WorkstationModeDefinition = z.infer<typeof WorkstationModeDefinitionSchema>;
export type WorkstationActionDraft = z.infer<typeof WorkstationActionDraftSchema>;
export type WorkstationPolicySummary = z.infer<typeof WorkstationPolicySummarySchema>;
export type WorkstationAgentProfile = z.infer<typeof WorkstationAgentProfileSchema>;
export type WorkstationWalletProfile = z.infer<typeof WorkstationWalletProfileSchema>;
export type WorkstationFeatureFlags = z.infer<typeof WorkstationFeatureFlagsSchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const SOLANA_WORKSTATION_MODES: WorkstationModeDefinition[] = [
  {
    id: SolanaWorkstationMode.AGENT,
    title: 'GORKH Agent',
    shortTitle: 'Agent',
    description:
      'Mainnet-safe Solana Agent Control Center with policy-bound AI agents and human approval.',
    primaryUseCases: [
      'Draft Solana transactions with natural language',
      'Review and approve agent-proposed actions',
      'Future: Local agent accountability preview for verified agent behavior',
    ],
    capabilities: [
      {
        id: 'agent.chat',
        title: 'Natural-language tasking',
        description: 'Describe what you want on Solana in plain English.',
        available: false,
        requiresApproval: false,
      },
      {
        id: 'agent.draft',
        title: 'Transaction drafting',
        description: 'Generate transaction drafts for review before execution.',
        available: false,
        requiresApproval: true,
      },
      {
        id: 'agent.policy',
        title: 'Policy enforcement',
        description: 'Enforce spending limits, allowed programs, and risk thresholds.',
        available: false,
        requiresApproval: false,
      },
    ],
    maturity: 'foundation',
    safetyNote:
      'Agent mode does not execute transactions automatically. All proposed actions require explicit human approval in Phase 1.',
  },
  {
    id: SolanaWorkstationMode.BUILDER,
    title: 'GORKH Builder',
    shortTitle: 'Builder',
    description:
      'Anchor, Rust, IDL, local validator, and transaction debugging workspace.',
    primaryUseCases: [
      'Edit Anchor programs with AI assistance',
      'Build and test against local validator',
      'Debug transactions with simulation previews',
    ],
    capabilities: [
      {
        id: 'builder.ide',
        title: 'IDE workspace',
        description: 'File explorer, editor, and build runner for Solana programs.',
        available: false,
        requiresApproval: false,
      },
      {
        id: 'builder.validator',
        title: 'Local validator',
        description: 'Start, stop, and reset a local Solana validator.',
        available: false,
        requiresApproval: false,
      },
      {
        id: 'builder.idl',
        title: 'IDL management',
        description: 'Generate, view, and export Anchor IDLs.',
        available: false,
        requiresApproval: false,
      },
    ],
    maturity: 'foundation',
    safetyNote:
      'Builder mode operates on local files and localnet only in Phase 1. No mainnet deployment or signing.',
  },
  {
    id: SolanaWorkstationMode.PRIVATE,
    title: 'GORKH Private / Confidential',
    shortTitle: 'Private',
    description:
      'Privacy workflow planner for Umbra, Cloak, Token-2022 Confidential Transfers, and future confidential Solana payments.',
    primaryUseCases: [
      'Plan privacy workflows with confidentiality previews',
      'Review compliance-friendly transaction flows',
      'Future: Local proof generation and confidential transfer planning',
    ],
    capabilities: [
      {
        id: 'private.wallet',
        title: 'Privacy wallet view',
        description: 'Review wallet status and privacy policy settings.',
        available: false,
        requiresApproval: false,
      },
      {
        id: 'private.shield',
        title: 'Shielded payment drafts',
        description: 'Draft shielded payments for review before any on-chain action.',
        available: false,
        requiresApproval: true,
      },
      {
        id: 'private.proof',
        title: 'Proof generation',
        description: 'Generate zero-knowledge proofs locally for eligible transactions.',
        available: false,
        requiresApproval: true,
      },
    ],
    maturity: 'foundation',
    safetyNote:
      'Planner only. No wallet connection, proof generation, private transfer, or transaction execution. All workflows are draft-only.',
  },
  {
    id: SolanaWorkstationMode.MARKETS,
    title: 'GORKH Markets',
    shortTitle: 'Markets',
    description:
      'Solana market intelligence, wallet tracking, watchlists, and manually approved trade drafting.',
    primaryUseCases: [
      'Track wallets and tokens with watchlists',
      'Draft trades with simulation previews',
      'Review market intelligence before action',
    ],
    capabilities: [
      {
        id: 'markets.watchlist',
        title: 'Watchlists',
        description: 'Track wallets, tokens, and programs of interest.',
        available: false,
        requiresApproval: false,
      },
      {
        id: 'markets.draft',
        title: 'Trade drafting',
        description: 'Draft swaps and orders for manual review and approval.',
        available: false,
        requiresApproval: true,
      },
      {
        id: 'markets.intel',
        title: 'On-chain intelligence',
        description: 'View decoded transaction patterns and program activity.',
        available: false,
        requiresApproval: false,
      },
    ],
    maturity: 'foundation',
    safetyNote:
      'Markets mode does not execute trades or connect to live trading APIs in Phase 1. All actions are drafts.',
  },
];

export const DEFAULT_SOLANA_WORKSTATION_FEATURE_FLAGS: WorkstationFeatureFlags = {
  workstationEnabled: true,
  agentModeEnabled: false,
  builderModeEnabled: false,
  privateModeEnabled: false,
  marketsModeEnabled: false,
  shieldDecodeEnabled: false,
  shieldSimulateEnabled: false,
  shieldExplainEnabled: false,
  shieldApproveEnabled: false,
  shieldAttestEnabled: false,
};

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaWorkstationMode(value: unknown): value is SolanaWorkstationMode {
  return (
    typeof value === 'string' &&
    Object.values(SolanaWorkstationMode).includes(value as SolanaWorkstationMode)
  );
}

export function isSolanaNetwork(value: unknown): value is SolanaNetwork {
  return (
    typeof value === 'string' && Object.values(SolanaNetwork).includes(value as SolanaNetwork)
  );
}
