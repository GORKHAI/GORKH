import { z } from 'zod';
import { SolanaTrustedProtocolIdSchema } from './solana-shield.js';
import { WorkstationRiskLevelSchema, SolanaNetworkSchema } from './solana-workstation.js';

// ============================================================================
// GORKH Agent — Shared Domain Types (Phase 6 / 9A)
// ============================================================================
// Local, safe, Mainnet-safe Solana Agent Control Center foundation.
// No wallet connection. No signing. No execution. No on-chain writes.
// All agent profiles, policies, drafts, and attestations are local preview only.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaAgentModeStatus = {
  LOCAL_PREVIEW: 'local_preview',
  POLICY_CONFIGURED: 'policy_configured',
  DRAFT_READY: 'draft_ready',
  AWAITING_FUTURE_EXECUTION: 'awaiting_future_execution',
  DISABLED: 'disabled',
} as const;
export type SolanaAgentModeStatus =
  (typeof SolanaAgentModeStatus)[keyof typeof SolanaAgentModeStatus];

export const SolanaAgentProfileStatus = {
  DRAFT: 'draft',
  ACTIVE_LOCAL: 'active_local',
  DISABLED: 'disabled',
  ARCHIVED: 'archived',
} as const;
export type SolanaAgentProfileStatus =
  (typeof SolanaAgentProfileStatus)[keyof typeof SolanaAgentProfileStatus];

export const SolanaAgentRiskTolerance = {
  CONSERVATIVE: 'conservative',
  BALANCED: 'balanced',
  AGGRESSIVE: 'aggressive',
} as const;
export type SolanaAgentRiskTolerance =
  (typeof SolanaAgentRiskTolerance)[keyof typeof SolanaAgentRiskTolerance];

export const SolanaAgentApprovalMode = {
  MANUAL_EVERY_ACTION: 'manual_every_action',
  MANUAL_HIGH_RISK: 'manual_high_risk',
  FUTURE_POLICY_BASED: 'future_policy_based',
} as const;
export type SolanaAgentApprovalMode =
  (typeof SolanaAgentApprovalMode)[keyof typeof SolanaAgentApprovalMode];

export const SolanaAgentActionKind = {
  ANALYZE_TRANSACTION: 'analyze_transaction',
  REVIEW_BUILDER_WORKSPACE: 'review_builder_workspace',
  PREPARE_PROTOCOL_ACTION: 'prepare_protocol_action',
  PREPARE_PRIVATE_PAYMENT: 'prepare_private_payment',
  PREPARE_MARKET_WATCH: 'prepare_market_watch',
  CUSTOM_REQUEST: 'custom_request',
} as const;
export type SolanaAgentActionKind =
  (typeof SolanaAgentActionKind)[keyof typeof SolanaAgentActionKind];

export const SolanaAgentActionStatus = {
  DRAFT: 'draft',
  PREVIEW_GENERATED: 'preview_generated',
  REQUIRES_MANUAL_REVIEW: 'requires_manual_review',
  REJECTED_LOCAL: 'rejected_local',
  ARCHIVED: 'archived',
} as const;
export type SolanaAgentActionStatus =
  (typeof SolanaAgentActionStatus)[keyof typeof SolanaAgentActionStatus];

export const SolanaAgentProtocolPermissionLevel = {
  READ_ONLY: 'read_only',
  DRAFT_ONLY: 'draft_only',
  FUTURE_EXECUTE_BLOCKED: 'future_execute_blocked',
} as const;
export type SolanaAgentProtocolPermissionLevel =
  (typeof SolanaAgentProtocolPermissionLevel)[keyof typeof SolanaAgentProtocolPermissionLevel];

export const SolanaAgentAttestationPreviewStatus = {
  PREVIEW_ONLY: 'preview_only',
  NOT_WRITTEN: 'not_written',
  INVALID_MISSING_FIELDS: 'invalid_missing_fields',
} as const;
export type SolanaAgentAttestationPreviewStatus =
  (typeof SolanaAgentAttestationPreviewStatus)[keyof typeof SolanaAgentAttestationPreviewStatus];

export const SolanaAgentAuditEventKind = {
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  POLICY_UPDATED: 'policy_updated',
  ACTION_DRAFTED: 'action_drafted',
  ATTESTATION_PREVIEW_GENERATED: 'attestation_preview_generated',
  ACTION_REJECTED_LOCAL: 'action_rejected_local',
} as const;
export type SolanaAgentAuditEventKind =
  (typeof SolanaAgentAuditEventKind)[keyof typeof SolanaAgentAuditEventKind];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaAgentModeStatusSchema = z.enum([
  SolanaAgentModeStatus.LOCAL_PREVIEW,
  SolanaAgentModeStatus.POLICY_CONFIGURED,
  SolanaAgentModeStatus.DRAFT_READY,
  SolanaAgentModeStatus.AWAITING_FUTURE_EXECUTION,
  SolanaAgentModeStatus.DISABLED,
]);

