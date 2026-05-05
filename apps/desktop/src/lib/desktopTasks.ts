import type { Device, RunMode, RunWithSteps } from '@gorkh/shared';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';
import { fetchDesktopApiJson } from './desktopApi.js';

export interface DesktopBillingSnapshot {
  subscriptionStatus: 'active' | 'inactive';
  subscriptionCurrentPeriodEnd: string | null;
  planPriceId: string | null;
  hostedFreeAiPlan: 'free' | 'plus';
  freeHostedTaskLimit: number | null;
  visionIncluded: boolean;
}

export interface DesktopTaskBootstrap {
  user: {
    id: string;
    email: string;
  };
  billing: DesktopBillingSnapshot;
  device: Device;
  runs: RunWithSteps[];
  activeRun: RunWithSteps | null;
  readiness: {
    billingEnabled: boolean;
    subscriptionStatus: 'active' | 'inactive';
    hostedFreeAiEnabled: boolean;
  };
}

export async function getDesktopTaskBootstrap(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string
): Promise<DesktopTaskBootstrap> {
  const data = await fetchDesktopApiJson<{ ok: true } & DesktopTaskBootstrap>(
    runtimeConfig,
    deviceToken,
    '/desktop/me',
    'Desktop readiness',
  );

  return {
    user: data.user,
    billing: data.billing,
    device: data.device,
    runs: data.runs,
    activeRun: data.activeRun,
    readiness: data.readiness,
  };
}

export async function createDesktopRun(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string,
  input: {
    goal: string;
    mode: RunMode;
  }
): Promise<RunWithSteps> {
  const data = await fetchDesktopApiJson<{ ok: true; run: RunWithSteps }>(
    runtimeConfig,
    deviceToken,
    '/desktop/runs',
    'Desktop run creation',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.run;
}
