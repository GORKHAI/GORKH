import type { Device } from '@ai-operator/shared';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';
import type { DesktopBillingSnapshot } from './desktopTasks.js';
import { fetchDesktopApiJson } from './desktopApi.js';

export interface DesktopAccountSnapshot {
  user: {
    id: string;
    email: string;
  };
  billing: DesktopBillingSnapshot;
  currentDevice: Device | null;
  devices: Device[];
}

export async function getDesktopAccount(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string
): Promise<DesktopAccountSnapshot> {
  const data = await fetchDesktopApiJson<{ ok: true } & DesktopAccountSnapshot>(
    runtimeConfig,
    deviceToken,
    '/desktop/account',
    'Desktop account',
  );

  return {
    user: data.user,
    billing: data.billing,
    currentDevice: data.currentDevice,
    devices: data.devices,
  };
}

export async function revokeDesktopDevice(
  runtimeConfig: DesktopApiRuntimeConfig,
  deviceToken: string,
  deviceId: string
): Promise<Device | null> {
  const data = await fetchDesktopApiJson<{ ok: true; device: Device | null }>(
    runtimeConfig,
    deviceToken,
    `/desktop/devices/${deviceId}/revoke`,
    'Desktop device revoke',
    {
      method: 'POST',
    }
  );

  return data.device;
}
