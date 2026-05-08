import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRANSACTION_STUDIO_ALLOWED_RPC_METHODS,
  TRANSACTION_STUDIO_BLOCKED_CAPABILITIES,
  TRANSACTION_STUDIO_COMING_SOON_FEATURES,
  TransactionStudioAccountMetaSchema,
  TransactionStudioDecodedTransactionSchema,
  TransactionStudioExplanationSchema,
  TransactionStudioHandoffSchema,
  TransactionStudioInputKind,
  TransactionStudioInputSchema,
  TransactionStudioInstructionSchema,
  TransactionStudioRiskFindingSchema,
  TransactionStudioRiskLevel,
  TransactionStudioRiskReportSchema,
  TransactionStudioSimulationResultSchema,
  TransactionStudioSource,
  TransactionStudioWorkspaceStateSchema,
} from '../dist/index.js';

const now = Date.now();

const input = {
  id: 'input-1',
  kind: TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64,
  source: TransactionStudioSource.PASTED,
  rawInput: 'AQ==',
  createdAt: now,
  redactionsApplied: [],
  localOnly: true,
};

const instruction = {
  index: 0,
  programId: '11111111111111111111111111111111',
  programName: 'System Program',
  knownProgram: true,
  accountIndexes: [0],
  accountAddresses: ['11111111111111111111111111111111'],
  dataLength: 4,
  decodedKind: 'system_instruction',
  summary: 'System Program instruction.',
  warnings: [],
};

const account = {
  index: 0,
  address: '11111111111111111111111111111111',
  signer: true,
  writable: true,
  source: 'static',
  warnings: ['Signer account is writable.'],
};

const decoded = {
  id: 'decoded-1',
  inputId: input.id,
  format: 'legacy',
  signatureCount: 1,
  requiredSignatureCount: 1,
  recentBlockhash: '11111111111111111111111111111111',
  accountCount: 1,
  instructionCount: 1,
  programIds: ['11111111111111111111111111111111'],
  knownProgramCount: 1,
  unknownProgramCount: 0,
  signerCount: 1,
  writableAccountCount: 1,
  usesAddressLookupTables: false,
  instructions: [instruction],
  accounts: [account],
  createdAt: now,
  warnings: [],
};

test('Transaction Studio schemas validate workspace, input, decode, simulation, risk, explanation, and handoff', () => {
  assert.equal(TransactionStudioInputSchema.parse(input).localOnly, true);
  assert.equal(TransactionStudioInstructionSchema.parse(instruction).knownProgram, true);
  assert.equal(TransactionStudioAccountMetaSchema.parse(account).writable, true);
  assert.equal(TransactionStudioDecodedTransactionSchema.parse(decoded).instructionCount, 1);

  const simulation = TransactionStudioSimulationResultSchema.parse({
    id: 'sim-1',
    inputId: input.id,
    status: 'success',
    computeUnitsConsumed: 1200,
    logs: ['ok'],
    accountChanges: [],
    balanceChanges: [{
      account: account.address,
      preAmount: '1',
      postAmount: '2',
      delta: '1',
      source: 'sol',
    }],
    tokenBalanceChanges: [],
    warnings: ['Simulation uses current RPC state.'],
    simulatedAt: now,
  });
  assert.equal(simulation.status, 'success');

  const finding = TransactionStudioRiskFindingSchema.parse({
    id: 'unknown_programs',
    level: TransactionStudioRiskLevel.MEDIUM,
    title: 'Unknown programs',
    description: 'Unknown program.',
    recommendation: 'Verify.',
  });
  assert.equal(finding.level, 'medium');

  const report = TransactionStudioRiskReportSchema.parse({
    id: 'risk-1',
    inputId: input.id,
    highestLevel: 'medium',
    findings: [finding],
    signerWarnings: [],
    writableAccountWarnings: [],
    unknownProgramWarnings: ['1 unknown program'],
    simulationWarnings: [],
    createdAt: now,
  });
  assert.equal(report.findings.length, 1);

  const explanation = TransactionStudioExplanationSchema.parse({
    id: 'explain-1',
    inputId: input.id,
    summary: 'Plain-English summary.',
    plainEnglishSteps: ['Step 1'],
    programsInvolved: ['System Program'],
    possibleUserImpact: ['Writable account may change.'],
    safetyNotes: ['No signing.'],
    createdAt: now,
    localOnly: true,
  });
  assert.equal(explanation.localOnly, true);

  const handoff = TransactionStudioHandoffSchema.parse({
    id: 'handoff-1',
    source: 'agent',
    targetModule: 'transaction_studio',
    inputKind: 'signature',
    label: 'Agent handoff',
    executionBlocked: true,
    createdAt: now,
    warnings: [],
  });
  assert.equal(handoff.executionBlocked, true);

  const workspace = TransactionStudioWorkspaceStateSchema.parse({
    id: 'workspace-1',
    selectedNetwork: 'devnet',
    activeInput: input,
    activeDecodedTransaction: decoded,
    activeSimulation: simulation,
    activeRiskReport: report,
    activeExplanation: explanation,
    lastUpdatedAt: now,
    localOnly: true,
  });
  assert.equal(workspace.localOnly, true);
});

test('Transaction Studio constants block signing, broadcast, Jito, and secret access', () => {
  for (const blocked of [
    'signing',
    'transaction_broadcast',
    'raw_broadcast',
    'jito_bundle_submission',
    'private_key_access',
    'seed_phrase_access',
    'wallet_json_access',
  ]) {
    assert.ok(TRANSACTION_STUDIO_BLOCKED_CAPABILITIES.includes(blocked));
  }
  assert.ok(TRANSACTION_STUDIO_COMING_SOON_FEATURES.includes('jito_bundle_composer_locked'));
  assert.ok(TRANSACTION_STUDIO_COMING_SOON_FEATURES.includes('raw_transaction_broadcast_locked'));
  assert.ok(TRANSACTION_STUDIO_ALLOWED_RPC_METHODS.includes('simulateTransaction'));
  assert.ok(!TRANSACTION_STUDIO_ALLOWED_RPC_METHODS.includes('sendTransaction'));
});
