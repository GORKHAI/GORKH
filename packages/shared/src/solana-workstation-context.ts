import { z } from 'zod';

// ============================================================================
// GORKH Workstation Context Bridge — Shared Domain Types (Phase 7)
// ============================================================================
// Context summaries, bundles, and bridge actions for connecting Agent,
// Shield, Builder, and Assistant surfaces. No execution. No signing.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaWorkstationContextSource = {
  AGENT: 'agent',
  SHIELD: 'shield',
  BUILDER: 'builder',
  MARKETS: 'markets',
  PRIVATE: 'private',
  ASSISTANT_EXPORT: 'assistant_export',
  MANUAL: 'manual',
} as const;
export type SolanaWorkstationContextSource =
  (typeof SolanaWorkstationContextSource)[keyof typeof SolanaWorkstationContextSource];

export const SolanaWorkstationContextFormat = {
  MARKDOWN: 'markdown',
  JSON: 'json',
} as const;
export type SolanaWorkstationContextFormat =
  (typeof SolanaWorkstationContextFormat)[keyof typeof SolanaWorkstationContextFormat];

export const SolanaWorkstationContextSensitivity = {
  PUBLIC_CHAIN_DATA: 'public_chain_data',
  LOCAL_PROJECT_METADATA: 'local_project_metadata',
  USER_SUPPLIED_TEXT: 'user_supplied_text',
  REDACTED_SAFE_SUMMARY: 'redacted_safe_summary',
} as const;
export type SolanaWorkstationContextSensitivity =
  (typeof SolanaWorkstationContextSensitivity)[keyof typeof SolanaWorkstationContextSensitivity];

export const SolanaWorkstationContextReferenceKind = {
  AGENT_PROFILE: 'agent_profile',
  AGENT_POLICY: 'agent_policy',
  AGENT_ACTION_DRAFT: 'agent_action_draft',
  AGENT_ATTESTATION_PREVIEW: 'agent_attestation_preview',
  BUILDER_WORKSPACE_SUMMARY: 'builder_workspace_summary',
  BUILDER_IDL_SUMMARY: 'builder_idl_summary',
  BUILDER_LOG_ANALYSIS: 'builder_log_analysis',
  MARKETS_WATCHLIST: 'markets_watchlist',
  MARKETS_ITEM_ANALYSIS: 'markets_item_analysis',
  MARKETS_CONTEXT_SUMMARY: 'markets_context_summary',
  PRIVATE_WORKFLOW_DRAFT: 'private_workflow_draft',
  PRIVATE_ROUTE_PLAN_PREVIEW: 'private_route_plan_preview',
  PRIVATE_RECEIVE_REQUEST: 'private_receive_request',
  PRIVATE_CONTEXT_SUMMARY: 'private_context_summary',
  WALLET_PROFILE: 'wallet_profile',
  WALLET_RECEIVE_REQUEST: 'wallet_receive_request',
  WALLET_SEND_DRAFT: 'wallet_send_draft',
  WALLET_CONTEXT_SUMMARY: 'wallet_context_summary',
  SHIELD_INPUT: 'shield_input',
  SHIELD_DECODED_TRANSACTION: 'shield_decoded_transaction',
  SHIELD_RPC_ANALYSIS: 'shield_rpc_analysis',
} as const;
export type SolanaWorkstationContextReferenceKind =
  (typeof SolanaWorkstationContextReferenceKind)[keyof typeof SolanaWorkstationContextReferenceKind];

export const SolanaWorkstationBridgeActionKind = {
  COPY_CONTEXT: 'copy_context',
  PREFILL_SHIELD_FROM_AGENT_DRAFT: 'prefill_shield_from_agent_draft',
  ATTACH_BUILDER_CONTEXT_TO_AGENT_DRAFT: 'attach_builder_context_to_agent_draft',
  EXPORT_AGENT_CONTEXT: 'export_agent_context',
  EXPORT_BUILDER_CONTEXT: 'export_builder_context',
  REJECT_AGENT_DRAFT: 'reject_agent_draft',
  ARCHIVE_AGENT_DRAFT: 'archive_agent_draft',
} as const;
export type SolanaWorkstationBridgeActionKind =
  (typeof SolanaWorkstationBridgeActionKind)[keyof typeof SolanaWorkstationBridgeActionKind];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaWorkstationContextSourceSchema = z.enum([
  SolanaWorkstationContextSource.AGENT,
  SolanaWorkstationContextSource.SHIELD,
  SolanaWorkstationContextSource.BUILDER,
  SolanaWorkstationContextSource.MARKETS,
  SolanaWorkstationContextSource.PRIVATE,
  SolanaWorkstationContextSource.ASSISTANT_EXPORT,
  SolanaWorkstationContextSource.MANUAL,
]);

export const SolanaWorkstationContextFormatSchema = z.enum([
  SolanaWorkstationContextFormat.MARKDOWN,
  SolanaWorkstationContextFormat.JSON,
]);

export const SolanaWorkstationContextSensitivitySchema = z.enum([
  SolanaWorkstationContextSensitivity.PUBLIC_CHAIN_DATA,
  SolanaWorkstationContextSensitivity.LOCAL_PROJECT_METADATA,
  SolanaWorkstationContextSensitivity.USER_SUPPLIED_TEXT,
  SolanaWorkstationContextSensitivity.REDACTED_SAFE_SUMMARY,
]);

