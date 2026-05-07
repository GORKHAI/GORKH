import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildZerionCreatePolicyCommand,
  buildZerionCreateTokenCommand,
  buildZerionPortfolioCommand,
  buildZerionSwapExecuteCommand,
  buildZerionWalletListCommand,
} from '../apps/desktop/src/features/solana-workstation/agent/zerion/zerionCommandBuilders.ts';
import {
  checkZerionProposalPolicy,
  createDefaultZerionPolicy,
} from '../apps/desktop/src/features/solana-workstation/agent/zerion/zerionPolicyGuards.ts';

function policy() {
  return {
    ...createDefaultZerionPolicy(Date.now()),
    localOnlyDigest: 'b'.repeat(64),
  };
}

function proposal(overrides = {}) {
  return {
    id: 'proposal-1',
    kind: 'zerion_solana_swap',
    source: 'agent_zerion_panel',
    chain: 'solana',
    walletName: 'gorkh-agent-demo',
    amountSol: '0.001',
    fromToken: 'SOL',
    toToken: 'USDC',
    policyName: 'gorkh-solana-tiny-swap',
    localPolicyDigest: 'b'.repeat(64),
    commandPreview: ['zerion', 'swap', 'solana', '0.001', 'SOL', 'USDC', '--wallet', 'gorkh-agent-demo', '--json'],
    riskNotes: [],
    approvalRequired: true,
    createdAt: Date.now(),
    ...overrides,
  };
}

test('Zerion command builders produce exact allowed args', () => {
  assert.deepEqual(buildZerionWalletListCommand('zerion').preview, ['zerion', 'wallet', 'list', '--json']);
  assert.deepEqual(buildZerionPortfolioCommand('zerion', 'So11111111111111111111111111111111111111112').preview, [
    'zerion',
    'portfolio',
    'So11111111111111111111111111111111111111112',
    '--json',
  ]);
  assert.deepEqual(buildZerionCreatePolicyCommand('zerion', policy()).preview, [
    'zerion',
    'agent',
    'create-policy',
    '--name',
    'gorkh-solana-tiny-swap',
    '--chains',
    'solana',
    '--expires',
    '24h',
    '--deny-transfers',
    '--json',
  ]);
  assert.deepEqual(buildZerionCreateTokenCommand('zerion', {
    tokenName: 'gorkh-agent-token',
    walletName: 'gorkh-agent-demo',
    policyName: 'gorkh-solana-tiny-swap',
  }).preview, [
    'zerion',
    'agent',
    'create-token',
    '--name',
    'gorkh-agent-token',
    '--wallet',
    'gorkh-agent-demo',
    '--policy',
    'gorkh-solana-tiny-swap',
    '--json',
  ]);
  assert.deepEqual(buildZerionSwapExecuteCommand('zerion', proposal(), policy()).preview, [
    'zerion',
    'swap',
    'solana',
    '0.001',
    'SOL',
    'USDC',
    '--wallet',
    'gorkh-agent-demo',
    '--json',
  ]);
});

test('Zerion guards reject shell metacharacters, unsupported chain, pair, and amount', () => {
  assert.throws(() => buildZerionWalletListCommand('zerion;rm'));
  assert.throws(() => buildZerionCreateTokenCommand('zerion', {
    tokenName: 'token',
    walletName: 'bad;wallet',
    policyName: 'policy',
  }));

  const validPolicy = policy();
  assert.equal(checkZerionProposalPolicy(proposal(), validPolicy, {
    proposalId: 'proposal-1',
    source: 'agent_zerion_panel',
    approved: true,
    approvedAt: Date.now(),
    approvalText: 'I understand this will execute a real onchain transaction using Zerion CLI.',
  }).allowed, true);

  assert.equal(checkZerionProposalPolicy(proposal({ chain: 'ethereum' }), validPolicy).allowed, false);
  assert.equal(checkZerionProposalPolicy(proposal({ toToken: 'ETH' }), validPolicy).allowed, false);
  assert.equal(checkZerionProposalPolicy(proposal({ amountSol: '0.01' }), validPolicy).allowed, false);
});

