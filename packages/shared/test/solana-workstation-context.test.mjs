import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaWorkstationContextSource,
  SolanaWorkstationContextFormat,
  SolanaWorkstationContextSensitivity,
  SolanaWorkstationContextReferenceKind,
  SolanaWorkstationBridgeActionKind,
  SolanaWorkstationContextBundleSchema,
  SolanaWorkstationContextReferenceSchema,
  SolanaWorkstationBridgeActionResultSchema,
  SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES,
  SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS,
  isSolanaWorkstationContextSource,
  isSolanaWorkstationBridgeActionKind,
  getBridgeActionKindLabel,
} from '../dist/index.js';

test('SolanaWorkstationContextBundle schema accepts a valid bundle', () => {
  const now = Date.now();
  const valid = {
    id: 'bundle-test',
    title: 'Test Bundle',
    description: 'A test context bundle',
    format: 'markdown',
    sources: ['agent', 'builder'],
    references: [
      {
        id: 'ref-1',
        kind: 'agent_profile',
        source: 'agent',
        title: 'Agent Profile',
        summary: 'Test agent',
        createdAt: now,
        sensitivity: 'redacted_safe_summary',
        localOnly: true,
        safetyNotes: ['Safe'],
      },
    ],
    markdown: '# Test',
    jsonPreview: '{}',
    createdAt: now,
    localOnly: true,
    redactionsApplied: ['secret_keywords'],
    safetyNotes: ['Safe'],
  };
  const result = SolanaWorkstationContextBundleSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('Context references require localOnly boolean', () => {
  const now = Date.now();
  const valid = {
    id: 'ref-1',
    kind: 'agent_profile',
    source: 'agent',
    title: 'Agent Profile',
    summary: 'Test',
    createdAt: now,
    sensitivity: 'redacted_safe_summary',
    localOnly: true,
    safetyNotes: [],
  };
  assert.ok(SolanaWorkstationContextReferenceSchema.safeParse(valid).success);

  const invalid = { ...valid, localOnly: 'yes' };
  assert.ok(!SolanaWorkstationContextReferenceSchema.safeParse(invalid).success);
});

test('Context safety notes include no auto-send/no execution', () => {
  assert.ok(
    SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES.some((n) => n.includes('auto-send')),
    'Should mention no auto-send'
  );
  assert.ok(
    SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES.some((n) => n.includes('signing') || n.includes('execution')),
    'Should mention no signing/execution'
  );
  assert.ok(
    SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES.some((n) => n.includes('Secret files')),
    'Should mention secret files exclusion'
  );
});

test('Redaction markers include secret/private/wallet exclusions', () => {
  assert.ok(SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS.some((m) => m.includes('redacted secret')));
  assert.ok(SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS.some((m) => m.includes('wallet path')));
  assert.ok(SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS.some((m) => m.includes('private key')));
  assert.ok(SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS.some((m) => m.includes('env file')));
});

test('Bridge action result schema accepts a successful prefill action', () => {
  const valid = {
    id: 'bridge-1',
    kind: 'prefill_shield_from_agent_draft',
    ok: true,
    message: 'Prefilled',
    createdAt: Date.now(),
    localOnly: true,
    warnings: [],
  };
  const result = SolanaWorkstationBridgeActionResultSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('Drift is not referenced in context constants', () => {
  const allText = [
    ...SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES,
    ...SOLANA_WORKSTATION_CONTEXT_REDACTION_MARKERS,
  ].join(' ').toLowerCase();
  assert.ok(!allText.includes('drift'), 'Drift must not appear in context constants');
});

test('isSolanaWorkstationContextSource validates correctly', () => {
  assert.ok(isSolanaWorkstationContextSource('agent'));
  assert.ok(isSolanaWorkstationContextSource('shield'));
  assert.ok(!isSolanaWorkstationContextSource('drift'));
  assert.ok(!isSolanaWorkstationContextSource(123));
});

test('isSolanaWorkstationBridgeActionKind validates correctly', () => {
  assert.ok(isSolanaWorkstationBridgeActionKind('copy_context'));
  assert.ok(isSolanaWorkstationBridgeActionKind('reject_agent_draft'));
  assert.ok(!isSolanaWorkstationBridgeActionKind('execute_transaction'));
});

test('getBridgeActionKindLabel returns human-readable labels', () => {
  assert.equal(getBridgeActionKindLabel('copy_context'), 'Copy Context');
  assert.equal(getBridgeActionKindLabel('prefill_shield_from_agent_draft'), 'Send to Shield');
  assert.equal(getBridgeActionKindLabel('reject_agent_draft'), 'Reject Draft');
});