export const SolanaWorkstationContextReferenceKindSchema = z.enum([
  SolanaWorkstationContextReferenceKind.AGENT_PROFILE,
  SolanaWorkstationContextReferenceKind.AGENT_POLICY,
  SolanaWorkstationContextReferenceKind.AGENT_ACTION_DRAFT,
  SolanaWorkstationContextReferenceKind.AGENT_ATTESTATION_PREVIEW,
  SolanaWorkstationContextReferenceKind.BUILDER_WORKSPACE_SUMMARY,
  SolanaWorkstationContextReferenceKind.BUILDER_IDL_SUMMARY,
  SolanaWorkstationContextReferenceKind.BUILDER_LOG_ANALYSIS,
  SolanaWorkstationContextReferenceKind.MARKETS_WATCHLIST,
  SolanaWorkstationContextReferenceKind.MARKETS_ITEM_ANALYSIS,
  SolanaWorkstationContextReferenceKind.MARKETS_CONTEXT_SUMMARY,
  SolanaWorkstationContextReferenceKind.PRIVATE_WORKFLOW_DRAFT,
  SolanaWorkstationContextReferenceKind.PRIVATE_ROUTE_PLAN_PREVIEW,
  SolanaWorkstationContextReferenceKind.PRIVATE_RECEIVE_REQUEST,
  SolanaWorkstationContextReferenceKind.PRIVATE_CONTEXT_SUMMARY,
  SolanaWorkstationContextReferenceKind.WALLET_PROFILE,
  SolanaWorkstationContextReferenceKind.WALLET_RECEIVE_REQUEST,
  SolanaWorkstationContextReferenceKind.WALLET_SEND_DRAFT,
  SolanaWorkstationContextReferenceKind.WALLET_CONTEXT_SUMMARY,
  SolanaWorkstationContextReferenceKind.SHIELD_INPUT,
  SolanaWorkstationContextReferenceKind.SHIELD_DECODED_TRANSACTION,
  SolanaWorkstationContextReferenceKind.SHIELD_RPC_ANALYSIS,
]);

export const SolanaWorkstationContextReferenceSchema = z.object({
  id: z.string().min(1),
  kind: SolanaWorkstationContextReferenceKindSchema,
  source: SolanaWorkstationContextSourceSchema,
  title: z.string().min(1),
  summary: z.string(),
  createdAt: z.number().int(),
  sensitivity: SolanaWorkstationContextSensitivitySchema,
  localOnly: z.boolean(),
  safetyNotes: z.array(z.string()),
});

export const SolanaWorkstationContextBundleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  format: SolanaWorkstationContextFormatSchema,
  sources: z.array(SolanaWorkstationContextSourceSchema),
  references: z.array(SolanaWorkstationContextReferenceSchema),
  markdown: z.string(),
  jsonPreview: z.string(),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
  redactionsApplied: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export const SolanaWorkstationBridgeActionKindSchema = z.enum([
  SolanaWorkstationBridgeActionKind.COPY_CONTEXT,
  SolanaWorkstationBridgeActionKind.PREFILL_SHIELD_FROM_AGENT_DRAFT,
  SolanaWorkstationBridgeActionKind.ATTACH_BUILDER_CONTEXT_TO_AGENT_DRAFT,
  SolanaWorkstationBridgeActionKind.EXPORT_AGENT_CONTEXT,
  SolanaWorkstationBridgeActionKind.EXPORT_BUILDER_CONTEXT,
  SolanaWorkstationBridgeActionKind.REJECT_AGENT_DRAFT,
  SolanaWorkstationBridgeActionKind.ARCHIVE_AGENT_DRAFT,
]);

export const SolanaWorkstationBridgeActionResultSchema = z.object({
  id: z.string().min(1),
  kind: SolanaWorkstationBridgeActionKindSchema,
  ok: z.boolean(),
  message: z.string(),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
  warnings: z.array(z.string()),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaWorkstationContextReference = z.infer<
  typeof SolanaWorkstationContextReferenceSchema
>;
export type SolanaWorkstationContextBundle = z.infer<typeof SolanaWorkstationContextBundleSchema>;
export type SolanaWorkstationBridgeActionResult = z.infer<
  typeof SolanaWorkstationBridgeActionResultSchema
>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES: string[] = [
  'Context exports are local and copyable only.',
  'Context exports do not trigger signing or execution.',
  'Secret files, wallet files, .env files, and private key material are excluded.',
  'Assistant integration is manual; GORKH does not auto-send this context to an LLM in Phase 7.',
];

export const SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS: string[] = [
  '[redacted secret]',
  '[wallet path configured — not read by GORKH]',
  '[private key material excluded]',
  '[env file excluded]',
];

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaWorkstationContextSource(value: unknown): value is SolanaWorkstationContextSource {
  return (
    typeof value === 'string' &&
    Object.values(SolanaWorkstationContextSource).includes(value as SolanaWorkstationContextSource)
  );
}

export function isSolanaWorkstationBridgeActionKind(
  value: unknown
): value is SolanaWorkstationBridgeActionKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaWorkstationBridgeActionKind).includes(value as SolanaWorkstationBridgeActionKind)
  );
}

export function getBridgeActionKindLabel(kind: SolanaWorkstationBridgeActionKind): string {
  const labels: Record<SolanaWorkstationBridgeActionKind, string> = {
    copy_context: 'Copy Context',
    prefill_shield_from_agent_draft: 'Send to Shield',
    attach_builder_context_to_agent_draft: 'Attach Builder Context',
    export_agent_context: 'Export Agent Context',
    export_builder_context: 'Export Builder Context',
    reject_agent_draft: 'Reject Draft',
    archive_agent_draft: 'Archive Draft',
  };
  return labels[kind] ?? kind;
}
