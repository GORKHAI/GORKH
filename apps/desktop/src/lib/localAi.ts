import { invoke } from '@tauri-apps/api/core';

export type LocalAiTier = 'light' | 'standard' | 'vision';
export type LocalAiInstallStage =
  | 'not_started'
  | 'planned'
  | 'installing'
  | 'installed'
  | 'starting'
  | 'ready'
  | 'error';

export type LocalAiGpuClass = 'unknown' | 'integrated' | 'discrete';

export interface LocalAiRuntimeStatus {
  managedByApp: boolean;
  managedRuntimeDir: string;
  runtimeBinaryPath: string | null;
  runtimePresent: boolean;
  runtimeRunning: boolean;
  externalServiceDetected: boolean;
  serviceUrl: string;
  installStage: LocalAiInstallStage;
  selectedTier: LocalAiTier | null;
  selectedModel: string | null;
  installedModels: string[];
  runtimeSource: string | null;
  runtimeVersion: string | null;
  compatibilityMode: boolean;
  lastError: string | null;
}

export interface LocalAiInstallProgress {
  stage: LocalAiInstallStage;
  selectedTier: LocalAiTier | null;
  selectedModel: string | null;
  progressPercent: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  message: string | null;
  updatedAtMs: number;
}

export interface LocalAiHardwareProfile {
  os: string;
  architecture: string;
  logicalCpuCores: number;
  cpuModel: string | null;
  ramBytes: number | null;
  gpuSummary: string | null;
  gpuClass: LocalAiGpuClass;
  availableDiskBytes: number | null;
  managedRuntimeDir: string;
}

export interface LocalAiTierRecommendation {
  tier: LocalAiTier;
  reason: string;
  visionAvailable: boolean;
  standardAvailable: boolean;
}

export interface LocalAiTierDetails {
  tier: LocalAiTier;
  title: string;
  bestFor: string;
  downloadSizeLabel: string;
  diskRequirementLabel: string;
  performanceExpectation: string;
  optional: boolean;
}

export interface LocalAiTierRuntimePlan {
  tier: LocalAiTier;
  defaultModel: string;
  optionalVisionModel: string;
}

export interface ManagedLocalLlmBinding {
  baseUrl: string;
  model: string;
}

export interface ManagedLocalTaskBinding extends ManagedLocalLlmBinding {
  needsVision: boolean;
  requiresVisionBoost: boolean;
  visionModel: string;
}

const GIB = 1024 * 1024 * 1024;
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const TIER_DETAILS: Record<LocalAiTier, LocalAiTierDetails> = {
  light: {
    tier: 'light',
    title: 'Light',
    bestFor: 'Best for everyday chat, planning, and tool choice on weaker or average machines.',
    downloadSizeLabel: 'about 1-3 GB',
    diskRequirementLabel: 'at least 4-6 GB',
    performanceExpectation: 'Lighter and more responsive while other heavy apps are open.',
    optional: false,
  },
  standard: {
    tier: 'standard',
    title: 'Standard',
    bestFor: 'Better for code work, richer reasoning, and stronger planning on capable laptops and desktops.',
    downloadSizeLabel: 'about 4-8 GB',
    diskRequirementLabel: 'at least 10-14 GB',
    performanceExpectation: 'Best balance for code-heavy work and stronger reasoning.',
    optional: false,
  },
  vision: {
    tier: 'vision',
    title: 'Vision Boost',
    bestFor: 'Best for screenshot understanding, UI tasks, and cases where the assistant truly needs visual context.',
    downloadSizeLabel: 'about 6-12 GB extra',
    diskRequirementLabel: 'at least 16-24 GB',
    performanceExpectation: 'Heavier and optional. Only enable it when the machine can handle it.',
    optional: true,
  },
};
const INSTALL_STAGE_LABELS: Record<LocalAiInstallStage, string> = {
  not_started: 'Not installed',
  planned: 'Preparing',
  installing: 'Downloading',
  installed: 'Installed',
  starting: 'Starting',
  ready: 'Ready',
  error: 'Error',
};
const TIER_RUNTIME_PLAN: Record<LocalAiTier, LocalAiTierRuntimePlan> = {
  light: {
    tier: 'light',
    defaultModel: 'qwen2.5:1.5b',
    optionalVisionModel: 'qwen2.5-vl:3b',
  },
  standard: {
    tier: 'standard',
    defaultModel: 'qwen2.5:3b',
    optionalVisionModel: 'qwen2.5-vl:3b',
  },
  vision: {
    tier: 'vision',
    defaultModel: 'qwen2.5-vl:3b',
    optionalVisionModel: 'qwen2.5-vl:3b',
  },
};

