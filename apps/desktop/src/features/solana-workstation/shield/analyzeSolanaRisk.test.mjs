import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeSolanaRisk } from './analyzeSolanaRisk.js';
import { SolanaTransactionFormat, SolanaShieldInputKind } from '@gorkh/shared';

function makeDecoded(overrides = {}) {
  return {
    inputKind: SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64,
    format: SolanaTransactionFormat.LEGACY,
    signatureCount: 0,
    requiredSignatureCount: 1,
    signatures: [],
    recentBlockhash: '11111111111111111111111111111111',
    accountKeys: ['11111111111111111111111111111111', '22222222222222222222222222222222'],
    instructions: [
      {
        index: 0,
        programId: '11111111111111111111111111111111',
        programName: 'System Program',
        programCategory: 'system',
        accountIndexes: [0, 1],
        accounts: [
          { index: 0, address: '11111111111111111111111111111111', isSigner: true, isWritable: true, source: 'static' },
          { index: 1, address: '22222222222222222222222222222222', isSigner: false, isWritable: true, source: 'static' },
        ],
        dataBase64: '',
        dataLength: 0,
        isKnownProgram: true,
      },
    ],
    addressTableLookups: [],
    warnings: [],
    ...overrides,
  };
}

test('analyzeSolanaRisk flags no signatures as high', () => {
  const decoded = makeDecoded({ signatureCount: 0, requiredSignatureCount: 2 });
  const findings = analyzeSolanaRisk(decoded);
  const noSig = findings.find((f) => f.id === 'no_signatures');
  assert.ok(noSig, 'should flag no signatures');
  assert.equal(noSig.level, 'high');
});

test('analyzeSolanaRisk flags partial signatures as medium', () => {
  const decoded = makeDecoded({ signatureCount: 1, requiredSignatureCount: 2 });
  const findings = analyzeSolanaRisk(decoded);
  const partial = findings.find((f) => f.id === 'partial_signatures');
  assert.ok(partial, 'should flag partial signatures');
  assert.equal(partial.level, 'medium');
});

test('analyzeSolanaRisk does not flag when signatures are complete', () => {
  const decoded = makeDecoded({ signatureCount: 1, requiredSignatureCount: 1 });
  const findings = analyzeSolanaRisk(decoded);
  assert.ok(!findings.find((f) => f.id === 'no_signatures'));
  assert.ok(!findings.find((f) => f.id === 'partial_signatures'));
});

test('analyzeSolanaRisk flags unknown program IDs as medium', () => {
  const decoded = makeDecoded({
    instructions: [
      {
        index: 0,
        programId: 'UnknownProgramId111111111111111111111111111',
        programName: 'Unknown Program',
        programCategory: 'unknown',
        accountIndexes: [0],
        accounts: [{ index: 0, address: '11111111111111111111111111111111', isSigner: true, isWritable: true, source: 'static' }],
        dataBase64: '',
        dataLength: 0,
        isKnownProgram: false,
      },
    ],
  });
  const findings = analyzeSolanaRisk(decoded);
  const unknownProg = findings.find((f) => f.id === 'unknown_programs');
  assert.ok(unknownProg, 'should flag unknown programs');
  assert.equal(unknownProg.level, 'medium');
});

test('analyzeSolanaRisk does not flag known core programs as unknown', () => {
  const decoded = makeDecoded();
  const findings = analyzeSolanaRisk(decoded);
  assert.ok(!findings.find((f) => f.id === 'unknown_programs'));
});

test('analyzeSolanaRisk flags many writable accounts as medium', () => {
  const accounts = Array.from({ length: 10 }, (_, i) => ({
    index: i,
    address: `Account${i}111111111111111111111111111111`,
    isSigner: i === 0,
    isWritable: true,
    source: 'static',
  }));
  const decoded = makeDecoded({
    accountKeys: accounts.map((a) => a.address),
    instructions: [
      {
        index: 0,
        programId: '11111111111111111111111111111111',
        programName: 'System Program',
        programCategory: 'system',
        accountIndexes: accounts.map((a) => a.index),
        accounts,
        dataBase64: '',
        dataLength: 0,
        isKnownProgram: true,
      },
    ],
  });
  const findings = analyzeSolanaRisk(decoded);
  const manyWritable = findings.find((f) => f.id === 'many_writable_accounts');
  assert.ok(manyWritable, 'should flag many writable accounts');
  assert.equal(manyWritable.level, 'medium');
});

test('analyzeSolanaRisk flags many instructions as low', () => {
  const instructions = Array.from({ length: 6 }, (_, i) => ({
    index: i,
    programId: '11111111111111111111111111111111',
    programName: 'System Program',
    programCategory: 'system',
    accountIndexes: [0],
    accounts: [{ index: 0, address: '11111111111111111111111111111111', isSigner: true, isWritable: true, source: 'static' }],
    dataBase64: '',
    dataLength: 0,
    isKnownProgram: true,
  }));
  const decoded = makeDecoded({ instructions });
  const findings = analyzeSolanaRisk(decoded);
  const manyIx = findings.find((f) => f.id === 'many_instructions');
  assert.ok(manyIx, 'should flag many instructions');
  assert.equal(manyIx.level, 'low');
});

test('analyzeSolanaRisk flags address lookup tables as low', () => {
  const decoded = makeDecoded({
    addressTableLookups: [
      { accountKey: 'LookupTable111111111111111111111111111', writableIndexes: [0], readonlyIndexes: [] },
    ],
  });
  const findings = analyzeSolanaRisk(decoded);
  const alt = findings.find((f) => f.id === 'address_lookup_tables');
  assert.ok(alt, 'should flag address lookup tables');
  assert.equal(alt.level, 'low');
});
