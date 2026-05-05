import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeSolanaBuilderLogs } from './analyzeLogs.js';

test('analyzeLogs detects AnchorError with Error Code and Error Number', () => {
  const logs = `
    AnchorError thrown in programs/my_program/src/lib.rs:42.
    Error Code: ConstraintSeeds
    Error Number: 2003
    Error Message: A seeds constraint was violated
  `;
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.length > 0);
  const finding = result.findings.find((f) => f.kind === 'anchor_constraint_error');
  assert.ok(finding);
  assert.equal(finding.title, 'Anchor Constraint Violation');
});

test('analyzeLogs detects custom program error hex and converts to decimal', () => {
  const logs = 'Program returned error: custom program error: 0x1770';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.length > 0);
  const finding = result.findings.find((f) => f.kind === 'custom_program_error');
  assert.ok(finding);
  assert.equal(finding.matchedHexCode, '0x1770');
  assert.equal(finding.matchedCode, 0x1770);
});

test('analyzeLogs maps custom program error to IDL error when code matches', () => {
  const idls = [
    {
      name: 'my_program',
      version: '0.1.0',
      spec: '0.1.0',
      instructions: [],
      accounts: [],
      errors: [
        { code: 0x1770, name: 'InvalidAmount', msg: 'Amount must be greater than zero' },
      ],
    },
  ];
  const logs = 'Program returned error: custom program error: 0x1770';
  const result = analyzeSolanaBuilderLogs(logs, idls);
  const finding = result.findings.find((f) => f.kind === 'idl_error_match');
  assert.ok(finding);
  assert.equal(finding.matchedIdlErrorName, 'InvalidAmount');
  assert.equal(finding.confidence, 'high');
});

test('analyzeLogs detects ConstraintSeeds', () => {
  const logs = 'A seeds constraint was violated';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'anchor_constraint_error'));
});

test('analyzeLogs detects ConstraintOwner', () => {
  const logs = 'A owner constraint was violated';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'anchor_constraint_error'));
});

test('analyzeLogs detects ConstraintSigner', () => {
  const logs = 'A signer constraint was violated';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'anchor_constraint_error'));
});

test('analyzeLogs detects insufficient funds', () => {
  const logs = 'Transaction failed: insufficient funds for rent';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'insufficient_funds'));
});

test('analyzeLogs detects blockhash not found', () => {
  const logs = 'Blockhash not found';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'blockhash_not_found'));
});

test('analyzeLogs detects compute budget exceeded', () => {
  const logs = 'Computational budget exceeded';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'compute_budget_exceeded'));
});

test('analyzeLogs detects instruction error', () => {
  const logs = 'Program failed to complete: InstructionError';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'instruction_error'));
});

test('analyzeLogs detects signature missing', () => {
  const logs = 'Signature verification failed';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'signature_missing'));
});

test('analyzeLogs detects account not found', () => {
  const logs = 'AccountNotFound';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'account_not_found'));
});

test('analyzeLogs detects toolchain error', () => {
  const logs = 'rustc error: could not compile';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.findings.some((f) => f.kind === 'toolchain_error'));
});

test('analyzeLogs extracts program references', () => {
  const logs = 'Program Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K invoke [1]';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.referencedPrograms.includes('Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K'));
});

test('analyzeLogs extracts instruction names', () => {
  const logs = 'Instruction: initialize';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.ok(result.referencedInstructions.includes('initialize'));
});

test('analyzeLogs returns no findings for clean logs', () => {
  const logs = 'Everything looks good. Transaction confirmed.';
  const result = analyzeSolanaBuilderLogs(logs);
  assert.equal(result.findings.length, 0);
  assert.ok(result.summary.includes('No known error patterns'));
});

test('analyzeLogs includes safety notes', () => {
  const result = analyzeSolanaBuilderLogs('test');
  assert.ok(result.safetyNotes.length > 0);
  assert.ok(result.safetyNotes.some((n) => n.includes('heuristic')));
});
