import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('providerStatus treats gorkh_free as configured when signed in, regardless of build flag', async () => {
  // Import the module fresh so we can manipulate its internal state via test hooks
  const providerStatus = await import('../apps/desktop/src/state/providerStatus.ts');

  // Reset to known state
  providerStatus.__resetForTesting();

  // Without a session token, gorkh_free should NOT be configured
  let status = providerStatus.getProviderStatus();
  assert.equal(
    status.configured.gorkh_free,
    false,
    'gorkh_free should be unconfigured when no session token is set'
  );

  // Simulate sign-in by setting a session token
  providerStatus.setSessionToken('fake-desktop-device-token');

  // Allow async refresh to settle
  await new Promise((resolve) => setTimeout(resolve, 50));

  status = providerStatus.getProviderStatus();
  assert.equal(
    status.configured.gorkh_free,
    true,
    'gorkh_free should be configured when a session token is present'
  );

  // Simulate sign-out
  providerStatus.setSessionToken(null);
  await new Promise((resolve) => setTimeout(resolve, 50));

  status = providerStatus.getProviderStatus();
  assert.equal(
    status.configured.gorkh_free,
    false,
    'gorkh_free should become unconfigured after sign-out'
  );
});

test('providerStatus treats BYO providers as configured only when keychain has a key', async () => {
  const providerStatus = await import('../apps/desktop/src/state/providerStatus.ts');

  let capturedProvider: string | null = null;
  providerStatus.__setInvokeForTesting(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'has_llm_api_key') {
      capturedProvider = (args?.provider as string) ?? null;
      // Simulate: only openai has a key
      return capturedProvider === 'openai';
    }
    return undefined;
  });

  providerStatus.__resetForTesting();
  providerStatus.setSessionToken('fake-token');
  await providerStatus.refresh();

  const status = providerStatus.getProviderStatus();
  assert.equal(status.configured.openai, true, 'openai should be configured when keychain has key');
  assert.equal(status.configured.claude, false, 'claude should be unconfigured when keychain has no key');
  assert.equal(status.configured.deepseek, false, 'deepseek should be unconfigured when keychain has no key');
  assert.equal(status.configured.kimi, false, 'kimi should be unconfigured when keychain has no key');
  assert.equal(status.configured.minimax, false, 'minimax should be unconfigured when keychain has no key');
});

test('App.tsx default provider is gorkh_free for new users', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');

  assert.doesNotMatch(
    appSource,
    /getLlmDefaults\s*\(\s*FREE_AI_ENABLED\s*\?\s*DEFAULT_NEW_USER_PROVIDER\s*:\s*['"]openai['"]\s*\)/,
    'App.tsx must not gate the default provider on FREE_AI_ENABLED'
  );

  assert.match(
    appSource,
    /getLlmDefaults\s*\(\s*DEFAULT_NEW_USER_PROVIDER\s*\)/,
    'App.tsx must default to gorkh_free unconditionally'
  );
});

test('SettingsPanel tests gorkh_free through hosted fallback, not generic test_provider', () => {
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');

  assert.match(
    settingsSource,
    /if\s*\(\s*settings\.provider\s*===\s*['"]gorkh_free['"]\s*\)\s*\{[\s\S]{0,400}testHostedFreeAiFallback/,
    'SettingsPanel must test gorkh_free via testHostedFreeAiFallback, not test_provider'
  );

  assert.doesNotMatch(
    settingsSource,
    /settings\.provider\s*===\s*['"]gorkh_free['"]\s*\)\s*\{[\s\S]{0,200}invoke\s*\(\s*['"]test_provider['"]/,
    'SettingsPanel must not call test_provider for gorkh_free'
  );
});

test('SettingsPanel gorkh_free test returns sign-in message when not authenticated', () => {
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');

  assert.match(
    settingsSource,
    /!runtimeConfig\s*\|\|\s*!sessionDeviceToken[\s\S]{0,200}Sign in to use GORKH AI \(Free\)/,
    'SettingsPanel gorkh_free test must tell users to sign in when there is no device token'
  );
});

test('llmConfig.ts defines gorkh_free as not requiring an API key', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.match(
    llmConfigSource,
    /gorkh_free:[\s\S]{0,400}requiresApiKey:\s*false/,
    'gorkh_free provider definition must set requiresApiKey to false'
  );
});
