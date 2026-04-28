import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop defaults to GORKH Free hosted tier for the main assistant flow', async () => {
  let imported: typeof import('../apps/desktop/src/lib/llmConfig.ts');
  try {
    imported = await import('../apps/desktop/src/lib/llmConfig.ts');
  } catch {
    assert.fail('llmConfig helper should exist for shared desktop provider defaults');
    return;
  }

  assert.equal(imported.DEFAULT_NEW_USER_PROVIDER, 'gorkh_free');
  assert.deepEqual(imported.getLlmDefaults('gorkh_free'), {
    provider: 'gorkh_free',
    baseUrl: '',
    model: 'deepseek-chat',
  });
  assert.equal(imported.providerRequiresApiKey('gorkh_free'), false);
  assert.equal(imported.providerRequiresApiKey('openai'), true);
});

test('desktop source makes GORKH Free the obvious default instead of OpenAI', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.match(appSource, /DEFAULT_NEW_USER_PROVIDER/, 'desktop app should source its default provider from the shared desktop llm config');
  assert.match(
    settingsSource,
    /GORKH AI|gorkh_free/i,
    'desktop settings should present GORKH Free as a real provider option'
  );
  assert.match(
    llmConfigSource,
    /GORKH AI|hosted|no setup needed/i,
    'GORKH Free provider copy should describe the hosted free tier'
  );
});
