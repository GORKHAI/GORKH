import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const stationPanel = 'apps/desktop/src/features/solana-workstation/agent/station/components/GorkhAgentStationPanel.tsx';
const chatPanel = 'apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentChatPanel.tsx';

test('Chat tab is default and primary in GORKH Agent Station', () => {
  const source = readFileSync(stationPanel, 'utf8');
  assert.match(source, /id:\s*'chat', label:\s*'Chat'/);
  assert.match(source, /useState<StationTab>\(\s*'chat'\s*\)/);
  assert.match(source, /GorkhAgentChatPanel/);
});

test('chat UI source includes composer, quick prompts, safety banner, and tool cards', () => {
  for (const file of [
    chatPanel,
    'apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentComposer.tsx',
    'apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentQuickPrompts.tsx',
    'apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentChatSafetyBanner.tsx',
    'apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentToolCard.tsx',
  ]) {
    assert.ok(existsSync(file), `missing ${file}`);
  }
  const combined = [
    readFileSync(chatPanel, 'utf8'),
    readFileSync('apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentComposer.tsx', 'utf8'),
    readFileSync('apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentQuickPrompts.tsx', 'utf8'),
    readFileSync('apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentChatSafetyBanner.tsx', 'utf8'),
    readFileSync('apps/desktop/src/features/solana-workstation/agent/station/chat/components/GorkhAgentToolCard.tsx', 'utf8'),
  ].join('\n');
  assert.match(combined, /gorkh-agent-chat-composer/);
  assert.match(combined, /Check my wallet/);
  assert.match(combined, /Prepare Cloak private send/);
  assert.match(combined, /Prepare Zerion DCA proposal/);
  assert.match(combined, /cannot sign or execute transactions from chat/i);
  assert.match(combined, /gorkh-agent-tool-card/);
  assert.doesNotMatch(combined, /Telegram|WhatsApp|Discord/i);
  assert.doesNotMatch(combined, /runs after the app quits/i);
});