export async function getLocalAiStatus(): Promise<LocalAiRuntimeStatus> {
  return invoke<LocalAiRuntimeStatus>('local_ai_status');
}

export async function startLocalAiInstall(preferredTier?: LocalAiTier): Promise<LocalAiInstallProgress> {
  return invoke<LocalAiInstallProgress>('local_ai_install_start', {
    preferredTier: preferredTier ?? null,
  });
}

export async function getLocalAiInstallProgress(): Promise<LocalAiInstallProgress> {
  return invoke<LocalAiInstallProgress>('local_ai_install_progress');
}

export async function enableLocalAiVisionBoost(): Promise<LocalAiInstallProgress> {
  return invoke<LocalAiInstallProgress>('local_ai_enable_vision_boost');
}

export async function startLocalAiRuntime(): Promise<LocalAiRuntimeStatus> {
  return invoke<LocalAiRuntimeStatus>('local_ai_start');
}

export async function stopLocalAiRuntime(): Promise<LocalAiRuntimeStatus> {
  return invoke<LocalAiRuntimeStatus>('local_ai_stop');
}

export async function getLocalAiHardwareProfile(): Promise<LocalAiHardwareProfile> {
  return invoke<LocalAiHardwareProfile>('local_ai_hardware_profile');
}

export async function getLocalAiRecommendedTier(): Promise<LocalAiTierRecommendation> {
  return invoke<LocalAiTierRecommendation>('local_ai_recommended_tier');
}

export function getLocalAiTierDetails(tier: LocalAiTier): LocalAiTierDetails {
  return TIER_DETAILS[tier];
}

export function getLocalAiInstallStageLabel(stage: LocalAiInstallStage): string {
  return INSTALL_STAGE_LABELS[stage];
}

export function getLocalAiTierRuntimePlan(tier: LocalAiTier): LocalAiTierRuntimePlan {
  return TIER_RUNTIME_PLAN[tier];
}

export function formatLocalAiByteCount(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}

