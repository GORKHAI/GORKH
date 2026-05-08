import assert from 'node:assert/strict';
import test from 'node:test';
import { createTransactionStudioRiskReport } from '../apps/desktop/src/features/solana-workstation/transaction-studio/index.js';

const studioInput = {
  id: 'input-1',
  kind: 'serialized_transaction_base64',
  source: 'pasted',
  rawInput: 'broadcast this',
  createdAt: Date.now(),
  redactionsApplied: [],
  localOnly: true,
};

test('Transaction Studio risk report marks direct broadcast requests critical', () => {
  const report = createTransactionStudioRiskReport({ studioInput });
  assert.equal(report.highestLevel, 'critical');
  assert.ok(report.findings.some((finding) => finding.id === 'direct_execution_request_blocked'));
});

test('Transaction Studio risk report marks unknown programs and many writable accounts high or medium', () => {
  const decoded = {
    id: 'decoded-1',
    inputId: studioInput.id,
    format: 'legacy',
    signatureCount: 1,
    requiredSignatureCount: 1,
    accountCount: 12,
    instructionCount: 1,
    programIds: ['UnknownProgram111111111111111111111111111111'],
    knownProgramCount: 0,
    unknownProgramCount: 1,
    signerCount: 1,
    writableAccountCount: 9,
    usesAddressLookupTables: false,
    instructions: [{
      index: 0,
      programId: 'UnknownProgram111111111111111111111111111111',
      knownProgram: false,
      accountIndexes: [0],
      accountAddresses: ['Signer111111111111111111111111111111111'],
      dataLength: 8,
      summary: 'Unknown instruction.',
      warnings: ['Unknown program.'],
    }],
    accounts: Array.from({ length: 9 }, (_, index) => ({
      index,
      address: `Account${index}111111111111111111111111111111`,
      signer: index === 0,
      writable: true,
      source: 'static',
      warnings: [],
    })),
    createdAt: Date.now(),
    warnings: [],
  };
  const report = createTransactionStudioRiskReport({
    studioInput: { ...studioInput, rawInput: 'AQ==' },
    decoded,
  });
  assert.ok(report.findings.some((finding) => finding.id === 'unknown_programs'));
  assert.ok(report.findings.some((finding) => finding.id === 'many_writable_accounts'));
  assert.ok(['medium', 'high'].includes(report.highestLevel));
});

test('Transaction Studio failed simulation creates high risk finding', () => {
  const report = createTransactionStudioRiskReport({
    studioInput: { ...studioInput, rawInput: 'AQ==' },
    simulation: {
      id: 'sim-1',
      inputId: studioInput.id,
      status: 'failed',
      err: { InstructionError: [0, 'Custom'] },
      logs: ['failed'],
      accountChanges: [],
      balanceChanges: [],
      tokenBalanceChanges: [],
      warnings: [],
    },
  });
  assert.equal(report.highestLevel, 'high');
  assert.ok(report.findings.some((finding) => finding.id === 'simulation_failed'));
});

test('Transaction Studio flags token authority changes high and compute budget low', () => {
  const decoded = {
    id: 'decoded-authority',
    inputId: studioInput.id,
    format: 'legacy',
    signatureCount: 1,
    requiredSignatureCount: 1,
    accountCount: 3,
    instructionCount: 2,
    programIds: [
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      'ComputeBudget111111111111111111111111111111',
    ],
    knownProgramCount: 2,
    unknownProgramCount: 0,
    signerCount: 1,
    writableAccountCount: 2,
    usesAddressLookupTables: false,
    instructions: [
      {
        index: 0,
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        programName: 'SPL Token Program',
        knownProgram: true,
        accountIndexes: [0, 1],
        accountAddresses: ['Authority11111111111111111111111111111', 'TokenAccount111111111111111111111111111'],
        dataLength: 3,
        decodedKind: 'spl_token_set_authority',
        summary: 'SPL Token authority change.',
        warnings: ['Token authority changes can transfer control.'],
      },
      {
        index: 1,
        programId: 'ComputeBudget111111111111111111111111111111',
        programName: 'Compute Budget Program',
        knownProgram: true,
        accountIndexes: [],
        accountAddresses: [],
        dataLength: 5,
        decodedKind: 'compute_budget_set_unit_limit',
        summary: 'Set compute unit limit.',
        warnings: [],
      },
    ],
    accounts: [
      {
        index: 0,
        address: 'Authority11111111111111111111111111111',
        signer: true,
        writable: true,
        source: 'static',
        warnings: [],
      },
      {
        index: 1,
        address: 'TokenAccount111111111111111111111111111',
        signer: false,
        writable: true,
        source: 'static',
        warnings: [],
      },
      {
        index: 2,
        address: 'ComputeBudget111111111111111111111111111111',
        signer: false,
        writable: false,
        source: 'static',
        warnings: [],
      },
    ],
    createdAt: Date.now(),
    warnings: [],
  };
  const report = createTransactionStudioRiskReport({
    studioInput: { ...studioInput, rawInput: 'AQ==' },
    decoded,
  });
  assert.equal(report.highestLevel, 'high');
  assert.ok(report.findings.some((finding) => finding.id === 'token_authority_change_0'));
  assert.ok(report.findings.some((finding) => finding.id === 'compute_budget_instruction'));
});
