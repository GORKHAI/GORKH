import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveAgentChatToolCardHandoff,
  runAgentChatTurn,
} from '../apps/desktop/src/features/solana-workstation/agent/station/chat/index.ts';
import { createEmptyGorkhAgentStationState } from '../packages/shared/dist/index.js';

test('chat creates Cloak, Zerion, and Shield handoff metadata without auto execution', async () => {
  for (const [prompt, expected] of [
    ['Prepare a Cloak private send for 0.02 SOL.', 'cloak_handoff'],
    ['Prepare Zerion DCA SOL to USDC.', 'zerion_handoff'],
    ['Explain this transaction.', 'shield_handoff'],
  ]) {
    const result = await runAgentChatTurn({
      stationState: createEmptyGorkhAgentStationState(1700000000000),
      chatState: {
        threads: [{
          id: 'thread-1',
          title: 'GORKH Agent Chat',
          createdAt: 1,
          updatedAt: 1,
          status: 'active',
          messages: [],
          localOnly: true,
        }],
        activeThreadId: 'thread-1',
        toolCardsByMessageId: {},
        runs: [],
        redactedContextSummaries: {},
        settings: {
          plannerMode: 'deterministic',
          allowLlmPlanning: false,
          requireRedactedContext: true,
          maxContextChars: 12000,
          includeWalletContext: true,
          includeMarketsContext: true,
          includeShieldContext: true,
          includeBuilderContext: true,
          includeMemoryContext: true,
        },
        updatedAt: 1,
        localOnly: true,
      },
      userText: prompt,
      moduleContext: {},
    });
    const cards = Object.values(result.chatState.toolCardsByMessageId).flat();
    const card = cards.find((candidate) => candidate.kind === expected);
    assert.ok(card, `missing ${expected}`);
    assert.equal(card.relatedHandoffEntryId, result.manualRunResult?.handoffEntry?.id);
    assert.equal(result.manualRunResult?.proposal.executionBlocked, true);
  }
});

test('chat handoff cards resolve durable payloads from handoff entries after reload', async () => {
  const result = await runAgentChatTurn({
    stationState: createEmptyGorkhAgentStationState(1700000000000),
    chatState: {
      threads: [{
        id: 'thread-1',
        title: 'GORKH Agent Chat',
        createdAt: 1,
        updatedAt: 1,
        status: 'active',
        messages: [],
        localOnly: true,
      }],
      activeThreadId: 'thread-1',
      toolCardsByMessageId: {},
      runs: [],
      redactedContextSummaries: {},
      settings: {
        plannerMode: 'deterministic',
        allowLlmPlanning: false,
        requireRedactedContext: true,
        maxContextChars: 12000,
        includeWalletContext: true,
        includeMarketsContext: true,
        includeShieldContext: true,
        includeBuilderContext: true,
        includeMemoryContext: true,
      },
      updatedAt: 1,
      localOnly: true,
    },
    userText: 'Prepare a Cloak private send for 0.02 SOL.',
    moduleContext: {},
  });
  const card = Object.values(result.chatState.toolCardsByMessageId).flat().find((candidate) => candidate.kind === 'cloak_handoff');
  assert.ok(card);
  assert.ok(result.manualRunResult?.handoffEntry);
  const resolved = resolveAgentChatToolCardHandoff(card, [result.manualRunResult.handoffEntry]);
  assert.equal(resolved?.kind, 'cloak_handoff');
  assert.equal(resolved?.cloakHandoff.id, result.manualRunResult.cloakHandoff.id);
});