export const SolanaAgentProfileStatusSchema = z.enum([
  SolanaAgentProfileStatus.DRAFT,
  SolanaAgentProfileStatus.ACTIVE_LOCAL,
  SolanaAgentProfileStatus.DISABLED,
  SolanaAgentProfileStatus.ARCHIVED,
]);

export const SolanaAgentRiskToleranceSchema = z.enum([
  SolanaAgentRiskTolerance.CONSERVATIVE,
  SolanaAgentRiskTolerance.BALANCED,
  SolanaAgentRiskTolerance.AGGRESSIVE,
]);

export const SolanaAgentApprovalModeSchema = z.enum([
  SolanaAgentApprovalMode.MANUAL_EVERY_ACTION,
  SolanaAgentApprovalMode.MANUAL_HIGH_RISK,
  SolanaAgentApprovalMode.FUTURE_POLICY_BASED,
]);

export const SolanaAgentActionKindSchema = z.enum([
  SolanaAgentActionKind.ANALYZE_TRANSACTION,
  SolanaAgentActionKind.REVIEW_BUILDER_WORKSPACE,
  SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION,
  SolanaAgentActionKind.PREPARE_PRIVATE_PAYMENT,
  SolanaAgentActionKind.PREPARE_MARKET_WATCH,
  SolanaAgentActionKind.CUSTOM_REQUEST,
]);

export const SolanaAgentActionStatusSchema = z.enum([
  SolanaAgentActionStatus.DRAFT,
  SolanaAgentActionStatus.PREVIEW_GENERATED,
  SolanaAgentActionStatus.REQUIRES_MANUAL_REVIEW,
  SolanaAgentActionStatus.REJECTED_LOCAL,
  SolanaAgentActionStatus.ARCHIVED,
]);

export const SolanaAgentProtocolPermissionLevelSchema = z.enum([
  SolanaAgentProtocolPermissionLevel.READ_ONLY,
  SolanaAgentProtocolPermissionLevel.DRAFT_ONLY,
  SolanaAgentProtocolPermissionLevel.FUTURE_EXECUTE_BLOCKED,
]);

export const SolanaAgentProtocolPermissionSchema = z.object({
  protocolId: SolanaTrustedProtocolIdSchema,
  enabled: z.boolean(),
  permissionLevel: SolanaAgentProtocolPermissionLevelSchema,
  allowedActionKinds: z.array(SolanaAgentActionKindSchema),
  safetyNote: z.string(),
});

export const SolanaAgentSpendLimitSchema = z.object({
  enabled: z.boolean(),
  tokenSymbol: z.string().optional(),
  mintAddress: z.string().optional(),
  maxUiAmount: z.string().optional(),
  period: z.enum(['per_action', 'per_day', 'per_week', 'manual_only']),
  note: z.string(),
});

export const SolanaAgentPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  riskTolerance: SolanaAgentRiskToleranceSchema,
  approvalMode: SolanaAgentApprovalModeSchema,
  allowedNetworks: z.array(SolanaNetworkSchema),
  protocolPermissions: z.array(SolanaAgentProtocolPermissionSchema),
  spendLimits: z.array(SolanaAgentSpendLimitSchema),
  maxInstructionsPerDraft: z.number().int().nonnegative().optional(),
  requireShieldSimulationPreview: z.boolean(),
  requireHumanApproval: z.boolean(),
  allowMainnet: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  safetyNotes: z.array(z.string()),
});

export const SolanaAgentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(64),
  description: z.string().max(280),
  status: SolanaAgentProfileStatusSchema,
  humanControllerAddress: z.string().optional(),
  humanControllerLabel: z.string().optional(),
  policy: SolanaAgentPolicySchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaAgentActionDraftSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  kind: SolanaAgentActionKindSchema,
  title: z.string().min(1),
  userIntent: z.string().min(1),
  network: SolanaNetworkSchema,
  relatedInput: z.string().optional(),
  relatedShieldAnalysisId: z.string().optional(),
  relatedBuilderContext: z.string().optional(),
  protocolIds: z.array(SolanaTrustedProtocolIdSchema),
  status: SolanaAgentActionStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  proposedSteps: z.array(z.string()),
  blockedReasons: z.array(z.string()),
  requiredApprovals: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  safetyNotes: z.array(z.string()),
});

export const SolanaAgentAttestationPreviewStatusSchema = z.enum([
  SolanaAgentAttestationPreviewStatus.PREVIEW_ONLY,
  SolanaAgentAttestationPreviewStatus.NOT_WRITTEN,
  SolanaAgentAttestationPreviewStatus.INVALID_MISSING_FIELDS,
]);

