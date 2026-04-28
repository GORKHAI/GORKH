import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getProviderStatus,
  subscribe,
  setActiveProvider,
  refresh,
  notifyKeyChanged,
  __setInvokeForTesting,
  __resetForTesting,
} from './providerStatus.js';

function createMockInvoke(
  keychain: Record<string, string | undefined> = {},
  localAiRunning = false
) {
  return async <T>(cmd: string, args?: unknown): Promise<T> => {
    switch (cmd) {
      case 'has_llm_api_key': {
        const provider = (args as Record<string, unknown> | undefined)?.provider as string ?? '';
        const has = Boolean(keychain[`llm_api_key:${provider}`]);
        return has as T;
      }
      case 'local_ai_status': {
        return {
          runtimeRunning: localAiRunning,
          targetModelAvailable: localAiRunning,
          selectedModel: localAiRunning ? 'qwen2.5:1.5b' : null,
          externalServiceDetected: false,
        } as T;
      }
      default:
        throw new Error(`Unexpected invoke: ${cmd}`);
    }
  };
}

test('refresh marks providers with saved keys as configured', async () => {
  __resetForTesting();
  __setInvokeForTesting(
    createMockInvoke({
      'llm_api_key:claude': 'sk-ant-xxx',
      'llm_api_key:openai': 'sk-xxx',
    })
  );

  await refresh();

  const status = getProviderStatus();
  assert.equal(status.configured.claude, true);
  assert.equal(status.configured.openai, true);
  assert.equal(status.configured.deepseek, false);
});

test('notifyKeyChanged updates a single provider without full refresh', async () => {
  __resetForTesting();
  __setInvokeForTesting(
    createMockInvoke({
      'llm_api_key:deepseek': 'sk-deepseek-xxx',
    })
  );

  // Start from a known state where deepseek is NOT configured
  await refresh();
  assert.equal(getProviderStatus().configured.deepseek, true);

  // Now simulate clearing the key by changing the mock
  __setInvokeForTesting(createMockInvoke({}));
  await notifyKeyChanged('deepseek');

  assert.equal(getProviderStatus().configured.deepseek, false);
});

test('activeConfigured reflects the active provider', async () => {
  __resetForTesting();
  __setInvokeForTesting(
    createMockInvoke({
      'llm_api_key:deepseek': 'sk-deepseek-xxx',
    })
  );

  setActiveProvider('deepseek');
  await refresh();

  const status = getProviderStatus();
  assert.equal(status.activeProvider, 'deepseek');
  assert.equal(status.activeConfigured, true);

  // Switch to a provider with no key
  setActiveProvider('claude');
  const status2 = getProviderStatus();
  assert.equal(status2.activeProvider, 'claude');
  assert.equal(status2.activeConfigured, false);
});

test('subscribe receives immediate snapshot and updates', async () => {
  __resetForTesting();
  __setInvokeForTesting(
    createMockInvoke({
      'llm_api_key:openai': 'sk-xxx',
    })
  );

  const snapshots: ReturnType<typeof getProviderStatus>[] = [];
  const unsubscribe = subscribe((state) => {
    snapshots.push(state);
  });

  // Initial emission
  assert.equal(snapshots.length, 1);

  await refresh();

  // Should have received updates
  assert.ok(snapshots.length > 1);
  assert.equal(snapshots[snapshots.length - 1].configured.openai, true);

  unsubscribe();
});

test('local AI provider is configured when runtime is running', async () => {
  __resetForTesting();
  __setInvokeForTesting(createMockInvoke({}, true));

  await refresh();

  assert.equal(getProviderStatus().configured.native_qwen_ollama, true);
});

test('local AI provider is not configured when runtime is down', async () => {
  __resetForTesting();
  __setInvokeForTesting(createMockInvoke({}, false));

  await refresh();

  assert.equal(getProviderStatus().configured.native_qwen_ollama, false);
});
