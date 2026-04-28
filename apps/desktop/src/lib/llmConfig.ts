export type LlmProvider =
  | 'gorkh_free'
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'minimax'
  | 'kimi'
  | 'openai_compat';

export type LlmRuntimeProvider = 'gorkh_free' | 'openai' | 'claude' | 'openai_compat';

export interface LlmSettings {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  apiKeyOverride?: string;
  supportsVisionOverride?: boolean;
}

export interface LlmProviderDefinition {
  provider: LlmProvider;
  label: string;
  shortLabel: string;
  baseUrl: string;
  model: string;
  runtimeProvider: LlmRuntimeProvider;
  requiresApiKey: boolean;
  paid: boolean;
  setupHint: string;
  billingHint?: string;
}

export const DEFAULT_LLM_PROVIDER: LlmProvider = 'gorkh_free';

/** Default provider for brand-new users (no saved settings) */
export const DEFAULT_NEW_USER_PROVIDER: LlmProvider = 'gorkh_free';

export const FREE_AI_ENABLED =
  typeof import.meta.env !== 'undefined' && import.meta.env.VITE_FREE_AI_ENABLED === 'true';
export const PLUS_TIER_ENABLED =
  typeof import.meta.env !== 'undefined' && import.meta.env.VITE_PLUS_TIER_ENABLED === 'true';

const PROVIDER_DEFINITIONS: Record<LlmProvider, LlmProviderDefinition> = {
  gorkh_free: {
    provider: 'gorkh_free',
    label: 'GORKH AI (Free)',
    shortLabel: 'GORKH AI',
    baseUrl: '', // resolved at runtime from VITE_API_HTTP_BASE
    model: 'deepseek-chat',
    runtimeProvider: 'gorkh_free',
    requiresApiKey: false,
    paid: false,
    setupHint: '5 tasks per day. No setup needed. Powered by DeepSeek.',
  },
  openai: {
    provider: 'openai',
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    runtimeProvider: 'openai',
    requiresApiKey: true,
    paid: true,
    setupHint: 'Enter an OpenAI API key stored in the local OS keychain.',
    billingHint: 'Paid provider. Usage is billed by your OpenAI account.',
  },
  claude: {
    provider: 'claude',
    label: 'Claude',
    shortLabel: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    runtimeProvider: 'claude',
    requiresApiKey: true,
    paid: true,
    setupHint: 'Enter an Anthropic API key stored in the local OS keychain.',
    billingHint: 'Paid provider. Usage is billed by your Anthropic account.',
  },
  deepseek: {
    provider: 'deepseek',
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    runtimeProvider: 'openai_compat',
    requiresApiKey: true,
    paid: true,
    setupHint: 'Uses DeepSeek\u2019s OpenAI-compatible chat completions API.',
    billingHint: 'Paid provider. Usage is billed by your DeepSeek account.',
  },
  minimax: {
    provider: 'minimax',
    label: 'MiniMax',
    shortLabel: 'MiniMax',
    baseUrl: 'https://api.minimax.io',
    model: 'MiniMax-M2.5',
    runtimeProvider: 'openai_compat',
    requiresApiKey: true,
    paid: true,
    setupHint: 'Uses MiniMax\u2019s OpenAI-compatible chat completions API.',
    billingHint: 'Paid provider. Usage is billed by your MiniMax account.',
  },
  kimi: {
    provider: 'kimi',
    label: 'Kimi',
    shortLabel: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-thinking-preview',
    runtimeProvider: 'openai_compat',
    requiresApiKey: true,
    paid: true,
    setupHint: 'Uses Moonshot/Kimi\u2019s OpenAI-compatible chat completions API.',
    billingHint: 'Paid provider. Usage is billed by your Moonshot account.',
  },
  openai_compat: {
    provider: 'openai_compat',
    label: 'Custom OpenAI-compatible',
    shortLabel: 'Custom OpenAI-compatible',
    baseUrl: 'http://127.0.0.1:8000',
    model: 'custom-model',
    runtimeProvider: 'openai_compat',
    requiresApiKey: false,
    paid: false,
    setupHint: 'Run a self-hosted OpenAI-compatible server such as vLLM or llama.cpp server.',
  },
};

