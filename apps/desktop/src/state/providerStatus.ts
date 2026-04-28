import { invoke } from '@tauri-apps/api/core';
import {
  ALL_PROVIDER_ORDER,
  FREE_AI_ENABLED,
  providerRequiresApiKey,
  type LlmProvider,
} from '../lib/llmConfig.js';
import type { LocalAiRuntimeStatus } from '../lib/localAi.js';

export interface ProviderStatusState {
  /** Map of provider -> whether it's configured */
  configured: Record<LlmProvider, boolean>;
  /** Currently active provider */
  activeProvider: LlmProvider;
  /** Whether the active provider is configured */
  activeConfigured: boolean;
  /** Whether a full refresh is in progress */
  busy: boolean;
}

type Listener = (state: ProviderStatusState) => void;

let _invoke = invoke;

/** Test-only hook to replace the Tauri invoke function. */
export function __setInvokeForTesting(
  fn: <T>(cmd: string, args?: unknown) => Promise<T>
): void {
  _invoke = fn as typeof invoke;
}

/** Test-only hook to reset all internal state. */
export function __resetForTesting(): void {
  _localAiStatus = null;
  sessionToken = null;
  currentState = {
    configured: Object.fromEntries(
      ALL_PROVIDER_ORDER.map((p) => [p, false])
    ) as Record<LlmProvider, boolean>,
    activeProvider: FREE_AI_ENABLED ? 'native_qwen_ollama' : 'openai',
    activeConfigured: false,
    busy: false,
  };
}

const DEFAULT_PROVIDER: LlmProvider = FREE_AI_ENABLED ? 'native_qwen_ollama' : 'openai';

let currentState: ProviderStatusState = {
  configured: Object.fromEntries(
    ALL_PROVIDER_ORDER.map((p) => [p, false])
  ) as Record<LlmProvider, boolean>,
  activeProvider: DEFAULT_PROVIDER,
  activeConfigured: false,
  busy: false,
};

const listeners = new Set<Listener>();

let sessionToken: string | null = null;
let _localAiStatus: LocalAiRuntimeStatus | null = null;

function notify(): void {
  const snapshot = {
    configured: { ...currentState.configured },
    activeProvider: currentState.activeProvider,
    activeConfigured: currentState.activeConfigured,
    busy: currentState.busy,
  };
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function recalculateActiveConfigured(): void {
  currentState = {
    ...currentState,
    activeConfigured: currentState.configured[currentState.activeProvider] ?? false,
  };
}

export function getProviderStatus(): ProviderStatusState {
  return {
    configured: { ...currentState.configured },
    activeProvider: currentState.activeProvider,
    activeConfigured: currentState.activeConfigured,
    busy: currentState.busy,
  };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Immediately emit current state so subscribers never miss the initial value
  listener(getProviderStatus());
  return () => {
    listeners.delete(listener);
  };
}

export function setActiveProvider(provider: LlmProvider): void {
  if (currentState.activeProvider === provider) return;
  currentState = {
    ...currentState,
    activeProvider: provider,
  };
  recalculateActiveConfigured();
  notify();
}

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  // gorkh_free configured status may have changed
  void refreshProvider('gorkh_free');
}

export function setLocalAiStatus(status: LocalAiRuntimeStatus | null): void {
  _localAiStatus = status;
  const configured = status
    ? status.runtimeRunning
      && status.targetModelAvailable === true
      && (Boolean(status.selectedModel) || status.externalServiceDetected)
    : false;
  if (currentState.configured.native_qwen_ollama === configured) return;
  currentState = {
    ...currentState,
    configured: {
      ...currentState.configured,
      native_qwen_ollama: configured,
    },
  };
  recalculateActiveConfigured();
  notify();
}

async function checkProviderConfigured(provider: LlmProvider): Promise<boolean> {
  if (provider === 'native_qwen_ollama') {
    // If App.tsx has pushed a status, trust it; otherwise query Rust directly
    if (_localAiStatus) {
      return (
        _localAiStatus.runtimeRunning
        && _localAiStatus.targetModelAvailable === true
        && (Boolean(_localAiStatus.selectedModel) || _localAiStatus.externalServiceDetected)
      );
    }
    try {
      const status = await _invoke<LocalAiRuntimeStatus>('local_ai_status');
      _localAiStatus = status;
      return (
        status.runtimeRunning
        && status.targetModelAvailable === true
        && (Boolean(status.selectedModel) || status.externalServiceDetected)
      );
    } catch {
      return false;
    }
  }

  if (provider === 'gorkh_free') {
    return FREE_AI_ENABLED && Boolean(sessionToken);
  }

  if (!providerRequiresApiKey(provider)) {
    return true;
  }

  try {
    return await _invoke<boolean>('has_llm_api_key', { provider });
  } catch {
    return false;
  }
}

async function refreshProvider(provider: LlmProvider): Promise<void> {
  const configured = await checkProviderConfigured(provider);
  if (currentState.configured[provider] === configured) return;

  currentState = {
    ...currentState,
    configured: {
      ...currentState.configured,
      [provider]: configured,
    },
  };
  recalculateActiveConfigured();
  notify();
}

/** Re-check keychain / runtime status for ALL providers. */
export async function refresh(): Promise<void> {
  currentState = { ...currentState, busy: true };
  notify();

  try {
    for (const provider of ALL_PROVIDER_ORDER) {
      await refreshProvider(provider);
    }
  } finally {
    currentState = { ...currentState, busy: false };
    notify();
  }
}

/** Targeted notification: a key for one provider just changed. */
export async function notifyKeyChanged(provider: LlmProvider): Promise<void> {
  await refreshProvider(provider);
}
