import { z } from 'zod';
import { SolanaRpcNetworkSchema } from './solana-rpc.js';
import { WorkstationRiskLevelSchema } from './solana-workstation.js';

// ============================================================================
// GORKH Private / Confidential — Shared Domain Types (Phase 9B)
// ============================================================================
// Planner-only privacy workflow foundation. No wallet. No keys. No proofs.
// No commitments. No nullifiers. No stealth addresses. No execution.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaPrivateWorkflowKind = {
  CONFIDENTIAL_TOKEN_TRANSFER_PLAN: 'confidential_token_transfer_plan',
  PRIVATE_PAYMENT_PLAN: 'private_payment_plan',
  PRIVATE_RECEIVE_REQUEST: 'private_receive_request',
  PRIVATE_PAYROLL_BATCH: 'private_payroll_batch',
  PRIVATE_INVOICE_PAYMENT: 'private_invoice_payment',
  PRIVACY_REVIEW: 'privacy_review',
  CUSTOM: 'custom',
} as const;
export type SolanaPrivateWorkflowKind =
  (typeof SolanaPrivateWorkflowKind)[keyof typeof SolanaPrivateWorkflowKind];

export const SolanaPrivateRouteKind = {
  UMBRA_PLANNED: 'umbra_planned',
  CLOAK_PLANNED: 'cloak_planned',
  TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED: 'token_2022_confidential_transfer_planned',
  LIGHT_PROTOCOL_RESEARCH: 'light_protocol_research',
  MANUAL_PRIVACY_REVIEW_ONLY: 'manual_privacy_review_only',
} as const;
export type SolanaPrivateRouteKind =
  (typeof SolanaPrivateRouteKind)[keyof typeof SolanaPrivateRouteKind];

export const SolanaPrivateWorkflowStatus = {
  DRAFT: 'draft',
  PLAN_READY: 'plan_ready',
  REQUIRES_MANUAL_REVIEW: 'requires_manual_review',
  REJECTED_LOCAL: 'rejected_local',
  ARCHIVED_LOCAL: 'archived_local',
} as const;
export type SolanaPrivateWorkflowStatus =
  (typeof SolanaPrivateWorkflowStatus)[keyof typeof SolanaPrivateWorkflowStatus];

export const SolanaPrivateAssetKind = {
  SOL: 'SOL',
  USDC: 'USDC',
  SPL_TOKEN: 'SPL_TOKEN',
  TOKEN_2022: 'TOKEN_2022',
  UNKNOWN: 'UNKNOWN',
} as const;
export type SolanaPrivateAssetKind =
  (typeof SolanaPrivateAssetKind)[keyof typeof SolanaPrivateAssetKind];

export const SolanaPrivatePrivacyRiskKind = {
  SOURCE_WALLET_LINKAGE: 'source_wallet_linkage',
  RECIPIENT_REUSE: 'recipient_reuse',
  AMOUNT_FINGERPRINTING: 'amount_fingerprinting',
  TIMING_CORRELATION: 'timing_correlation',
  PUBLIC_MEMO_LEAKAGE: 'public_memo_leakage',
  PUBLIC_ADDRESS_VISIBILITY: 'public_address_visibility',
  AMOUNT_ONLY_CONFIDENTIALITY_LIMITATION: 'amount_only_confidentiality_limitation',
  SMALL_ANONYMITY_SET: 'small_anonymity_set',
  MAINNET_OPERATIONAL_CAUTION: 'mainnet_operational_caution',
  CUSTOM_RPC_PRIVACY_WARNING: 'custom_rpc_privacy_warning',
  PLANNER_ONLY: 'planner_only',
  UNKNOWN: 'unknown',
} as const;
export type SolanaPrivatePrivacyRiskKind =
  (typeof SolanaPrivatePrivacyRiskKind)[keyof typeof SolanaPrivatePrivacyRiskKind];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaPrivateWorkflowKindSchema = z.enum([
  SolanaPrivateWorkflowKind.CONFIDENTIAL_TOKEN_TRANSFER_PLAN,
  SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN,
  SolanaPrivateWorkflowKind.PRIVATE_RECEIVE_REQUEST,
  SolanaPrivateWorkflowKind.PRIVATE_PAYROLL_BATCH,
  SolanaPrivateWorkflowKind.PRIVATE_INVOICE_PAYMENT,
  SolanaPrivateWorkflowKind.PRIVACY_REVIEW,
  SolanaPrivateWorkflowKind.CUSTOM,
]);

export const SolanaPrivateRouteKindSchema = z.enum([
  SolanaPrivateRouteKind.UMBRA_PLANNED,
  SolanaPrivateRouteKind.CLOAK_PLANNED,
  SolanaPrivateRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED,
  SolanaPrivateRouteKind.LIGHT_PROTOCOL_RESEARCH,
  SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
]);

export const SolanaPrivateWorkflowStatusSchema = z.enum([
  SolanaPrivateWorkflowStatus.DRAFT,
  SolanaPrivateWorkflowStatus.PLAN_READY,
  SolanaPrivateWorkflowStatus.REQUIRES_MANUAL_REVIEW,
  SolanaPrivateWorkflowStatus.REJECTED_LOCAL,
  SolanaPrivateWorkflowStatus.ARCHIVED_LOCAL,
]);

