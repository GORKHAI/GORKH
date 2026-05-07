import {
  isGorkhAgentAllowedToolId,
  isGorkhAgentBlockedToolId,
  type GorkhAgentPolicy,
  type GorkhAgentRuntimeState,
  type GorkhAgentToolId,
} from '@gorkh/shared';
import type { WorkstationRiskLevel } from '@gorkh/shared';

export interface AgentToolRequest {
  toolId: GorkhAgentToolId;
  /** Whether the request is a draft/proposal (true) or an execution call (false). */
  isProposalDraft: boolean;
  /** Optional protocol slug (e.g. 'cloak', 'jupiter'). */
  protocol?: string;
}

export interface AgentToolEvaluation {
  allowed: boolean;
  requiresApproval: boolean;
  blockedReasons: string[];
  riskLevel: WorkstationRiskLevel;
  policyDigest: string;
}

const HIGH_RISK_PROTOCOLS = new Set([
  'jupiter',
  'kamino',
  'meteora',
  'orca',
  'cloak',
  'zerion_cli',
]);

export function computePolicyDigest(policy: GorkhAgentPolicy): string {
  const fingerprint = [
    policy.id,
    policy.name,
    policy.allowedTools.length,
    policy.blockedTools.length,
    policy.requireApprovalForTransactions,
    policy.requireApprovalForCloak,
    policy.requireApprovalForZerion,
    policy.allowMainWalletAutonomousExecution,
    policy.allowAutonomousCloakSend,
    policy.allowAutonomousTrading,
    policy.allowAutonomousDaoVoting,
    policy.updatedAt,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i += 1) {
    hash = (Math.imul(31, hash) + fingerprint.charCodeAt(i)) | 0;
  }
  return `gorkh-policy-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function isCloakDraftTool(toolId: GorkhAgentToolId): boolean {
  return toolId === 'cloak.prepare_deposit' || toolId === 'cloak.prepare_private_send';
}

function isZerionDraftTool(toolId: GorkhAgentToolId): boolean {
  return toolId === 'zerion.create_proposal';
}

function isWalletReadTool(toolId: GorkhAgentToolId): boolean {
  return toolId === 'wallet.read_snapshot' || toolId === 'wallet.read_portfolio';
}

function isTransactionDraftTool(toolId: GorkhAgentToolId): boolean {
  return (
    toolId === 'shield.simulate_transaction' ||
    toolId === 'shield.decode_transaction' ||
    isCloakDraftTool(toolId) ||
    isZerionDraftTool(toolId)
  );
}

export function evaluateAgentToolRequest(
  policy: GorkhAgentPolicy,
  runtime: GorkhAgentRuntimeState,
  request: AgentToolRequest
): AgentToolEvaluation {
  const blockedReasons: string[] = [];
  const policyDigest = computePolicyDigest(policy);

  if (runtime.killSwitchEnabled) {
    blockedReasons.push('Kill switch is engaged. All proposals and tool calls are blocked.');
  }

  if (isGorkhAgentBlockedToolId(request.toolId)) {
    blockedReasons.push(`Tool "${request.toolId}" is on the blocked list and cannot be used.`);
  }

  if (!isGorkhAgentAllowedToolId(request.toolId) && !isGorkhAgentBlockedToolId(request.toolId)) {
    blockedReasons.push(`Tool "${request.toolId}" is unknown to the policy engine.`);
  }

  if (policy.blockedTools.includes(request.toolId)) {
    blockedReasons.push(`Policy blocks tool "${request.toolId}".`);
  }

  if (
    isGorkhAgentAllowedToolId(request.toolId) &&
    !policy.allowedTools.includes(request.toolId) &&
    !policy.blockedTools.includes(request.toolId)
  ) {
    blockedReasons.push(`Policy does not include tool "${request.toolId}" in allowedTools.`);
  }

  if (!request.isProposalDraft) {
    if (isCloakDraftTool(request.toolId)) {
      blockedReasons.push(
        'Cloak execution is not permitted from the GORKH Agent runtime. Approve the draft from Wallet → Cloak Private.'
      );
    }
    if (isZerionDraftTool(request.toolId)) {
      blockedReasons.push(
        'Zerion execution is not permitted from the GORKH Agent runtime. Approve the proposal from the Zerion Executor panel.'
      );
    }
  }

  if (
    request.toolId === 'cloak.execute_private_send_autonomous' ||
    request.toolId === 'cloak.execute_deposit_autonomous' ||
    request.toolId === 'zerion.execute_without_approval' ||
    request.toolId === 'zerion_cli_swap_execute' ||
    request.toolId === 'wallet.sign_without_approval' ||
    request.toolId === 'wallet.send_without_approval'
  ) {
    blockedReasons.push('Autonomous execution is permanently blocked in v0.1.');
  }

  let riskLevel: WorkstationRiskLevel = 'low';
  if (isTransactionDraftTool(request.toolId)) {
    riskLevel = 'medium';
  }
  if (isCloakDraftTool(request.toolId) || isZerionDraftTool(request.toolId)) {
    riskLevel = 'high';
  }
  if (request.protocol && HIGH_RISK_PROTOCOLS.has(request.protocol)) {
    riskLevel = riskLevel === 'low' ? 'medium' : 'high';
  }

  let requiresApproval = false;
  if (isCloakDraftTool(request.toolId) && policy.requireApprovalForCloak) {
    requiresApproval = true;
  }
  if (isZerionDraftTool(request.toolId) && policy.requireApprovalForZerion) {
    requiresApproval = true;
  }
  if (isTransactionDraftTool(request.toolId) && policy.requireApprovalForTransactions) {
    requiresApproval = true;
  }
  if (isWalletReadTool(request.toolId)) {
    requiresApproval = false;
  }

  return {
    allowed: blockedReasons.length === 0,
    requiresApproval,
    blockedReasons,
    riskLevel,
    policyDigest,
  };
}
