import { invoke } from '@tauri-apps/api/core';

export type PermissionStatusValue = 'granted' | 'denied' | 'unknown';
export type PermissionTarget = 'screenRecording' | 'accessibility';
export type PermissionPlatform = 'macos' | 'windows' | 'linux' | 'unknown';

export interface NativePermissionStatus {
  screenRecording: PermissionStatusValue;
  accessibility: PermissionStatusValue;
}

interface KeyResult {
  ok: boolean;
  error?: string;
}

export async function getPermissionStatus(): Promise<NativePermissionStatus> {
  return await invoke<NativePermissionStatus>('permissions_get_status');
}

export async function openPermissionSettings(target: PermissionTarget): Promise<void> {
  const result = await invoke<KeyResult>('permissions_open_settings', { target });
  if (!result.ok) {
    throw new Error(result.error || `Failed to open ${target} settings`);
  }
}

function detectPermissionPlatform(): PermissionPlatform {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

export function getPermissionInstructions(
  target: PermissionTarget,
  platform: PermissionPlatform = detectPermissionPlatform()
): string[] {
  if (platform === 'macos') {
    if (target === 'screenRecording') {
      return [
        'Open System Settings.',
        'Go to Privacy & Security > Screen Recording.',
        'Enable access for GORKH Desktop, then restart the app if macOS asks you to.',
      ];
    }

    return [
      'Open System Settings.',
      'Go to Privacy & Security > Accessibility.',
      'Enable access for GORKH Desktop so it can inject approved input.',
    ];
  }

  if (platform === 'windows') {
    if (target === 'screenRecording') {
      return [
        'GORKH cannot reliably preflight screen capture permission on Windows.',
        'Keep Screen Preview enabled and try a capture first.',
        'If capture stays blank or fails, review Windows Privacy settings, remote-session restrictions, and security software.',
      ];
    }

    return [
      'GORKH cannot reliably preflight input-control permission on Windows.',
      'Turn on Allow Control and try an approved action first.',
      'If control fails, review Windows accessibility or security settings and make sure GORKH is running at the same privilege level as the target app.',
    ];
  }

  if (target === 'screenRecording') {
    return [
      'Screen capture permission checks are best-effort on this platform.',
      'If capture fails, review your OS privacy settings and relaunch the desktop app.',
    ];
  }

  return [
    'Accessibility permission checks are best-effort on this platform.',
    'If input injection fails, review your OS accessibility or input-control settings and relaunch the desktop app.',
  ];
}

export function getPermissionSettingsButtonLabel(
  target: PermissionTarget,
  platform: PermissionPlatform = detectPermissionPlatform()
): string {
  if (platform === 'windows') {
    return target === 'screenRecording'
      ? 'Open Windows Privacy Settings'
      : 'Open Windows Accessibility Settings';
  }

  return target === 'screenRecording'
    ? 'Open Screen Recording Settings'
    : 'Open Accessibility Settings';
}

export function getPermissionBannerMessage(
  target: PermissionTarget,
  platform: PermissionPlatform = detectPermissionPlatform()
): string {
  if (platform === 'macos') {
    return target === 'screenRecording'
      ? 'Screen Recording permission is needed. Enable it in System Settings > Privacy & Security > Screen Recording for this app.'
      : 'Accessibility permission is needed for remote control. Enable it in System Settings > Privacy & Security > Accessibility for this app.';
  }

  if (platform === 'windows') {
    return target === 'screenRecording'
      ? 'Windows does not expose a single screen recording permission for desktop apps. If capture fails, review Windows Privacy settings, remote-session restrictions, or security software and try again.'
      : 'Windows does not expose a single accessibility permission for desktop control. If approved input fails, review Windows accessibility or security settings and make sure GORKH is not running below the target app\'s privilege level.';
  }

  return target === 'screenRecording'
    ? 'Screen capture checks are best-effort on this platform. If capture fails, review your OS settings and try again.'
    : 'Input-control checks are best-effort on this platform. If approved input fails, review your OS settings and try again.';
}
