import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoSensitiveAgentStationContent,
  AGENT_STATION_STORAGE_KEY,
} from '../apps/desktop/src/features/solana-workstation/agent/station/agentStationStorage.ts';
import {
  createMemoryEntry,
  detectSensitiveMemoryContent,
} from '../apps/desktop/src/features/solana-workstation/agent/station/agentMemory.ts';
import { createAgentStationContextSummary } from '../apps/desktop/src/features/solana-workstation/agent/station/createAgentContextSummary.ts';
import {
  createEmptyGorkhAgentStationState,
  GORKH_AGENT_TEMPLATES,
} from '../packages/shared/dist/index.js';

test('storage key is namespaced under gorkh.solana.agentStation.v1', () => {
  assert.equal(AGENT_STATION_STORAGE_KEY, 'gorkh.solana.agentStation.v1');
});

test('assertNoSensitiveAgentStationContent rejects payloads with private keys', () => {
  const samples = [
    { privateKey: 'abc' },
    { mnemonic: 'word ' },
    { seedPhrase: 'whatever' },
    { walletJson: '{}' },
    { cloakNoteSecret: 'x' },
    { viewingKey: 'y' },
    { apiKey: 'zk_abcdefghij' },
    { agentToken: 'something' },
  ];
  for (const value of samples) {
    assert.throws(() => assertNoSensitiveAgentStationContent(value), /must not contain/);
  }
});

test('assertNoSensitiveAgentStationContent accepts default station state', () => {
  const state = createEmptyGorkhAgentStationState(1700000000000);
  assert.doesNotThrow(() => assertNoSensitiveAgentStationContent(state));
});

test('detectSensitiveMemoryContent flags secret-like content', () => {
  assert.ok(detectSensitiveMemoryContent('here is my private key abc'));
  assert.ok(detectSensitiveMemoryContent('seed phrase: foo bar'));
  assert.ok(detectSensitiveMemoryContent('mnemonic: lorem ipsum'));
  assert.ok(detectSensitiveMemoryContent('viewing key shared'));
  assert.ok(detectSensitiveMemoryContent('note secret abc'));
  assert.ok(detectSensitiveMemoryContent('zk_abcdefghijk'));
  assert.equal(detectSensitiveMemoryContent('Wallet has 1.2 SOL'), null);
});

test('createMemoryEntry rejects sensitive content', () => {
  assert.throws(
    () =>
      createMemoryEntry({
        kind: 'observation',
        title: 'wallet',
        content: 'private key 1234567890',
      }),
    /sensitive/
  );
});

test('createMemoryEntry accepts safe content and stamps localOnly', () => {
  const entry = createMemoryEntry({
    kind: 'observation',
    title: 'safe',
    content: 'wallet has 0.5 SOL on devnet',
    tags: ['wallet', 'devnet'],
  });
  assert.equal(entry.localOnly, true);
  assert.equal(entry.kind, 'observation');
  assert.ok(Array.isArray(entry.tags));
});

test('context export redacts sensitive memory and includes templates', () => {
  const state = createEmptyGorkhAgentStationState(1700000000000);
  const summary = createAgentStationContextSummary({
    profile: state.profile,
    runtime: state.runtime,
    policy: state.policy,
    tasks: state.tasks,
    proposals: state.proposals,
    approvals: state.approvals,
    audit: state.audit,
    memory: [
      {
        id: 'm1',
        kind: 'observation',
        title: 'safe note',
        content: 'wallet snapshot read',
        tags: [],
        source: 'agent',
        createdAt: 0,
        updatedAt: 0,
        localOnly: true,
        sensitive: false,
      },
      {
        id: 'm2',
        kind: 'observation',
        title: 'redacted',
        content: 'placeholder',
        tags: [],
        source: 'agent',
        createdAt: 0,
        updatedAt: 0,
        localOnly: true,
        sensitive: true,
      },
    ],
    templates: GORKH_AGENT_TEMPLATES,
  });
  assert.match(summary.markdown, /GORKH Agent Station/);
  assert.match(summary.markdown, /sensitive memory entries excluded/);
  assert.match(summary.markdown, /Coming Soon/);
  assert.match(summary.markdown, /Blocked/);
  assert.ok(summary.redactionsApplied.includes('agent.privateKeys'));
  assert.ok(summary.redactionsApplied.includes('agent.cloakNoteSecrets'));
  assert.ok(summary.redactionsApplied.includes('agent.viewingKeys'));
  assert.ok(summary.redactionsApplied.includes('agent.zerionTokens'));
});
