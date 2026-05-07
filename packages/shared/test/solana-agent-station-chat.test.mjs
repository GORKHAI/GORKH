import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GORKH_AGENT_CHAT_SETTINGS,
  GORKH_AGENT_CHAT_FORBIDDEN_CONTENT_KEYS,
  GorkhAgentChatMessageSchema,
  GorkhAgentChatRedactedContextSchema,
  GorkhAgentChatRunSchema,
  GorkhAgentChatSettingsSchema,
  GorkhAgentChatThreadSchema,
  GorkhAgentChatToolCardSchema,
} from '../dist/index.js';

const now = 1700000000000;

test('chat message, thread, run, tool card, and redacted context schemas validate', () => {
  const message = {
    id: 'msg-1',
    threadId: 'thread-1',
    role: 'user',
    content: 'Check my wallet.',
    createdAt: now,
    status: 'completed',
    relatedToolCallIds: [],
    safetyNotes: [],
    redactionsApplied: [],
    localOnly: true,
  };
  assert.ok(GorkhAgentChatMessageSchema.safeParse(message).success);
  assert.ok(GorkhAgentChatThreadSchema.safeParse({
    id: 'thread-1',
    title: 'GORKH Agent Chat',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    messages: [message],
    localOnly: true,
  }).success);
  assert.ok(GorkhAgentChatRunSchema.safeParse({
    id: 'run-1',
    threadId: 'thread-1',
    userMessageId: 'msg-1',
    status: 'completed',
    intentKind: 'portfolio_analysis',
    toolCallIds: ['tool-1'],
    proposalIds: ['proposal-1'],
    auditEventIds: ['audit-1'],
    createdAt: now,
    completedAt: now,
  }).success);
  assert.ok(GorkhAgentChatToolCardSchema.safeParse({
    id: 'card-1',
    kind: 'wallet_summary',
    title: 'Wallet Summary',
    summary: 'Read local snapshot.',
    status: 'completed',
    targetModule: 'wallet',
    localOnly: true,
  }).success);
  assert.ok(GorkhAgentChatRedactedContextSchema.safeParse({
    markdown: '# context',
    sources: ['agent_station'],
    redactionsApplied: ['private_keys'],
    excludedSources: [],
    warnings: [],
    localOnly: true,
  }).success);
});

test('default chat settings are deterministic and LLM disabled', () => {
  const parsed = GorkhAgentChatSettingsSchema.safeParse(DEFAULT_GORKH_AGENT_CHAT_SETTINGS);
  assert.ok(parsed.success, parsed.error?.message);
  assert.equal(DEFAULT_GORKH_AGENT_CHAT_SETTINGS.plannerMode, 'deterministic');
  assert.equal(DEFAULT_GORKH_AGENT_CHAT_SETTINGS.allowLlmPlanning, false);
  assert.equal(DEFAULT_GORKH_AGENT_CHAT_SETTINGS.requireRedactedContext, true);
  assert.equal(DEFAULT_GORKH_AGENT_CHAT_SETTINGS.maxContextChars, 12000);
});

test('forbidden content list covers private, Cloak, and Zerion secrets', () => {
  for (const key of [
    'privateKey',
    'private_key',
    'seedPhrase',
    'seed_phrase',
    'mnemonic',
    'walletJson',
    'wallet_json',
    'keypair',
    'cloakNoteSecret',
    'cloak_note_secret',
    'viewingKey',
    'viewing_key',
    'apiKey',
    'api_key',
    'zerionToken',
    'zerion_token',
    'agentToken',
    'agent_token',
    'signaturePayload',
    'rawNote',
    'rawUtxo',
  ]) {
    assert.ok(GORKH_AGENT_CHAT_FORBIDDEN_CONTENT_KEYS.includes(key), `missing ${key}`);
  }
});
