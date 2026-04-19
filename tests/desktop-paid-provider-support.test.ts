import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop launch-facing provider list exposes only launch-ready providers', async () => {
  let imported: typeof import('../apps/desktop/src/lib/llmConfig.ts');
  try {
    imported = await import('../apps/desktop/src/lib/llmConfig.ts');
  } catch {
    assert.fail('shared llmConfig helper should exist');
    return;
  }

  const launchProviders = imported.getSupportedLlmProviders().map((provider) => provider.provider);
  assert.deepEqual(launchProviders, ['native_qwen_ollama', 'openai', 'claude']);

  const paidProviders = imported
    .getSupportedLlmProviders()
    .filter((provider) => provider.paid)
    .map((provider) => provider.provider);

  assert.deepEqual(paidProviders, ['openai', 'claude']);
  assert.equal(imported.providerRequiresApiKey('openai'), true);
  assert.equal(imported.providerRequiresApiKey('claude'), true);
  assert.equal(imported.providerRequiresApiKey('deepseek'), true);
  assert.equal(imported.providerRequiresApiKey('minimax'), true);
  assert.equal(imported.providerRequiresApiKey('kimi'), true);

  assert.equal(imported.getLlmRuntimeProvider('claude'), 'claude');
  assert.equal(imported.getLlmRuntimeProvider('deepseek'), 'openai_compat');
  assert.equal(imported.getLlmRuntimeProvider('minimax'), 'openai_compat');
  assert.equal(imported.getLlmRuntimeProvider('kimi'), 'openai_compat');

  assert.equal(imported.getLlmDefaults('openai').baseUrl, 'https://api.openai.com/v1');
  assert.equal(imported.getLlmDefaults('openai_compat').baseUrl, 'http://127.0.0.1:8000');
  assert.equal(imported.getLlmDefaults('deepseek').baseUrl, 'https://api.deepseek.com');
});

test('desktop settings demotes non-launch compatibility providers from the beta menu', () => {
  const source = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');

  assert.match(source, /Free AI runs locally on your Mac when possible/i);
  assert.match(source, /Advanced provider/i);
  assert.match(source, /hidden from the main provider menu/i);
});
