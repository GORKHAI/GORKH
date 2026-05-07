import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { prepareShieldHandoff } from '../apps/desktop/src/features/solana-workstation/agent/station/agentShieldTools.ts';
import { prepareCloakHandoff } from '../apps/desktop/src/features/solana-workstation/agent/station/agentCloakHandoff.ts';
import { prepareZerionHandoff } from '../apps/desktop/src/features/solana-workstation/agent/station/agentZerionHandoff.ts';

const walletResult = {
  selectedProfileId: 'wallet-1',
  selectedProfileLabel: 'Read-only main',
  publicAddress: '11111111111111111111111111111111',
  network: 'mainnet-beta',
  hasSnapshot: true,
  warnings: [],
  source: 'wallet_workspace',
  localOnly: true,
};

test('Shield handoff creates prefilled manual review without simulation or RPC', () => {
  const sig = '1'.repeat(88);
  const result = prepareShieldHandoff({ intent: `explain transaction ${sig}` });
  assert.equal(result.targetModule, 'shield');
  assert.equal(result.handoffStatus, 'ready_for_manual_review');
  assert.equal(result.prefilledInput, sig);
  assert.equal(result.decodedAvailable, false);
  assert.equal(result.simulationAvailable, false);

  const source = readFileSync('apps/desktop/src/features/solana-workstation/agent/station/agentShieldTools.ts', 'utf8');
  assert.doesNotMatch(source, /simulateTransactionPreview|getTransactionReadOnly|getAccountInfoReadOnly/);
});

test('Cloak handoff is draft-only and never imports signer bridge', () => {
  const recipient = '11111111111111111111111111111111';
  const handoff = prepareCloakHandoff({
    intent: `prepare a Cloak private send of 0.01 SOL to ${recipient}`,
    walletResult,
  });
  assert.equal(handoff.targetModule, 'wallet_cloak');
  assert.equal(handoff.executionBlocked, true);
  assert.equal(handoff.amountLamports, '10000000');
  assert.equal(handoff.recipient, recipient);
  assert.equal(handoff.handoffStatus, 'ready_for_wallet_review');

  const source = readFileSync('apps/desktop/src/features/solana-workstation/agent/station/agentCloakHandoff.ts', 'utf8');
  assert.doesNotMatch(source, /wallet_cloak_deposit_execute/);
  assert.doesNotMatch(source, /executeCloakDepositWithSignerBridge|CloakSigner|signer bridge/i);
  assert.doesNotMatch(JSON.stringify(handoff), /viewingKey|cloakNoteSecret|privateKey|seedPhrase/);
});

test('Zerion handoff creates proposal-only draft and never executes CLI swap', () => {
  const handoff = prepareZerionHandoff({
    intent: 'prepare a tiny Zerion DCA of 0.1 SOL to USDC',
    walletName: 'tiny-wallet',
    policyName: 'gorkh-default',
    policyDigest: 'abc123',
  });
  assert.equal(handoff.targetModule, 'zerion_executor');
  assert.equal(handoff.executionBlocked, true);
  assert.equal(handoff.proposalKind, 'zerion_dca');
  assert.equal(handoff.amountSol, '0.001');
  assert.match(handoff.warnings.join(' '), /clamped/);

  const source = readFileSync('apps/desktop/src/features/solana-workstation/agent/station/agentZerionHandoff.ts', 'utf8');
  assert.doesNotMatch(source, /zerion_cli_swap_execute|executeZerionSwap|swap_execute/);
  assert.doesNotMatch(JSON.stringify(handoff), /apiKey|agentToken|privateKey/);
});

test('cross-module UI accepts safe prefill props without auto-execution', () => {
  const workstation = readFileSync('apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx', 'utf8');
  const wallet = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/components/CloakWalletPanel.tsx', 'utf8');
  const zerion = readFileSync('apps/desktop/src/features/solana-workstation/agent/zerion/components/ZerionAgentExecutorPanel.tsx', 'utf8');

  assert.match(workstation, /pendingCloakHandoff/);
  assert.match(workstation, /pendingZerionProposal/);
  assert.match(wallet, /cloak-agent-handoff-prefill/);
  assert.match(zerion, /zerion-agent-handoff-prefill/);
  assert.match(zerion, /Create Proposal/);
  assert.doesNotMatch(workstation, /executeZerionSwap|executeCloakDepositWithSignerBridge/);
});
