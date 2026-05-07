import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyAgentChatIntent,
  createDefaultAgentChatSettings,
  loadAgentChatStorageState,
  planAgentChatWithLlm,
  runAgentChatTurn,
} from '../apps/desktop/src/features/solana-workstation/agent/station/chat/index.ts';
import {
  createEmptyGorkhAgentStationState,
  GorkhAgentTaskKind,
} from '../packages/shared/dist/index.js';

test('deterministic chat classifier maps requested prompts', () => {
  assert.equal(classifyAgentChatIntent('check my wallet').intentKind, GorkhAgentTaskKind.PORTFOLIO_ANALYSIS);
  assert.equal(classifyAgentChatIntent('portfolio balance').intentKind, GorkhAgentTaskKind.PORTFOLIO_ANALYSIS);
  assert.equal(classifyAgentChatIntent('analyze token mint').intentKind, GorkhAgentTaskKind.TOKEN_ANALYSIS);
  assert.equal(classifyAgentChatIntent('explain transaction').intentKind, GorkhAgentTaskKind.TRANSACTION_REVIEW);
  assert.equal(classifyAgentChatIntent('private Cloak send').intentKind, GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT);
  assert.equal(classifyAgentChatIntent('Zerion DCA SOL USDC').intentKind, GorkhAgentTaskKind.ZERION_DCA_PROPOSAL);
  assert.equal(classifyAgentChatIntent('builder logs').intentKind, GorkhAgentTaskKind.BUILDER_REVIEW);
  assert.equal(classifyAgentChatIntent('context bundle').intentKind, GorkhAgentTaskKind.CONTEXT_SUMMARY);
  assert.equal(classifyAgentChatIntent('what can you do safely').intentKind, GorkhAgentTaskKind.GENERAL_PLANNING);
});

test('chat turn creates user message, agent reply, audit event, and tool card', async () => {
  const station = createEmptyGorkhAgentStationState(1700000000000);
  const chat = loadAgentChatStorageState();
  const result = await runAgentChatTurn({
    stationState: station,
    chatState: chat,
    userText: 'Check my wallet.',
    moduleContext: { walletWorkspace: null, marketsWorkspace: null, lastModuleContext: null },
  });
  const thread = result.chatState.threads[0];
  assert.equal(thread.messages.length, 2);
  assert.equal(thread.messages[0].role, 'user');
  assert.equal(thread.messages[1].role, 'agent');
  assert.ok(result.stationState.audit.length > station.audit.length);
  assert.ok(Object.values(result.chatState.toolCardsByMessageId).flat().some((card) => card.kind === 'wallet_summary'));
});

test('blocked chat request does not execute transactions and produces blocked reply', async () => {
  const result = await runAgentChatTurn({
    stationState: createEmptyGorkhAgentStationState(1700000000000),
    chatState: loadAgentChatStorageState(),
    userText: 'Execute Zerion swap now without approval.',
    moduleContext: {},
  });
  assert.equal(result.run.status, 'blocked');
  assert.match(result.chatState.threads[0].messages.at(-1).content, /blocked/i);
  assert.ok(Object.values(result.chatState.toolCardsByMessageId).flat().some((card) => card.kind === 'policy_block'));
});

test('LLM bridge is disabled by default', async () => {
  const settings = createDefaultAgentChatSettings();
  const result = await planAgentChatWithLlm(settings, {
    markdown: 'safe context',
    sources: ['agent_station'],
    redactionsApplied: [],
    excludedSources: [],
    warnings: [],
    localOnly: true,
  }, 'check wallet');
  assert.equal(settings.allowLlmPlanning, false);
  assert.equal(result.used, false);
  assert.match(result.reason, /disabled/i);
});
