import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgentContextBundle } from '../apps/desktop/src/features/solana-workstation/agent/station/agentContextTools.ts';
import { createEmptyGorkhAgentStationState } from '../packages/shared/dist/index.js';

test('context bundle includes safe summaries and excludes sensitive memory entries', () => {
  const state = createEmptyGorkhAgentStationState(1700000000000);
  const bundle = createAgentContextBundle({
    profile: state.profile,
    runtime: state.runtime,
    policy: state.policy,
    tasks: [
      {
        id: 'task-1',
        title: 'Check wallet',
        userIntent: 'check my wallet',
        kind: 'portfolio_analysis',
        status: 'completed',
        riskLevel: 'low',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ],
    proposals: [],
    approvals: [],
    audit: [],
    memory: [
      {
        id: 'mem-safe',
        kind: 'observation',
        title: 'Safe note',
        content: 'Wallet has a snapshot.',
        tags: [],
        source: 'test',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        localOnly: true,
        sensitive: false,
      },
      {
        id: 'mem-sensitive',
        kind: 'observation',
        title: 'Do not export',
        content: 'privateKey should never leave memory',
        tags: [],
        source: 'test',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        localOnly: true,
        sensitive: true,
      },
    ],
    walletResult: {
      selectedProfileLabel: 'Read-only main',
      network: 'mainnet-beta',
      hasSnapshot: true,
      solBalanceUi: '0.42',
      tokenAccountCount: 2,
      warnings: [],
      source: 'wallet_workspace',
      localOnly: true,
    },
    marketsResult: {
      watchlistCount: 1,
      selectedItems: [],
      availableProviderContexts: [],
      sampleDataPresent: false,
      birdeyeContextPresent: false,
      warnings: [],
      source: 'markets_workspace',
      localOnly: true,
    },
    cloakHandoffs: [],
    zerionHandoffs: [],
  });

  assert.equal(bundle.localOnly, true);
  assert.match(bundle.markdown, /Wallet Summary/);
  assert.match(bundle.markdown, /Markets Summary/);
  assert.match(bundle.markdown, /Safe note/);
  assert.doesNotMatch(bundle.markdown, /Do not export|privateKey should never leave memory/);
  assert.ok(bundle.redactionsApplied.includes('memory.sensitive'));
  assert.ok(bundle.redactionsApplied.includes('agent.privateKeys'));
});

test('context bundle refuses forbidden handoff-shaped fields', () => {
  const state = createEmptyGorkhAgentStationState(1700000000000);
  assert.throws(
    () =>
      createAgentContextBundle({
        profile: state.profile,
        runtime: state.runtime,
        policy: state.policy,
        tasks: [],
        proposals: [],
        approvals: [],
        audit: [],
        memory: [],
        cloakHandoffs: [
          {
            id: 'bad',
            draftKind: 'cloak_private_send',
            targetModule: 'wallet_cloak',
            executionBlocked: true,
            handoffStatus: 'blocked',
            warnings: [],
            createdAt: 1700000000000,
            localOnly: true,
            viewingKey: 'forbidden',
          },
        ],
      }),
    /forbidden field/
  );
});
