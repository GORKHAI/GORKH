import type {
  ZerionAgentPolicy,
  ZerionAgentProposal,
  ZerionAuditEvent,
  ZerionExecutionResult,
} from '@gorkh/shared';

export function createZerionSafeContext(input: {
  policy?: ZerionAgentPolicy;
  proposal?: ZerionAgentProposal;
  result?: ZerionExecutionResult;
  auditEvents: ZerionAuditEvent[];
}): string {
  const lines = ['# GORKH Zerion Agent Executor Context', ''];
  lines.push('Zerion is separate from Wallet and Cloak. No API keys, agent tokens, private keys, or Cloak notes are included.');
  if (input.policy) {
    lines.push('', `Policy: ${input.policy.name}`);
    lines.push(`- Chain: ${input.policy.chain}`);
    lines.push(`- Pair: ${input.policy.allowedFromToken} -> ${input.policy.allowedToToken}`);
    lines.push(`- Max SOL amount: ${input.policy.maxSolAmount}`);
    lines.push(`- Bridge disabled: ${input.policy.bridgeDisabled}`);
    lines.push(`- Send disabled: ${input.policy.sendDisabled}`);
  }
  if (input.proposal) {
    lines.push('', `Proposal: ${input.proposal.id}`);
    lines.push(`- Wallet metadata name: ${input.proposal.walletName}`);
    lines.push(`- Amount: ${input.proposal.amountSol} SOL`);
    lines.push(`- Command kind: zerion_solana_swap`);
  }
  if (input.result) {
    lines.push('', `Last execution: ${input.result.ok ? 'success' : 'failed'}`);
    if (input.result.txHash) lines.push(`- Transaction: ${input.result.txHash}`);
    if (input.result.errorCode) lines.push(`- Error code: ${input.result.errorCode}`);
  }
  const latest = input.auditEvents.slice(-5);
  if (latest.length > 0) {
    lines.push('', 'Recent audit events:');
    for (const event of latest) {
      lines.push(`- ${event.title}`);
    }
  }
  return lines.join('\n');
}

