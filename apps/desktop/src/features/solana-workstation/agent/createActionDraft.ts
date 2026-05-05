import {
  SolanaAgentActionStatus,
  SolanaAgentActionKind,
  type SolanaAgentActionDraft,
  type SolanaAgentProfile,
  type SolanaTrustedProtocolId,
} from '@gorkh/shared';
import { computeDraftRiskLevel } from './agentValidation.js';

export interface CreateActionDraftInput {
  agent: SolanaAgentProfile;
  kind: SolanaAgentActionKind;
  title: string;
  userIntent: string;
  network: 'localnet' | 'devnet' | 'mainnet-beta';
  relatedInput?: string;
  relatedShieldAnalysisId?: string;
  relatedBuilderContext?: string;
  protocolIds: SolanaTrustedProtocolId[];
}

function buildProposedSteps(kind: SolanaAgentActionKind): string[] {
  switch (kind) {
    case SolanaAgentActionKind.ANALYZE_TRANSACTION:
      return [
        'Decode the transaction with GORKH Shield.',
        'Run read-only simulation preview if a serialized transaction is provided.',
        'Review risk findings.',
        'Require manual approval before any future signing flow.',
      ];
    case SolanaAgentActionKind.REVIEW_BUILDER_WORKSPACE:
      return [
        'Load the Builder workspace context.',
        'Inspect Anchor.toml, IDLs, and program source.',
        'Review toolchain status and warnings.',
        'Summarize findings for human review.',
      ];
    case SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION:
      return [
        'Identify the intended protocol.',
        'Check whether protocol integration is read-only, draft-only, or disabled.',
        'Require Shield decode/simulation before future transaction approval.',
        'Document required approvals and blocked reasons.',
      ];
    case SolanaAgentActionKind.PREPARE_PRIVATE_PAYMENT:
      return [
        'Identify the intended private payment plan.',
        'Verify privacy workflow integration status is preview-only.',
        'Require Shield simulation and manual approval.',
        'Document privacy and compliance considerations.',
      ];
    case SolanaAgentActionKind.PREPARE_MARKET_WATCH:
      return [
        'Identify the target market or token.',
        'Check oracle/indexer roadmap integrations (Pyth, Helius).',
        'Set read-only watch constraints.',
        'Require manual review before any future trading draft.',
      ];
    case SolanaAgentActionKind.CUSTOM_REQUEST:
      return [
        'Capture the custom user intent.',
        'Classify the request against allowed action kinds.',
        'Check policy boundaries (network, protocols, spend limits).',
        'Require manual approval before any future execution.',
      ];
    default:
      return ['Review the draft with GORKH Shield and require manual approval.'];
  }
}

function buildBlockedReasons(
  input: CreateActionDraftInput,
  agent: SolanaAgentProfile
): string[] {
  const reasons: string[] = [];

  reasons.push('Wallet connection required for future execution.');
  reasons.push('Transaction construction is disabled in Agent v0.1.');
  reasons.push('On-chain attestation write is disabled in Agent v0.1.');

  if (!agent.humanControllerAddress) {
    reasons.push('No human controller address is configured.');
  }

  if (input.network === 'mainnet-beta' && !agent.policy.allowMainnet) {
    reasons.push('Mainnet is not allowed by the current policy.');
  }

  const enabledProtocols = agent.policy.protocolPermissions.filter((p) => p.enabled);
  const requestedEnabled = input.protocolIds.filter((id) =>
    enabledProtocols.some((p) => p.protocolId === id)
  );

  if (requestedEnabled.length === 0 && input.protocolIds.length > 0) {
    reasons.push('None of the requested protocols are enabled in the agent policy.');
  }

  for (const protocolId of input.protocolIds) {
    const perm = agent.policy.protocolPermissions.find((p) => p.protocolId === protocolId);
    if (perm && perm.permissionLevel === 'future_execute_blocked') {
      reasons.push(`${perm.protocolId} is blocked from execution in this policy.`);
    }
  }

  return reasons;
}

export function createActionDraft(input: CreateActionDraftInput): SolanaAgentActionDraft {
  const now = Date.now();
  const blockedReasons = buildBlockedReasons(input, input.agent);
  const proposedSteps = buildProposedSteps(input.kind);

  const draft: SolanaAgentActionDraft = {
    id: `draft-${now}`,
    agentId: input.agent.id,
    kind: input.kind,
    title: input.title.trim(),
    userIntent: input.userIntent.trim(),
    network: input.network,
    relatedInput: input.relatedInput?.trim(),
    relatedShieldAnalysisId: input.relatedShieldAnalysisId,
    relatedBuilderContext: input.relatedBuilderContext,
    protocolIds: input.protocolIds,
    status: SolanaAgentActionStatus.DRAFT,
    riskLevel: computeDraftRiskLevel({ blockedReasons, kind: input.kind }),
    proposedSteps,
    blockedReasons,
    requiredApprovals: ['Manual human approval required'],
    createdAt: now,
    updatedAt: now,
    safetyNotes: [
      'This action draft is not executable.',
      'No transaction is built, signed, or sent.',
      'All proposed steps require manual human review.',
      'Execution is blocked until future phases enable wallet connection and signing.',
    ],
  };

  return draft;
}