export const SolanaAgentAttestationPreviewSchema = z.object({
  id: z.string().min(1),
  status: SolanaAgentAttestationPreviewStatusSchema,
  network: SolanaNetworkSchema,
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  humanControllerAddress: z.string().optional(),
  policyId: z.string().min(1),
  actionDraftId: z.string().min(1),
  actionKind: SolanaAgentActionKindSchema,
  actionHash: z.string().min(1),
  policyHash: z.string().min(1),
  previewPayload: z.record(z.string(), z.unknown()),
  generatedAt: z.number().int(),
  warnings: z.array(z.string()),
  safetyNote: z.literal(
    'Preview only. Not written on-chain. No production attestation was created.'
  ),
});

export const SolanaAgentAuditEventKindSchema = z.enum([
  SolanaAgentAuditEventKind.AGENT_CREATED,
  SolanaAgentAuditEventKind.AGENT_UPDATED,
  SolanaAgentAuditEventKind.POLICY_UPDATED,
  SolanaAgentAuditEventKind.ACTION_DRAFTED,
  SolanaAgentAuditEventKind.ATTESTATION_PREVIEW_GENERATED,
  SolanaAgentAuditEventKind.ACTION_REJECTED_LOCAL,
]);

export const SolanaAgentAuditEventSchema = z.object({
  id: z.string().min(1),
  kind: SolanaAgentAuditEventKindSchema,
  agentId: z.string().min(1),
  actionDraftId: z.string().optional(),
  attestationPreviewId: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
});

export const SolanaAgentWorkspaceStateSchema = z.object({
  agents: z.array(SolanaAgentProfileSchema),
  selectedAgentId: z.string().optional(),
  drafts: z.array(SolanaAgentActionDraftSchema),
  attestationPreviews: z.array(SolanaAgentAttestationPreviewSchema),
  auditEvents: z.array(SolanaAgentAuditEventSchema),
  updatedAt: z.number().int(),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaAgentProtocolPermission = z.infer<typeof SolanaAgentProtocolPermissionSchema>;
export type SolanaAgentSpendLimit = z.infer<typeof SolanaAgentSpendLimitSchema>;
export type SolanaAgentPolicy = z.infer<typeof SolanaAgentPolicySchema>;
export type SolanaAgentProfile = z.infer<typeof SolanaAgentProfileSchema>;
export type SolanaAgentActionDraft = z.infer<typeof SolanaAgentActionDraftSchema>;
export type SolanaAgentAttestationPreview = z.infer<typeof SolanaAgentAttestationPreviewSchema>;
export type SolanaAgentAuditEvent = z.infer<typeof SolanaAgentAuditEventSchema>;
export type SolanaAgentWorkspaceState = z.infer<typeof SolanaAgentWorkspaceStateSchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS: SolanaAgentProtocolPermission[] = [
  {
    protocolId: 'sns',
    enabled: true,
    permissionLevel: SolanaAgentProtocolPermissionLevel.READ_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.ANALYZE_TRANSACTION, SolanaAgentActionKind.CUSTOM_REQUEST],
    safetyNote:
      'SNS is enabled for identity/read-only resolution. No external SNS API calls in Agent v0.1.',
  },
  {
    protocolId: 'squads',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.DRAFT_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION],
    safetyNote:
      'Squads is draft-only for future proposal approvals. No multisig API calls in Agent v0.1.',
  },
  {
    protocolId: 'turnkey',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.FUTURE_EXECUTE_BLOCKED,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION],
    safetyNote:
      'Turnkey is disabled for future policy wallet infrastructure. No signing or custody in Agent v0.1.',
  },
  {
    protocolId: 'blowfish',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.READ_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.ANALYZE_TRANSACTION],
    safetyNote:
      'Blowfish is a future transaction security check. No external Blowfish API calls in Agent v0.1.',
  },
  {
    protocolId: 'zerion_cli',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.FUTURE_EXECUTE_BLOCKED,
    allowedActionKinds: [SolanaAgentActionKind.CUSTOM_REQUEST],
    safetyNote:
      'Zerion CLI is research-only. No autonomous execution in GORKH yet.',
  },
  {
    protocolId: 'ika',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.FUTURE_EXECUTE_BLOCKED,
    allowedActionKinds: [SolanaAgentActionKind.CUSTOM_REQUEST],
    safetyNote:
      'Ika is research-only for future policy/MPC workflows. No execution in Agent v0.1.',
  },
  {
    protocolId: 'pyth',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.READ_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_MARKET_WATCH],
    safetyNote:
      'Pyth is a read-only roadmap integration. No external oracle calls in Agent v0.1.',
  },
  {
    protocolId: 'jupiter',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.DRAFT_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION],
    safetyNote:
      'Jupiter is a draft-only roadmap integration. No swap API calls or trade execution in Agent v0.1.',
  },
  {
    protocolId: 'kamino',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.DRAFT_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION],
    safetyNote:
      'Kamino is a draft-only roadmap integration. No lending API calls in Agent v0.1.',
  },
  {
    protocolId: 'meteora',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.READ_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_MARKET_WATCH],
    safetyNote:
      'Meteora is a read-only roadmap integration. No external liquidity API calls in Agent v0.1.',
  },
  {
    protocolId: 'orca',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.READ_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_MARKET_WATCH],
    safetyNote:
      'Orca is a read-only roadmap integration. No external liquidity API calls in Agent v0.1.',
  },
  {
    protocolId: 'jito',
    enabled: false,
    permissionLevel: SolanaAgentProtocolPermissionLevel.READ_ONLY,
    allowedActionKinds: [SolanaAgentActionKind.PREPARE_MARKET_WATCH],
    safetyNote:
      'Jito is a read-only roadmap integration. No external staking API calls in Agent v0.1.',
  },
];

