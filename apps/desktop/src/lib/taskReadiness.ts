import type { RunMode } from '@ai-operator/shared';
import type { LocalSettingsState } from './localSettings.js';
import type { NativePermissionStatus, PermissionPlatform, PermissionTarget } from './permissions.js';

export type DesktopTaskBlockerId =
  | 'screen-preview'
  | 'screen-permission'
  | 'control-toggle'
  | 'accessibility-permission'
  | 'workspace'
  | 'provider';

export type DesktopTaskSetupItemId = DesktopTaskBlockerId;

export interface DesktopTaskBlocker {
  id: DesktopTaskBlockerId;
  label: string;
  detail: string;
}

export interface DesktopTaskSetupItem {
  id: DesktopTaskSetupItemId;
  label: string;
  detail: string;
}

export interface DesktopTaskReadiness {
  ready: boolean;
  blockers: DesktopTaskBlocker[];
  requiredSetup: DesktopTaskSetupItem[];
  optionalUpgrades: DesktopTaskSetupItem[];
}

interface DesktopControlExecutionBlockerInput {
  platform?: PermissionPlatform;
  permissionStatus: NativePermissionStatus;
  localSettings: Pick<LocalSettingsState, 'allowControlEnabled'>;
}

interface EvaluateDesktopTaskReadinessInput {
  mode: RunMode;
  subscriptionStatus: 'active' | 'inactive';
  platform?: PermissionPlatform;
  permissionStatus: NativePermissionStatus;
  localSettings: LocalSettingsState;
  workspaceConfigured: boolean;
  providerConfigured: boolean;
  requireControl?: boolean;
  requireScreen?: boolean;
  requireWorkspace?: boolean;
}

function isPermissionBlocked(
  status: NativePermissionStatus[PermissionTarget],
  platform: PermissionPlatform
): boolean {
  if (status === 'granted') {
    return false;
  }

  if (platform === 'windows' && status === 'unknown') {
    return false;
  }

  return true;
}

function getPermissionBlockerDetail(
  target: PermissionTarget,
  platform: PermissionPlatform
): string {
  if (platform === 'windows') {
    return target === 'screenRecording'
      ? 'Windows could not confirm screen capture is available. Review Windows Privacy settings, remote-session restrictions, or security software if capture keeps failing.'
      : 'Windows could not confirm approved input control is available. Review Windows accessibility or security settings and match the target app privilege level if control keeps failing.';
  }

  return target === 'screenRecording'
    ? 'Grant screen recording permission for this desktop app.'
    : 'Grant accessibility/input permission for approved desktop actions.';
}

export function getDesktopControlExecutionBlocker(
  input: DesktopControlExecutionBlockerInput
): DesktopTaskBlocker | null {
  const platform = input.platform ?? 'unknown';

  if (!input.localSettings.allowControlEnabled) {
    return {
      id: 'control-toggle',
      label: 'Allow Control disabled',
      detail: 'Enable Allow Control so approved actions can execute locally.',
    };
  }

  if (isPermissionBlocked(input.permissionStatus.accessibility, platform)) {
    return {
      id: 'accessibility-permission',
      label: 'Accessibility permission missing',
      detail: getPermissionBlockerDetail('accessibility', platform),
    };
  }

  return null;
}

export function taskLikelyNeedsWorkspace(goal: string): boolean {
  const normalized = goal.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return /\b(file|files|folder|folders|directory|directories|workspace|repo|repository|project|codebase|download|downloads|document|documents|desktop)\b/.test(normalized);
}

export function taskLikelyNeedsScreenObservation(goal: string): boolean {
  const normalized = goal.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const patterns = [
    /\bphotoshop\b/,
    /\bblender\b/,
    /\bfigma\b/,
    /\bscreenshot\b/,
    /\bscreen\b/,
    /\bon screen\b/,
    /\bwindow\b/,
    /\bmenu\b/,
    /\bbutton\b/,
    /\bdialog\b/,
    /\bcanvas\b/,
    /\bui\b/,
    /\bgui\b/,
    /\bclick\b/,
    /\blook at\b/,
    /\bsee\b/,
    /\bvisible\b/,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

export function evaluateDesktopTaskReadiness(
  input: EvaluateDesktopTaskReadinessInput
): DesktopTaskReadiness {
  const platform = input.platform ?? 'unknown';
  const requireControl = input.requireControl ?? true;
  const requireScreen = input.requireScreen ?? true;
  const requireWorkspace = input.requireWorkspace ?? input.mode === 'ai_assist';
  const blockers: DesktopTaskBlocker[] = [];
  const requiredSetup: DesktopTaskSetupItem[] = [];
  const optionalUpgrades: DesktopTaskSetupItem[] = [];

  if (!input.localSettings.screenPreviewEnabled) {
    const item = {
      id: 'screen-preview',
      label: 'Screen preview disabled',
      detail: 'Enable Screen Preview so runs can inspect the local desktop safely.',
    } satisfies DesktopTaskBlocker;
    if (requireScreen) {
      blockers.push(item);
      requiredSetup.push(item);
    } else {
      optionalUpgrades.push(item);
    }
  }

  if (isPermissionBlocked(input.permissionStatus.screenRecording, platform)) {
    const item = {
      id: 'screen-permission',
      label: 'Screen recording permission missing',
      detail: getPermissionBlockerDetail('screenRecording', platform),
    } satisfies DesktopTaskBlocker;
    if (requireScreen) {
      blockers.push(item);
      requiredSetup.push(item);
    } else {
      optionalUpgrades.push(item);
    }
  }

  if (requireControl) {
    if (!input.localSettings.allowControlEnabled) {
      const controlBlocker = {
        id: 'control-toggle',
        label: 'Allow Control disabled',
        detail: 'Enable Allow Control so approved actions can execute locally.',
      } satisfies DesktopTaskBlocker;
      blockers.push(controlBlocker);
      requiredSetup.push(controlBlocker);
    }

    if (isPermissionBlocked(input.permissionStatus.accessibility, platform)) {
      const accessibilityBlocker = {
        id: 'accessibility-permission',
        label: 'Accessibility permission missing',
        detail: getPermissionBlockerDetail('accessibility', platform),
      } satisfies DesktopTaskBlocker;
      blockers.push(accessibilityBlocker);
      requiredSetup.push(accessibilityBlocker);
    }
  }

  if (input.mode === 'ai_assist' && !input.workspaceConfigured) {
    const item = {
      id: 'workspace',
      label: 'Workspace not configured',
      detail: 'Choose a workspace folder before starting AI Assist tasks.',
    } satisfies DesktopTaskBlocker;
    if (requireWorkspace) {
      blockers.push(item);
      requiredSetup.push(item);
    } else {
      optionalUpgrades.push(item);
    }
  }

  if (input.mode === 'ai_assist' && !input.providerConfigured) {
    const item = {
      id: 'provider',
      label: 'Provider not configured',
      detail: 'Configure a usable model provider before starting AI Assist tasks.',
    } satisfies DesktopTaskBlocker;
    blockers.push(item);
    requiredSetup.push(item);
  }

  return {
    ready: requiredSetup.length === 0,
    blockers,
    requiredSetup,
    optionalUpgrades,
  };
}