export const SolanaPrivateAssetKindSchema = z.enum([
  SolanaPrivateAssetKind.SOL,
  SolanaPrivateAssetKind.USDC,
  SolanaPrivateAssetKind.SPL_TOKEN,
  SolanaPrivateAssetKind.TOKEN_2022,
  SolanaPrivateAssetKind.UNKNOWN,
]);

export const SolanaPrivatePrivacyRiskKindSchema = z.enum([
  SolanaPrivatePrivacyRiskKind.SOURCE_WALLET_LINKAGE,
  SolanaPrivatePrivacyRiskKind.RECIPIENT_REUSE,
  SolanaPrivatePrivacyRiskKind.AMOUNT_FINGERPRINTING,
  SolanaPrivatePrivacyRiskKind.TIMING_CORRELATION,
  SolanaPrivatePrivacyRiskKind.PUBLIC_MEMO_LEAKAGE,
  SolanaPrivatePrivacyRiskKind.PUBLIC_ADDRESS_VISIBILITY,
  SolanaPrivatePrivacyRiskKind.AMOUNT_ONLY_CONFIDENTIALITY_LIMITATION,
  SolanaPrivatePrivacyRiskKind.SMALL_ANONYMITY_SET,
  SolanaPrivatePrivacyRiskKind.MAINNET_OPERATIONAL_CAUTION,
  SolanaPrivatePrivacyRiskKind.CUSTOM_RPC_PRIVACY_WARNING,
  SolanaPrivatePrivacyRiskKind.PLANNER_ONLY,
  SolanaPrivatePrivacyRiskKind.UNKNOWN,
]);

export const SolanaPrivateRecipientSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  publicAddress: z.string().optional(),
  contactNote: z.string().optional(),
  addressValidated: z.boolean().optional(),
  safetyNotes: z.array(z.string()),
});

export const SolanaPrivatePaymentLineSchema = z.object({
  id: z.string().min(1),
  recipientLabel: z.string().min(1),
  recipientAddress: z.string().optional(),
  assetSymbol: z.string().min(1),
  assetKind: SolanaPrivateAssetKindSchema,
  amountUi: z.string().min(1),
  purpose: z.string().optional(),
  memoPolicy: z.enum(['no_memo', 'public_memo_not_recommended', 'accounting_note_local_only']),
  safetyNotes: z.array(z.string()),
});