export const DEFAULT_SOLANA_AGENT_POLICY: SolanaAgentPolicy = {
  id: 'default-policy-conservative',
  name: 'Conservative Default',
  riskTolerance: SolanaAgentRiskTolerance.CONSERVATIVE,
  approvalMode: SolanaAgentApprovalMode.MANUAL_EVERY_ACTION,
  allowedNetworks: ['devnet'],
  protocolPermissions: DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS,
  spendLimits: [
    {
      enabled: true,
      tokenSymbol: 'SOL',
      period: 'manual_only',
      note: 'Spend limits are metadata-only in Agent v0.1. No real spending controls are enforced yet.',
    },
  ],
  maxInstructionsPerDraft: 5,
  requireShieldSimulationPreview: true,
  requireHumanApproval: true,
  allowMainnet: false,
  createdAt: 0,
  updatedAt: 0,
  safetyNotes: [
    'This is a conservative default policy for Agent v0.1.',
    'Only devnet is allowed. Mainnet is disabled by default.',
    'Every action requires manual human approval.',
    'Shield simulation preview is required before any future execution.',
  ],
};

export const SOLANA_AGENT_DISABLED_APPROVAL_MODES: SolanaAgentApprovalMode[] = [
  SolanaAgentApprovalMode.MANUAL_HIGH_RISK,
  SolanaAgentApprovalMode.FUTURE_POLICY_BASED,
];

export const SOLANA_AGENT_PHASE_6_SAFETY_NOTES: string[] = [
  'Agent profiles are local metadata only.',
  'No wallet connection is available in Agent v0.1.',
  'No signing or transaction execution is available in Agent v0.1.',
  'Attestation previews are local-only and are not written on-chain.',
];

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaAgentProfileStatus(value: unknown): value is SolanaAgentProfileStatus {
  return (
    typeof value === 'string' &&
    Object.values(SolanaAgentProfileStatus).includes(value as SolanaAgentProfileStatus)
  );
}

export function isSolanaAgentActionKind(value: unknown): value is SolanaAgentActionKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaAgentActionKind).includes(value as SolanaAgentActionKind)
  );
}

export function isSolanaAgentApprovalMode(value: unknown): value is SolanaAgentApprovalMode {
  return (
    typeof value === 'string' &&
    Object.values(SolanaAgentApprovalMode).includes(value as SolanaAgentApprovalMode)
  );
}

export function isDisabledApprovalMode(mode: SolanaAgentApprovalMode): boolean {
  return SOLANA_AGENT_DISABLED_APPROVAL_MODES.includes(mode);
}

export function getAgentActionKindLabel(kind: SolanaAgentActionKind): string {
  const labels: Record<SolanaAgentActionKind, string> = {
    analyze_transaction: 'Analyze Transaction',
    review_builder_workspace: 'Review Builder Workspace',
    prepare_protocol_action: 'Prepare Protocol Action',
    prepare_private_payment: 'Prepare Private Payment',
    prepare_market_watch: 'Prepare Market Watch',
    custom_request: 'Custom Request',
  };
  return labels[kind] ?? kind;
}

export function getAgentApprovalModeLabel(mode: SolanaAgentApprovalMode): string {
  const labels: Record<SolanaAgentApprovalMode, string> = {
    manual_every_action: 'Manual — Every Action',
    manual_high_risk: 'Manual — High Risk Only (Future)',
    future_policy_based: 'Policy-Based Auto (Future)',
  };
  return labels[mode] ?? mode;
}

export function getAgentRiskToleranceLabel(tolerance: SolanaAgentRiskTolerance): string {
  const labels: Record<SolanaAgentRiskTolerance, string> = {
    conservative: 'Conservative',
    balanced: 'Balanced',
    aggressive: 'Aggressive',
  };
  return labels[tolerance] ?? tolerance;
}