export const ALL_PROVIDER_ORDER: LlmProvider[] = [
  'gorkh_free',
  'openai',
  'claude',
  'deepseek',
  'minimax',
  'kimi',
  'openai_compat',
];

const LAUNCH_PROVIDER_ORDER: LlmProvider[] = [
  'openai',
  'claude',
];

export function isLlmProvider(value: string | undefined | null): value is LlmProvider {
  return value === 'gorkh_free'
    || value === 'openai'
    || value === 'claude'
    || value === 'deepseek'
    || value === 'minimax'
    || value === 'kimi'
    || value === 'openai_compat';
}

export function normalizeLlmProvider(value: string | undefined | null): LlmProvider {
  if (isLlmProvider(value)) {
    return value;
  }
  return 'gorkh_free';
}

export function getLlmDefaults(provider: LlmProvider): LlmSettings {
  const definition = PROVIDER_DEFINITIONS[provider];
  return {
    provider,
    baseUrl: definition.baseUrl,
    model: definition.model,
  };
}

export function mergeLlmSettings(input?: Partial<LlmSettings>): LlmSettings {
  const provider = normalizeLlmProvider(input?.provider);
  return {
    ...getLlmDefaults(provider),
    ...input,
    provider,
  };
}

export function providerRequiresApiKey(provider: LlmProvider): boolean {
  return PROVIDER_DEFINITIONS[provider].requiresApiKey;
}

export function isLocalLlmProvider(_provider: LlmProvider): boolean {
  return false;
}

export function getLlmProviderLabel(provider: LlmProvider): string {
  return PROVIDER_DEFINITIONS[provider].shortLabel;
}

export function isPaidLlmProvider(provider: LlmProvider): boolean {
  return PROVIDER_DEFINITIONS[provider].paid;
}

export function getLlmRuntimeProvider(provider: LlmProvider): LlmRuntimeProvider {
  return PROVIDER_DEFINITIONS[provider].runtimeProvider;
}

export function getLlmProviderDefinition(provider: LlmProvider): LlmProviderDefinition {
  return PROVIDER_DEFINITIONS[provider];
}

export function isLaunchLlmProvider(provider: LlmProvider): boolean {
  return LAUNCH_PROVIDER_ORDER.includes(provider);
}

export function getSupportedLlmProviders(): LlmProviderDefinition[] {
  return LAUNCH_PROVIDER_ORDER.map((provider) => PROVIDER_DEFINITIONS[provider]);
}

export function getAdvancedLlmProviders(): LlmProviderDefinition[] {
  return ['deepseek', 'minimax', 'kimi', 'openai_compat'].map(
    (provider) => PROVIDER_DEFINITIONS[provider as LlmProvider]
  );
}

export function getAllLlmProviders(): LlmProviderDefinition[] {
  return ALL_PROVIDER_ORDER.map((provider) => PROVIDER_DEFINITIONS[provider]);
}

export function getEmptyStateMessage(
  activeProvider: LlmProvider,
  _freeAiEnabled: boolean,
): string {
  const providerLabel = getLlmProviderLabel(activeProvider);

  if (activeProvider === 'gorkh_free') {
    return 'Sign in to use GORKH AI (Free). No API key needed.';
  }

  const otherProviders = ALL_PROVIDER_ORDER
    .filter((p) => p !== activeProvider)
    .map(getLlmProviderLabel);

  const othersText =
    otherProviders.length > 0
      ? `, or switch to ${otherProviders.join(', ')}`
      : '';

  return `I'm not connected to ${providerLabel} yet. Add an API key in Settings to get started${othersText}.`;
}
