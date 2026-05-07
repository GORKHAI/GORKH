import {
  GorkhAgentApprovalState,
  type GorkhAgentApprovalItem,
  type GorkhAgentProposal,
} from '@gorkh/shared';
import type { WorkstationRiskLevel } from '@gorkh/shared';

export interface ApprovalQueueOptions {
  expiresInMs?: number;
}

export function createApprovalItem(
  proposal: GorkhAgentProposal,
  riskLevel: WorkstationRiskLevel,
  options: ApprovalQueueOptions = {}
): GorkhAgentApprovalItem {
  const now = Date.now();
  const initialState: GorkhAgentApprovalItem['approvalState'] = proposal.blockedReasons.length > 0
    ? GorkhAgentApprovalState.BLOCKED
    : GorkhAgentApprovalState.PENDING;

  return {
    id: `gorkh-approval-${now}-${Math.random().toString(36).slice(2, 8)}`,
    proposalId: proposal.id,
    title: `Approve ${proposal.kind} proposal`,
    description: proposal.summary,
    riskLevel,
    approvalState: initialState,
    approvalRequired: true,
    createdAt: now,
    expiresAt:
      options.expiresInMs && options.expiresInMs > 0 ? now + options.expiresInMs : undefined,
  };
}

export function transitionApproval(
  item: GorkhAgentApprovalItem,
  to: GorkhAgentApprovalItem['approvalState']
): GorkhAgentApprovalItem {
  return { ...item, approvalState: to };
}
