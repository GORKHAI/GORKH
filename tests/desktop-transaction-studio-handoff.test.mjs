import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { TransactionStudioSource } from '../packages/shared/dist/index.js';
import {
  createTransactionStudioHandoff,
} from '../apps/desktop/src/features/solana-workstation/transaction-studio/index.js';
import { prepareTransactionStudioHandoffFromAgent } from '../apps/desktop/src/features/solana-workstation/agent/station/index.js';

test('Agent handoff creates review-only Transaction Studio input', () => {
  const handoff = prepareTransactionStudioHandoffFromAgent({
    intent: `review transaction ${'1'.repeat(88)}`,
  });
  assert.equal(handoff.targetModule, 'transaction_studio');
  assert.equal(handoff.executionBlocked, true);
  assert.equal(handoff.inputKind, 'signature');
});

test('Cloak and Zerion metadata handoffs are review-only without execution', () => {
  const cloak = createTransactionStudioHandoff({
    source: TransactionStudioSource.CLOAK,
    label: 'Cloak draft summary only',
    decodedSummary: 'Cloak draft summary only; no transaction available for decode.',
  });
  const zerion = createTransactionStudioHandoff({
    source: TransactionStudioSource.ZERION,
    label: 'Zerion proposal summary only',
    decodedSummary: 'Zerion proposal summary only; no transaction available for decode.',
  });
  assert.equal(cloak.inputKind, 'cloak_draft');
  assert.equal(zerion.inputKind, 'zerion_proposal');
  assert.equal(cloak.executionBlocked, true);
  assert.equal(zerion.executionBlocked, true);
});

test('Transaction Studio handoff code does not call execution paths', () => {
  const handoffSource = readFileSync(
    new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/transactionStudioHandoff.ts', import.meta.url),
    'utf8'
  );
  const agentSource = readFileSync(
    new URL('../apps/desktop/src/features/solana-workstation/agent/station/agentShieldTools.ts', import.meta.url),
    'utf8'
  );
  const combined = `${handoffSource}\n${agentSource}`;
  assert.doesNotMatch(
    combined,
    /sendTransaction|sendRawTransaction|requestAirdrop|signTransaction|signAllTransactions|signMessage|execute|broadcast|submitBundle/i
  );
  assert.match(combined, /executionBlocked:\s*true/);
});
