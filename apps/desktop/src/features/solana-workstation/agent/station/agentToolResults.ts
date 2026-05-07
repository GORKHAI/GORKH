// Re-export the v0.2 shared tool result types for convenient local imports.
export type {
  GorkhAgentWalletToolResult,
  GorkhAgentMarketsToolResult,
  GorkhAgentMarketsSelectedItem,
  GorkhAgentShieldToolResult,
  GorkhAgentShieldInputKind,
  GorkhAgentCloakDraftHandoff,
  GorkhAgentCloakDraftKind,
  GorkhAgentCloakHandoffStatus,
  GorkhAgentZerionProposalHandoff,
  GorkhAgentZerionHandoffStatus,
  GorkhAgentContextBundleResult,
  GorkhAgentHandoffEntry,
} from '@gorkh/shared';

export {
  GorkhAgentWalletToolResultSchema,
  GorkhAgentMarketsToolResultSchema,
  GorkhAgentShieldToolResultSchema,
  GorkhAgentCloakDraftHandoffSchema,
  GorkhAgentZerionProposalHandoffSchema,
  GorkhAgentContextBundleResultSchema,
  GorkhAgentHandoffEntrySchema,
  hasForbiddenHandoffField,
  GORKH_AGENT_FORBIDDEN_HANDOFF_FIELDS,
} from '@gorkh/shared';
