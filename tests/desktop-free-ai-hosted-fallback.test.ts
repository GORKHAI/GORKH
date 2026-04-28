import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop hosted Free AI helper resolves the authenticated OpenAI-compatible fallback binding', async () => {
  const imported = await import('../apps/desktop/src/lib/freeAiFallback.ts');

  const runtimeConfig = {
    httpBase: 'https://api.example.com',
    wsUrl: 'wss://api.example.com/ws',
    allowInsecureLocalhost: false,
    production: true,
  };

  assert.equal(
    imported.buildHostedFreeAiBaseUrl(runtimeConfig),
    'https://api.example.com/desktop/free-ai/v1',
    'desktop should point hosted Free AI traffic at the desktop-authenticated OpenAI-compatible API path'
  );

  assert.deepEqual(
    imported.resolveHostedFreeAiBinding(runtimeConfig, 'desktop-device-token'),
    {
      provider: 'openai_compat',
      baseUrl: 'https://api.example.com/desktop/free-ai/v1',
      model: 'gorkh-free-ai',
      apiKeyOverride: 'desktop-device-token',
      supportsVisionOverride: true,
    },
    'hosted Free AI should look like an OpenAI-compatible runtime with desktop bearer auth and vision enabled'
  );

  assert.equal(
    imported.canUseHostedFreeAiFallback({
      runtimeConfig,
      deviceToken: 'desktop-device-token',
      hostedFreeAiEnabled: true,
    }),
    true,
    'hosted Free AI should only be considered available when runtime config, device auth, and bootstrap readiness all agree'
  );
  assert.equal(
    imported.canUseHostedFreeAiFallback({
      runtimeConfig,
      deviceToken: 'desktop-device-token',
      hostedFreeAiEnabled: false,
    }),
    false,
    'hosted Free AI should stay disabled when desktop bootstrap readiness says it is unavailable'
  );

  assert.equal(
    imported.shouldRetryWithHostedFreeAiFallback({
      code: 'LOCAL_AI_COMPATIBILITY_ERROR',
      message: 'Free AI reached a Mac graphics compatibility problem inside the local AI service.',
    }),
    true,
    'known local compatibility failures should trigger hosted fallback'
  );

  assert.equal(
    imported.shouldRetryWithHostedFreeAiFallback({
      code: 'API_ERROR',
      message: 'Remote provider returned 500',
    }),
    false,
    'remote provider failures should not recursively trigger hosted fallback'
  );

  const originalFetch = globalThis.fetch;
  let captured:
    | {
        input: string;
        init: RequestInit | undefined;
      }
    | undefined;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    captured = {
      input: typeof input === 'string' ? input : input.toString(),
      init,
    };

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 'gorkh-free-ai' }],
      }),
    } as Response;
  }) as typeof fetch;

  try {
    await imported.testHostedFreeAiFallback(runtimeConfig, 'desktop-device-token');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    captured?.input,
    'https://api.example.com/desktop/free-ai/v1/models',
    'desktop hosted fallback test should hit the authenticated models route for a lightweight health check'
  );
  assert.match(
    String((captured?.init?.headers as Record<string, string> | undefined)?.Authorization),
    /^Bearer desktop-device-token$/,
    'desktop hosted fallback test should authenticate with the desktop device token'
  );
});

test('desktop app and local-compatible provider keep a hosted Free AI execution path with vision enabled', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
  const aiAssistSource = readFileSync('apps/desktop/src/lib/aiAssist.ts', 'utf8');
  const assistantEngineSource = readFileSync('apps/desktop/src/lib/assistantEngine.ts', 'utf8');
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');
  const openAiCompatSource = readFileSync('apps/desktop/src-tauri/src/llm/openai_compat.rs', 'utf8');

  assert.match(
    appSource,
    /resolveHostedFreeAiBinding|shouldRetryWithHostedFreeAiFallback|canUseHostedFreeAiFallback/,
    'App.tsx should resolve and retry through the hosted Free AI fallback path'
  );

  assert.match(
    appSource,
    /desktopBootstrap\?\.readiness\.hostedFreeAiEnabled[\s\S]{0,400}canUseHostedFreeAiFallback|canUseHostedFreeAiFallback[\s\S]{0,400}desktopBootstrap\?\.readiness\.hostedFreeAiEnabled/,
    'App.tsx should gate hosted fallback routing on explicit bootstrap readiness instead of only checking runtime config and device token'
  );

  assert.doesNotMatch(
    appSource,
    /runtimeConfig\s*&&\s*sessionDeviceToken[\s\S]{0,200}resolveManagedLocalTaskBinding\([^\)]*result\.goal[^\)]*\)[\s\S]{0,120}\.requiresVisionBoost[\s\S]{0,120}return 'hosted_free_ai'/,
    'App.tsx should not route tasks onto hosted fallback solely because runtime config and a device token exist'
  );

  assert.match(
    aiAssistSource,
    /apiKeyOverride|supportsVisionOverride/,
    'legacy AI Assist runtime settings should accept hosted fallback auth and vision overrides'
  );

  assert.match(
    assistantEngineSource,
    /providerApiKey|providerSupportsVision/,
    'advanced assistant engine should pass hosted fallback auth and vision flags into the Rust agent'
  );

  assert.match(
    openAiCompatSource,
    /screenshot_png_base64|image_url/,
    'OpenAI-compatible Rust provider should support vision and screenshot passing for hosted backends'
  );

  assert.match(
    openAiCompatSource,
    /create_http_client/,
    'OpenAI-compatible Rust provider should use a shared HTTP client constructor for hosted backends'
  );
});
