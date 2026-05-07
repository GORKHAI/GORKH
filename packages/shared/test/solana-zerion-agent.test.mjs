import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ZERION_ALLOWED_CHAINS,
  ZERION_ALLOWED_SWAP_PAIRS,
  ZERION_BLOCKED_COMMANDS,
  ZERION_DEFAULT_BINARY,
  ZERION_DEFAULT_MAX_SOL_AMOUNT,
  ZerionAgentPolicySchema,
  ZerionAgentProposalSchema,
  ZerionAuditEventSchema,
  ZerionExecutionResultSchema,
} from '../dist/index.js';

test('Zerion shared constants are Solana tiny-swap scoped', () => {
  assert.equal(ZERION_DEFAULT_BINARY, 'zerion');
  assert.deepEqual(ZERION_ALLOWED_CHAINS, ['solana']);
  assert.deepEqual(ZERION_ALLOWED_SWAP_PAIRS, [{ from: 'SOL', to: 'USDC' }]);
  assert.equal(ZERION_DEFAULT_MAX_SOL_AMOUNT, '0.001');
  for (const blocked of ['bridge', 'send', 'sign-message', 'config set', 'wallet import']) {
    assert.ok(ZERION_BLOCKED_COMMANDS.includes(blocked), `${blocked} must be blocked`);
  }
});

test('Zerion policy, proposal, result, and audit schemas validate safe metadata', () => {
  const now = Date.now();
  const digest = 'a'.repeat(64);
  const policy = ZerionAgentPolicySchema.parse({
    name: 'gorkh-solana-tiny-swap',
    chain: 'solana',
    allowedFromToken: 'SOL',
    allowedToToken: 'USDC',
    maxSolAmount: '0.001',
    expiresAt: now + 86_400_000,
    maxExecutions: 1,
    executionsUsed: 0,
    bridgeDisabled: true,
    sendDisabled: true,
    denyTransfers: true,
    denyApprovals: true,
    localOnlyDigest: digest,
    createdAt: now,
  });
  assert.equal(policy.chain, 'solana');

  const proposal = ZerionAgentProposalSchema.parse({
    id: 'proposal-1',
    kind: 'zerion_solana_swap',
    source: 'agent_zerion_panel',
    chain: 'solana',
    walletName: 'gorkh-agent-demo',
    amountSol: '0.001',
    fromToken: 'SOL',
    toToken: 'USDC',
    policyName: policy.name,
    localPolicyDigest: digest,
    commandPreview: ['zerion', 'swap', 'solana', '0.001', 'SOL', 'USDC', '--wallet', 'gorkh-agent-demo', '--json'],
    riskNotes: [],
    approvalRequired: true,
    createdAt: now,
  });
  assert.equal(proposal.source, 'agent_zerion_panel');

  const result = ZerionExecutionResultSchema.parse({
    id: 'result-1',
    proposalId: proposal.id,
    commandKind: 'swap_execute',
    ok: true,
    chain: 'solana',
    amountSol: '0.001',
    fromToken: 'SOL',
    toToken: 'USDC',
    walletName: 'gorkh-agent-demo',
    txHash: 'abc123',
    commandPreview: proposal.commandPreview,
    executedAt: now,
  });
  assert.equal(result.ok, true);

  const audit = ZerionAuditEventSchema.parse({
    id: 'audit-1',
    kind: 'execution_succeeded',
    title: 'Executed',
    description: 'Safe metadata only.',
    proposalId: proposal.id,
    txHash: result.txHash,
    commandKind: 'swap_execute',
    createdAt: now,
    localOnly: true,
  });
  assert.equal(audit.localOnly, true);
});