export function getLocalAiInstallProgressSummary(
  progress: LocalAiInstallProgress | null | undefined
): string | null {
  if (!progress) {
    return null;
  }

  const parts: string[] = [];
  if (typeof progress.progressPercent === 'number') {
    parts.push(`${progress.progressPercent}%`);
  }

  const downloadedLabel = formatLocalAiByteCount(progress.downloadedBytes);
  const totalLabel = formatLocalAiByteCount(progress.totalBytes);
  if (downloadedLabel && totalLabel) {
    parts.push(`${downloadedLabel} of ${totalLabel}`);
  } else if (downloadedLabel) {
    parts.push(`${downloadedLabel} downloaded`);
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}

export function getLocalAiGpuExecutionLabel(gpuClass: LocalAiGpuClass): string {
  if (gpuClass === 'discrete') return 'GPU acceleration';
  if (gpuClass === 'integrated') return 'CPU only (integrated graphics)';
  return 'CPU only (GPU not detected)';
}

export function getLocalAiRuntimeSourceLabel(source: LocalAiRuntimeStatus['runtimeSource']): string {
  if (source === 'managed') {
    return 'Managed by GORKH';
  }
  if (source === 'existingInstall' || source === 'existing_install') {
    return 'Adopted existing local AI install';
  }
  if (source === 'existingService' || source === 'existing_service') {
    return 'Using existing local AI service';
  }
  return 'Not installed yet';
}

export function getLocalAiTroubleshootingHint(
  status: LocalAiRuntimeStatus | null,
  progress: LocalAiInstallProgress | null,
  hardwareProfile: LocalAiHardwareProfile | null,
  uiError?: string | null
): string | null {
  const activeError = uiError || status?.lastError || null;
  if (activeError) {
    const availableDiskBytes = hardwareProfile?.availableDiskBytes ?? null;
    if (availableDiskBytes != null && availableDiskBytes < 8 * GIB) {
      return 'This desktop may be low on free disk space. Free up space, refresh status, then repair Free AI.';
    }
    if (/network|download/i.test(activeError)) {
      return 'Check network access, then refresh status and try Repair Free AI again.';
    }
    if (/checksum/i.test(activeError)) {
      return 'Retry the managed runtime download. If it fails again, use the support details below when reporting it.';
    }
    if (/start|ready/i.test(activeError)) {
      return 'Refresh status. If the local runtime still does not start, try Repair Free AI and include the runtime source and version in support notes.';
    }
    return 'Refresh status, then try Repair Free AI again. The support details below are safe to share with support.';
  }

  if (progress?.stage === 'installing') {
    return 'Large runtime and model downloads can take a while. Keep GORKH open until this reaches Ready to use.';
  }

  if (progress?.stage === 'starting') {
    return 'The local runtime is starting on this desktop. If this takes longer than a minute, refresh status once before retrying.';
  }

  if (status?.compatibilityMode) {
    return 'Free AI is using Mac compatibility mode on this desktop. Replies may be slower, but this avoids the graphics-path crash.';
  }

  if (status?.externalServiceDetected && status.installStage !== 'ready') {
    return 'GORKH found another local AI service on this machine. You can keep using it, or let GORKH manage its own runtime.';
  }

  return null;
}

export function isLocalAiInstallActive(stage: LocalAiInstallStage | null | undefined): boolean {
  return stage === 'planned' || stage === 'installing' || stage === 'starting';
}

export function resolveManagedLocalLlmBinding(
  status: LocalAiRuntimeStatus | null,
  recommendation: LocalAiTierRecommendation | null
): ManagedLocalLlmBinding {
  const tier = status?.selectedTier ?? recommendation?.tier ?? 'light';
  const plan = getLocalAiTierRuntimePlan(tier);
  return {
    baseUrl: status?.serviceUrl || 'http://127.0.0.1:11434',
    model: status?.selectedModel || plan.defaultModel,
  };
}

export function taskLikelyNeedsVision(goal: string): boolean {
  const normalized = goal.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const visionPatterns = [
    /\bphotoshop\b/,
    /\bblender\b/,
    /\bfigma\b/,
    /\bscreenshot\b/,
    /\bscreen\b/,
    /\bwindow\b/,
    /\bmenu\b/,
    /\bbutton\b/,
    /\bdialog\b/,
    /\bcanvas\b/,
    /\bui\b/,
    /\bgui\b/,
    /\bimage\b/,
    /\bpicture\b/,
    /\bbackground\b/,
    /\bremove the background\b/,
    /\bwhat(?:'s| is) on screen\b/,
    /\bopen .* and\b/,
    /\bclick\b/,
    /\blook at\b/,
  ];

  return visionPatterns.some((pattern) => pattern.test(normalized));
}

export function resolveManagedLocalTaskBinding(
  status: LocalAiRuntimeStatus | null,
  recommendation: LocalAiTierRecommendation | null,
  goal: string
): ManagedLocalTaskBinding {
  const baseBinding = resolveManagedLocalLlmBinding(status, recommendation);
  const tier = status?.selectedTier ?? recommendation?.tier ?? 'light';
  const plan = getLocalAiTierRuntimePlan(tier);
  const visionModel = plan.optionalVisionModel;
  const visionInstalled = Boolean(
    status?.selectedModel === visionModel
      || status?.installedModels.includes(visionModel)
  );
  const needsVision = taskLikelyNeedsVision(goal);

  return {
    baseUrl: baseBinding.baseUrl,
    model: needsVision && visionInstalled ? visionModel : baseBinding.model,
    needsVision,
    requiresVisionBoost: needsVision && !visionInstalled,
    visionModel,
  };
}

// Mirror the backend's conservative tiering so desktop UI/tests can explain
// likely outcomes before the managed runtime is queried.
export function recommendLocalAiTierFromHardwareProfile(
  profile: LocalAiHardwareProfile
): LocalAiTierRecommendation {
  const ramGiB = Math.floor((profile.ramBytes ?? 0) / GIB);
  const diskGiB = Math.floor((profile.availableDiskBytes ?? 0) / GIB);
  const appleSilicon = profile.os === 'macos' && profile.architecture === 'aarch64';
  const visionCapable =
    (profile.gpuClass === 'discrete' || appleSilicon)
    && ramGiB >= 24
    && diskGiB >= 35
    && profile.logicalCpuCores >= 8;

  if (visionCapable) {
    return {
      tier: 'standard',
      reason: 'This machine looks capable of Vision Boost, but the heavier screenshot model should stay optional and on-demand while Standard remains the default.',
      visionAvailable: true,
      standardAvailable: true,
    };
  }

  if (ramGiB >= 14 && diskGiB >= 18 && profile.logicalCpuCores >= 8) {
    return {
      tier: 'standard',
      reason: 'This machine has enough headroom for a stronger standard local model without defaulting to an always-on vision stack.',
      visionAvailable: false,
      standardAvailable: true,
    };
  }

  return {
    tier: 'light',
    reason: 'Recommend a lighter local model so the desktop stays responsive while other heavy apps are running.',
    visionAvailable: false,
    standardAvailable: false,
  };
}
