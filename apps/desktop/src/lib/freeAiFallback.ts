import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';
import { fetchDesktopApiJson } from './desktopApi.js';
import { parseDesktopError } from './tauriError.js';

export const HOSTED_FREE_AI_MODEL = 'gorkh-free-ai';

export interface HostedFreeAiBinding {
  provider: 'openai_compat';
  baseUrl: string;
  model: string;
  apiKeyOverride: string;
  supportsVisionOverride: true;
}

export interface HostedFreeAiAvailabilityInput {
  runtimeConfig: DesktopApiRuntimeConfig | null | undefined;
  deviceToken: string | null | undefined;
  hostedFreeAiEnabled: boolean;
}

export function buildHostedFreeAiBaseUrl(runtimeConfig: DesktopApiRuntimeConfig): string {
  return `${runtimeConfig.httpBase}/desktop/free-ai/v1`;
}

export function resolveHostedFreeAiBinding(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string
): HostedFreeAiBinding {
  return {
    provider: 'openai_compat',
    baseUrl: buildHostedFreeAiBaseUrl(runtimeConfig),
    model: HOSTED_FREE_AI_MODEL,
    apiKeyOverride: deviceToken,
    supportsVisionOverride: true,
  };
}

export function canUseHostedFreeAiFallback(
  input: HostedFreeAiAvailabilityInput
): boolean {
  return Boolean(input.hostedFreeAiEnabled && input.runtimeConfig && input.deviceToken);
}

export async function testHostedFreeAiFallback(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string
): Promise<void> {
  await fetchDesktopApiJson<{ ok: true }>(
    runtimeConfig,
    deviceToken,
    '/desktop/free-ai/v1/models',
    'Hosted Free AI fallback',
  );
}

export function shouldRetryWithHostedFreeAiFallback(error: unknown): boolean {
  const parsed = parseDesktopError(error, 'The assistant could not respond right now.');
  const normalizedMessage = parsed.message.trim().toLowerCase();

  return (
    normalizedMessage.includes('free ai')
    || normalizedMessage.includes('gorkh ai')
    || normalizedMessage.includes('this task needs a vision-capable model')
  );
}
