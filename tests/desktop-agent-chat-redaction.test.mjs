import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoSensitiveAgentChatContent,
  findForbiddenAgentChatContent,
  normalizeAgentChatStorageState,
  redactAgentChatText,
} from '../apps/desktop/src/features/solana-workstation/agent/station/chat/index.ts';

test('chat redaction rejects forbidden secret keys', () => {
  for (const key of ['privateKey', 'seedPhrase', 'walletJson', 'cloakNoteSecret', 'viewingKey', 'apiKey', 'zerionToken', 'agentToken']) {
    assert.equal(findForbiddenAgentChatContent({ [key]: 'secret' }), key);
    assert.throws(() => assertNoSensitiveAgentChatContent({ [key]: 'secret' }), /refused sensitive content/);
  }
});

test('chat redaction rejects obvious secret-like values', () => {
  assert.equal(findForbiddenAgentChatContent({ value: 'zk_1234567890abcdef' }), 'secret_like_value');
  assert.equal(findForbiddenAgentChatContent({ value: 'sk_1234567890abcdef1234567890' }), 'secret_like_value');
  assert.equal(findForbiddenAgentChatContent({ value: 'BEGIN PRIVATE KEY' }), 'secret_like_value');
  assert.equal(findForbiddenAgentChatContent({ keypair: Array.from({ length: 64 }, (_, i) => i) }), 'keypair');
});

test('chat redaction caps message content and normalizes storage caps', () => {
  const redacted = redactAgentChatText(`privateKey=abc ${'x'.repeat(9000)}`);
  assert.ok(redacted.text.length <= 8000);
  assert.ok(redacted.redactionsApplied.includes('secret_like_value') || redacted.redactionsApplied.includes('privateKey'));

  const raw = {
    threads: Array.from({ length: 25 }, (_, index) => ({
      id: `thread-${index}`,
      title: `Thread ${index}`,
      createdAt: index + 1,
      updatedAt: index + 1,
      status: 'active',
      messages: Array.from({ length: 250 }, (_, i) => ({
        id: `msg-${index}-${i}`,
        threadId: `thread-${index}`,
        role: 'user',
        content: 'hello',
        createdAt: i + 1,
        status: 'completed',
        relatedToolCallIds: [],
        safetyNotes: [],
        redactionsApplied: [],
        localOnly: true,
      })),
      localOnly: true,
    })),
  };
  const normalized = normalizeAgentChatStorageState(raw);
  assert.equal(normalized.threads.length, 20);
  assert.equal(normalized.threads.at(-1).messages.length, 200);
});
