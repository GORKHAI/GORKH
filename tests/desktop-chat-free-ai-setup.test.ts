import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop app does not gate chat tasks behind a local AI setup flow', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');

  assert.doesNotMatch(
    appSource,
    /brew|ollama pull|manual install/i,
    'the retail setup path should not tell users to manually install Ollama or use brew'
  );
});

test('desktop assistant conversation turn is reachable without local engine provisioning', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');

  assert.match(
    appSource,
    /assistantConversationTurn/,
    'App.tsx should still contain the assistantConversationTurn intake call'
  );
});
