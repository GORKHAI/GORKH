import { fetchDesktopApiJson } from './desktopApi.js';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';

export interface FreeTierUsage {
  remaining_today: number;
  used_today: number;
  reset_at: string;
  daily_limit: number;
  lifetime_used: number;
}

export async function fetchFreeTierUsage(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string
): Promise<FreeTierUsage> {
  return fetchDesktopApiJson<FreeTierUsage>(
    runtimeConfig,
    deviceToken,
    '/llm/free/usage',
    'Free tier usage',
    { method: 'GET' }
  );
}
