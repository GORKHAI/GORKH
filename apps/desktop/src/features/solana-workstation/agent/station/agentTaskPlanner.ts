import {
  GorkhAgentProposalKind,
  GorkhAgentTaskKind,
  GorkhAgentTaskStatus,
  getGorkhAgentTaskKindForIntent,
  getGorkhAgentTaskKindLabel,
  type GorkhAgentProposal,
  type GorkhAgentProposalKind as ProposalKind,
  type GorkhAgentTask,
  type GorkhAgentToolId,
} from '@gorkh/shared';
import type { WorkstationRiskLevel } from '@gorkh/shared';

export interface PlannedTask {
  task: GorkhAgentTask;
  toolId: GorkhAgentToolId;
  proposalKind: ProposalKind;
  isProposalDraft: boolean;
  protocol?: string;
  baseSummary: string;
}

const KIND_TO_TOOL: Record<GorkhAgentTaskKind, GorkhAgentToolId> = {
  portfolio_analysis: 'wallet.read_portfolio',
  token_analysis: 'markets.fetch_context',
  transaction_review: 'shield.decode_transaction',
  cloak_private_payment_draft: 'cloak.prepare_private_send',
  zerion_dca_proposal: 'zerion.create_proposal',
  builder_review: 'builder.inspect_workspace',
  context_summary: 'context.create_bundle',
  general_planning: 'wallet.read_snapshot',
};

const KIND_TO_PROPOSAL: Record<GorkhAgentTaskKind, ProposalKind> = {
  portfolio_analysis: GorkhAgentProposalKind.WALLET_OBSERVATION,
  token_analysis: GorkhAgentProposalKind.INFORMATIONAL,
  transaction_review: GorkhAgentProposalKind.INFORMATIONAL,
  cloak_private_payment_draft: GorkhAgentProposalKind.CLOAK_DRAFT,
  zerion_dca_proposal: GorkhAgentProposalKind.ZERION_PROPOSAL,
  builder_review: GorkhAgentProposalKind.BUILDER_ACTION,
  context_summary: GorkhAgentProposalKind.CONTEXT_EXPORT,
  general_planning: GorkhAgentProposalKind.INFORMATIONAL,
};

const KIND_TO_RISK: Record<GorkhAgentTaskKind, WorkstationRiskLevel> = {
  portfolio_analysis: 'low',
  token_analysis: 'low',
  transaction_review: 'medium',
  cloak_private_payment_draft: 'high',
  zerion_dca_proposal: 'high',
  builder_review: 'low',
  context_summary: 'low',
  general_planning: 'low',
};

const KIND_TO_PROTOCOL: Partial<Record<GorkhAgentTaskKind, string>> = {
  cloak_private_payment_draft: 'cloak',
  zerion_dca_proposal: 'zerion_cli',
};

export function planTaskFromIntent(intent: string, now: number = Date.now()): PlannedTask {
  const trimmed = intent.trim();
  const kind = getGorkhAgentTaskKindForIntent(trimmed);
  const toolId = KIND_TO_TOOL[kind];
  const proposalKind = KIND_TO_PROPOSAL[kind];
  const riskLevel = KIND_TO_RISK[kind];
  const protocol = KIND_TO_PROTOCOL[kind];

  const task: GorkhAgentTask = {
    id: `gorkh-task-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${getGorkhAgentTaskKindLabel(kind)} — ${trimmed.slice(0, 60)}`,
    userIntent: trimmed.slice(0, 2000),
    kind,
    status: GorkhAgentTaskStatus.QUEUED,
    riskLevel,
    createdAt: now,
    updatedAt: now,
  };

  return {
    task,
    toolId,
    proposalKind,
    isProposalDraft: true,
    protocol,
    baseSummary: buildSummary(kind, trimmed),
  };
}

export function buildProposal(
  plan: PlannedTask,
  policyDigest: string,
  blockedReasons: string[],
  requiresApproval: boolean
): GorkhAgentProposal {
  return {
    id: `gorkh-proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskId: plan.task.id,
    kind: plan.proposalKind,
    summary: plan.baseSummary,
    requiresApproval,
    executionBlocked: true,
    blockedReasons,
    policyDigest,
    relatedProtocol: plan.protocol,
    createdAt: Date.now(),
  };
}

function buildSummary(kind: GorkhAgentTaskKind, intent: string): string {
  switch (kind) {
    case GorkhAgentTaskKind.PORTFOLIO_ANALYSIS:
      return `Plan: read wallet snapshot and portfolio summary for "${intent}". No signing or transactions.`;
    case GorkhAgentTaskKind.TOKEN_ANALYSIS:
      return `Plan: pull market context for the requested token. Read-only Markets data only.`;
    case GorkhAgentTaskKind.TRANSACTION_REVIEW:
      return `Plan: route the transaction input to Shield decode. Simulation and approval remain manual.`;
    case GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT:
      return `Plan: prepare a Cloak private-send draft. Execution stays inside Wallet → Cloak Private approval.`;
    case GorkhAgentTaskKind.ZERION_DCA_PROPOSAL:
      return `Plan: create a typed Zerion swap proposal. Execution requires Zerion Executor approval.`;
    case GorkhAgentTaskKind.BUILDER_REVIEW:
      return `Plan: inspect the Builder workspace summary and analyze recent logs. No deploy or build action.`;
    case GorkhAgentTaskKind.CONTEXT_SUMMARY:
      return `Plan: create a sanitized context bundle. Secrets redacted before export.`;
    case GorkhAgentTaskKind.GENERAL_PLANNING:
    default:
      return `Plan: capture the user intent and observe wallet/market state. No execution.`;
  }
}
