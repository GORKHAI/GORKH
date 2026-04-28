import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop GORKH Free provider is configured with no local setup required', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  const def = getLlmProviderDefinition('gorkh_free');
  assert.equal(def.provider, 'gorkh_free');
  assert.equal(def.requiresApiKey, false);
  assert.equal(def.paid, false);
  assert.match(def.setupHint, /no setup needed|hosted/i);
});

test('desktop retail shell presents GORKH Free as the default onboarding path', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');

  assert.match(
    appSource,
    /gorkh_free|GORKH AI|Free tier/i,
    'main desktop onboarding should present GORKH Free as the default provider'
  );
  assert.match(
    appSource,
    /Settings|Advanced/i,
    'technical details should move behind an explicit Settings or Advanced section'
  );
  assert.doesNotMatch(
    appSource,
    /brew|ollama pull|manual install/i,
    'retail onboarding should not direct users to manual Ollama installation'
  );

  assert.match(
    settingsSource,
    /Restart to update|Downloading update|Preparing update/i,
    'desktop settings should surface background updater progress and restart-to-update copy'
  );
});

test('desktop retail onboarding reserves approval and recovery language for chat-owned setup', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');

  assert.doesNotMatch(
    appSource,
    /brew|ollama pull|manual install/i,
    'retail onboarding should not direct users to manual Ollama installation'
  );
});