export const SolanaPrivateWorkflowDraftSchema = z.object({
  id: z.string().min(1),
  kind: SolanaPrivateWorkflowKindSchema,
  route: SolanaPrivateRouteKindSchema,
  title: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  assetSymbol: z.string().min(1),
  assetKind: SolanaPrivateAssetKindSchema,
  amountUi: z.string().optional(),
  recipient: SolanaPrivateRecipientSchema.optional(),
  paymentLines: z.array(SolanaPrivatePaymentLineSchema),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  status: SolanaPrivateWorkflowStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  blockedReasons: z.array(z.string()),
  requiredManualReviews: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaPrivatePrivacyRiskNoteSchema = z.object({
  id: z.string().min(1),
  kind: SolanaPrivatePrivacyRiskKindSchema,
  level: WorkstationRiskLevelSchema,
  title: z.string().min(1),
  description: z.string(),
  recommendation: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const SolanaPrivateRoutePlanPreviewSchema = z.object({
  id: z.string().min(1),
  workflowDraftId: z.string().min(1),
  route: SolanaPrivateRouteKindSchema,
  network: SolanaRpcNetworkSchema,
  status: z.enum([
    'preview_only',
    'not_executable',
    'blocked_missing_wallet',
    'blocked_missing_sdk',
    'blocked_unsupported_route',
  ]),
  plannedSteps: z.array(z.string()),
  unavailableCapabilities: z.array(z.string()),
  futureRequiredInputs: z.array(z.string()),
  warnings: z.array(z.string()),
  generatedAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNote: z.literal(
    'Preview only. No private/confidential transaction, proof, note, commitment, nullifier, or transfer was created.'
  ),
});

export const SolanaPrivateReceiveRequestSchema = z.object({
  id: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  route: SolanaPrivateRouteKindSchema,
  label: z.string().min(1),
  requestedAssetSymbol: z.string().min(1),
  requestedAmountUi: z.string().optional(),
  recipientPublicAddress: z.string().optional(),
  purpose: z.string().optional(),
  expiresAt: z.number().int().optional(),
  payloadVersion: z.literal('gorkh-private-receive-request-v1'),
  payloadJson: z.string(),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
  safetyNotes: z.array(z.string()),
});

export const SolanaPrivateWorkspaceStateSchema = z.object({
  drafts: z.array(SolanaPrivateWorkflowDraftSchema),
  routePlanPreviews: z.array(SolanaPrivateRoutePlanPreviewSchema),
  receiveRequests: z.array(SolanaPrivateReceiveRequestSchema),
  selectedDraftId: z.string().optional(),
  updatedAt: z.number().int(),
});

export const SolanaPrivateContextSummarySchema = z.object({
  generatedAt: z.string(),
  network: SolanaRpcNetworkSchema,
  draftCount: z.number().int().nonnegative(),
  draftSummaries: z.array(
    z.object({
      title: z.string().min(1),
      kind: SolanaPrivateWorkflowKindSchema,
      route: SolanaPrivateRouteKindSchema,
      assetSymbol: z.string().min(1),
      amountUi: z.string().optional(),
      riskLevel: WorkstationRiskLevelSchema,
      summary: z.string(),
    })
  ),
  markdown: z.string(),
  redactionsApplied: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaPrivateRecipient = z.infer<typeof SolanaPrivateRecipientSchema>;
export type SolanaPrivatePaymentLine = z.infer<typeof SolanaPrivatePaymentLineSchema>;
export type SolanaPrivateWorkflowDraft = z.infer<typeof SolanaPrivateWorkflowDraftSchema>;
export type SolanaPrivatePrivacyRiskNote = z.infer<typeof SolanaPrivatePrivacyRiskNoteSchema>;
export type SolanaPrivateRoutePlanPreview = z.infer<typeof SolanaPrivateRoutePlanPreviewSchema>;
export type SolanaPrivateReceiveRequest = z.infer<typeof SolanaPrivateReceiveRequestSchema>;
export type SolanaPrivateWorkspaceState = z.infer<typeof SolanaPrivateWorkspaceStateSchema>;
export type SolanaPrivateContextSummary = z.infer<typeof SolanaPrivateContextSummarySchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES: string[] = [
  'Private / Confidential v0.1 is a planner only.',
  'No private transfer, confidential transfer, zk proof, note, commitment, nullifier, or stealth address is created.',
  'No wallet connection, signing, or transaction execution is available.',
  'Umbra, Cloak, Token-2022 Confidential Transfers, and Light Protocol are roadmap/planning routes only in Phase 9B.',
];

export const SOLANA_PRIVATE_DENIED_CAPABILITIES: string[] = [
  'wallet_connection',
  'private_key_import',
  'seed_phrase',
  'note_secret_generation',
  'commitment_generation',
  'nullifier_generation',
  'stealth_address_generation',
  'zk_proof_generation',
  'umbra_api_call',
  'cloak_api_call',
  'token_2022_transaction_construction',
  'light_protocol_call',
  'transaction_signing',
  'transaction_execution',
  'bridge_execution',
  'swap',
  'trade',
  'drift',
];

export const SOLANA_PRIVATE_ROUTE_LABELS: Record<SolanaPrivateRouteKind, string> = {
  [SolanaPrivateRouteKind.UMBRA_PLANNED]: 'Umbra Planned Route',
  [SolanaPrivateRouteKind.CLOAK_PLANNED]: 'Cloak Planned Route',
  [SolanaPrivateRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED]:
    'Token-2022 Confidential Transfer Planned',
  [SolanaPrivateRouteKind.LIGHT_PROTOCOL_RESEARCH]: 'Light Protocol Research',
  [SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY]: 'Manual Privacy Review Only',
};

export const SOLANA_PRIVATE_WORKFLOW_LABELS: Record<SolanaPrivateWorkflowKind, string> = {
  [SolanaPrivateWorkflowKind.CONFIDENTIAL_TOKEN_TRANSFER_PLAN]: 'Confidential Token Transfer Plan',
  [SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN]: 'Private Payment Plan',
  [SolanaPrivateWorkflowKind.PRIVATE_RECEIVE_REQUEST]: 'Private Receive Request',
  [SolanaPrivateWorkflowKind.PRIVATE_PAYROLL_BATCH]: 'Private Payroll Batch',
  [SolanaPrivateWorkflowKind.PRIVATE_INVOICE_PAYMENT]: 'Private Invoice Payment',
  [SolanaPrivateWorkflowKind.PRIVACY_REVIEW]: 'Privacy Review',
  [SolanaPrivateWorkflowKind.CUSTOM]: 'Custom Privacy Workflow',
};

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaPrivateWorkflowKind(value: unknown): value is SolanaPrivateWorkflowKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaPrivateWorkflowKind).includes(value as SolanaPrivateWorkflowKind)
  );
}

export function isSolanaPrivateRouteKind(value: unknown): value is SolanaPrivateRouteKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaPrivateRouteKind).includes(value as SolanaPrivateRouteKind)
  );
}

export function isDeniedPrivateCapability(capability: string): boolean {
  return SOLANA_PRIVATE_DENIED_CAPABILITIES.includes(capability);
}

export function getPrivateRouteLabel(route: SolanaPrivateRouteKind): string {
  return SOLANA_PRIVATE_ROUTE_LABELS[route] ?? route;
}

export function getPrivateWorkflowLabel(kind: SolanaPrivateWorkflowKind): string {
  return SOLANA_PRIVATE_WORKFLOW_LABELS[kind] ?? kind;
}
