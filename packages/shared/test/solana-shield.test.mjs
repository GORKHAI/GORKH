import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SOLANA_CORE_PROGRAMS,
  TRUSTED_SOLANA_PROTOCOLS,
  getKnownProgram,
  classifyProgram,
  getProgramDisplayName,
  isTrustedProtocol,
  getTrustedProtocol,
  SolanaKnownProgramCategory,
  SolanaShieldInputKindSchema,
  SolanaShieldAnalysisSchema,
} from '../dist/index.js';

test('SOLANA_CORE_PROGRAMS contains verified core program IDs', () => {
  assert.ok(SOLANA_CORE_PROGRAMS.length > 0, 'should have core programs');

  const system = getKnownProgram('11111111111111111111111111111111');
  assert.ok(system, 'System Program should be known');
  assert.equal(system.name, 'System Program');
  assert.equal(system.category, SolanaKnownProgramCategory.SYSTEM);
  assert.equal(system.safetyLabel, 'known_core');

  const token = getKnownProgram('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  assert.ok(token, 'Token Program should be known');
  assert.equal(token.name, 'SPL Token Program');

  const token2022 = getKnownProgram('TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q');
  assert.ok(token2022, 'Token-2022 should be known');

  const alt = getKnownProgram('AddressLookupTab1e1111111111111111111111111');
  assert.ok(alt, 'Address Lookup Table Program should be known');

  const stake = getKnownProgram('Stake11111111111111111111111111111111111111');
  assert.ok(stake, 'Stake Program should be known');
});

test('classifyProgram categorizes known and unknown programs', () => {
  assert.equal(classifyProgram('11111111111111111111111111111111'), SolanaKnownProgramCategory.SYSTEM);
  assert.equal(classifyProgram('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), SolanaKnownProgramCategory.TOKEN);
  assert.equal(
    classifyProgram('UnknownProgramId111111111111111111111111111'),
    SolanaKnownProgramCategory.UNKNOWN
  );
});

test('getProgramDisplayName returns names for known programs', () => {
  assert.equal(getProgramDisplayName('11111111111111111111111111111111'), 'System Program');
  assert.equal(getProgramDisplayName('UnknownProgramId111111111111111111111111111'), 'Unknown Program');
});

test('TRUSTED_SOLANA_PROTOCOLS does not include Drift, HumanRail, or White Protocol', () => {
  const drift = TRUSTED_SOLANA_PROTOCOLS.find((p) => p.id === 'drift');
  assert.equal(drift, undefined, 'Drift should not be in trusted protocols');

  const humanrail = TRUSTED_SOLANA_PROTOCOLS.find((p) => p.id === 'humanrail');
  assert.equal(humanrail, undefined, 'HumanRail should not be in trusted protocols');

  const white = TRUSTED_SOLANA_PROTOCOLS.find((p) => p.id === 'white_protocol');
  assert.equal(white, undefined, 'White Protocol should not be in trusted protocols');

  const ids = TRUSTED_SOLANA_PROTOCOLS.map((p) => p.id);
  assert.ok(!ids.includes('drift'), 'drift id should not appear');
  assert.ok(!ids.includes('humanrail'), 'humanrail id should not appear');
  assert.ok(!ids.includes('white_protocol'), 'white_protocol id should not appear');
});

test('TRUSTED_SOLANA_PROTOCOLS includes expected protocols with clear status', () => {
  const squads = getTrustedProtocol('squads');
  assert.ok(squads, 'Squads should exist');
  assert.equal(squads.status, 'planned_draft_only');
  assert.equal(squads.category, 'multisig');
  assert.ok(squads.safetyNote.length > 0);

  const jupiter = getTrustedProtocol('jupiter');
  assert.ok(jupiter, 'Jupiter should exist');
  assert.equal(jupiter.status, 'planned_draft_only');

  const quicknode = getTrustedProtocol('quicknode');
  assert.ok(quicknode, 'QuickNode should exist');

  const blowfish = getTrustedProtocol('blowfish');
  assert.ok(blowfish, 'Blowfish should exist');

  const turnkey = getTrustedProtocol('turnkey');
  assert.ok(turnkey, 'Turnkey should exist');
});

test('isTrustedProtocol matches known protocol IDs and rejects excluded ones', () => {
  assert.ok(isTrustedProtocol('squads'));
  assert.ok(isTrustedProtocol('jupiter'));
  assert.ok(isTrustedProtocol('blowfish'));
  assert.ok(!isTrustedProtocol('drift'));
  assert.ok(!isTrustedProtocol('humanrail'));
  assert.ok(!isTrustedProtocol('white_protocol'));
  assert.ok(!isTrustedProtocol('unknown_protocol'));
});

test('SolanaShieldInputKindSchema accepts valid values', () => {
  const valid = SolanaShieldInputKindSchema.safeParse('serialized_transaction_base64');
  assert.ok(valid.success, 'should accept serialized_transaction_base64');
});

test('SolanaShieldInputKindSchema rejects invalid values', () => {
  const invalid = SolanaShieldInputKindSchema.safeParse('not_a_kind');
  assert.ok(!invalid.success, 'should reject invalid kind');
});

test('SolanaShieldAnalysisSchema accepts a valid sample analysis', () => {
  const sample = {
    input: 'test',
    inputKind: 'serialized_transaction_base64',
    riskFindings: [
      {
        id: 'test_finding',
        level: 'low',
        title: 'Test',
        description: 'A test finding.',
        recommendation: 'None.',
      },
    ],
    summary: 'Test summary.',
    safetyStatus: 'decode_only',
  };
  const result = SolanaShieldAnalysisSchema.safeParse(sample);
  assert.ok(result.success, 'should accept valid analysis');
});

test('all trusted protocols have safety notes', () => {
  for (const protocol of TRUSTED_SOLANA_PROTOCOLS) {
    assert.ok(protocol.safetyNote.length > 0, `${protocol.id} should have a safety note`);
  }
});
