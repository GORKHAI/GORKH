/**
 * GORKH dynamic app context builder.
 *
 * Builds a structured, plain-text context block from the current app state.
 * This block is injected into the LLM system prompt so the assistant can
 * accurately describe GORKH's current state without hallucinating.
 *
 * Privacy rules:
 * - No API keys, device tokens, or auth credentials
 * - No file contents or typed text
 * - No absolute paths (workspace root name only)
 * - No screen frame data
 * - No PII
 */

import {
  GORKH_INSTALL_STAGE_EXPLANATIONS,
  GORKH_PROVIDER_EXPLANATIONS,
  GORKH_TIER_EXPLANATIONS,
  GORKH_GPU_CLASS_EXPLANATIONS,
} from './gorkhKnowledge.js';

// ---------------------------------------------------------------------------
// Snapshot types
// ---------------------------------------------------------------------------

export type GorkhAuthState = 'checking' | 'signed_out' | 'signing_in' | 'signed_in' | 'signing_out';
export type GorkhPermissionStatus = 'granted' | 'denied' | 'unknown';
export type GorkhInstallStage =
  | 'not_started'
  | 'planned'
  | 'installing'
  | 'installed'
  | 'starting'
  | 'ready'
  | 'error';
export type GorkhLocalAiTier = 'light' | 'standard' | 'vision';
export type GorkhGpuClass = 'unknown' | 'integrated' | 'discrete';

export interface GorkhFreeAiSnapshot {
  installStage: GorkhInstallStage;
  runtimeRunning: boolean;
  selectedTier: GorkhLocalAiTier | null;
  selectedModel: string | null;
  externalServiceDetected: boolean;
  lastError: string | null;
}

export interface GorkhPermissionsSnapshot {
  screenRecordingStatus: GorkhPermissionStatus;
  accessibilityStatus: GorkhPermissionStatus;
  screenPreviewEnabled: boolean;
  controlEnabled: boolean;
}

export interface GorkhHardwareSnapshot {
  gpuClass: GorkhGpuClass;
  ramGb: number | null;
}

export interface GorkhAppSnapshot {
  authState: GorkhAuthState;
  provider: string | null;
  providerConfigured: boolean;
  freeAi: GorkhFreeAiSnapshot | null;
  permissions: GorkhPermissionsSnapshot | null;
  workspaceConfigured: boolean;
  workspaceRootName: string | null;
  hardware: GorkhHardwareSnapshot | null;
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

/**
 * Builds a concise, structured context block for LLM injection.
 * Returns null if snapshot is essentially empty (not enough state to be useful).
 */
export function buildGorkhContextBlock(snapshot: GorkhAppSnapshot): string | null {
  const lines: string[] = [];

  // Auth
  if (snapshot.authState === 'signed_in') {
    lines.push('User account: signed in');
  } else if (snapshot.authState === 'signed_out') {
    lines.push('User account: not signed in');
  }

  // AI provider
  if (snapshot.provider) {
    const providerExplanation = GORKH_PROVIDER_EXPLANATIONS[snapshot.provider] ?? snapshot.provider;
    if (snapshot.providerConfigured) {
      lines.push(`AI provider: ${providerExplanation} — configured and ready`);
    } else {
      lines.push(`AI provider: ${providerExplanation} — NOT configured (setup required)`);
    }
  } else {
    lines.push('AI provider: not selected');
  }

  // Free AI / local engine
  if (snapshot.freeAi) {
    const ai = snapshot.freeAi;
    const stageExplanation =
      GORKH_INSTALL_STAGE_EXPLANATIONS[ai.installStage] ?? ai.installStage;

    if (ai.runtimeRunning) {
      const tierLabel = ai.selectedTier
        ? (GORKH_TIER_EXPLANATIONS[ai.selectedTier] ?? ai.selectedTier)
        : 'unknown tier';
      lines.push(`Free AI (local engine): running — ${tierLabel}`);
      if (ai.selectedModel) {
        lines.push(`  Model: ${ai.selectedModel}`);
      }
      if (ai.externalServiceDetected) {
        lines.push('  Runtime source: external local AI service (not managed by GORKH)');
      }
    } else {
      lines.push(`Free AI (local engine): not running — ${stageExplanation}`);
      if (ai.lastError) {
        // Truncate long error messages to avoid bloating the context
        const truncated = ai.lastError.length > 120 ? ai.lastError.slice(0, 120) + '…' : ai.lastError;
        lines.push(`  Last error: ${truncated}`);
      }
    }
  }

  // Hardware (only surface GPU truth, not full profile)
  if (snapshot.hardware) {
    const gpuLabel = GORKH_GPU_CLASS_EXPLANATIONS[snapshot.hardware.gpuClass]
      ?? 'GPU status unknown';
    lines.push(`Hardware: ${gpuLabel}`);
    if (snapshot.hardware.ramGb !== null) {
      lines.push(`  RAM: approximately ${snapshot.hardware.ramGb} GB`);
    }
  }

  // Permissions
  if (snapshot.permissions) {
    const p = snapshot.permissions;
    const permParts: string[] = [];

    if (p.screenRecordingStatus === 'granted') {
      permParts.push('Screen Recording: granted');
    } else if (p.screenRecordingStatus === 'denied') {
      permParts.push('Screen Recording: denied (user must grant in System Settings)');
    } else {
      permParts.push('Screen Recording: not checked yet');
    }

    if (p.accessibilityStatus === 'granted') {
      permParts.push('Accessibility: granted');
    } else if (p.accessibilityStatus === 'denied') {
      permParts.push('Accessibility: denied (user must grant in System Settings)');
    } else {
      permParts.push('Accessibility: not checked yet');
    }

    lines.push(`Permissions: ${permParts.join('; ')}`);
    lines.push(`  Screen preview: ${p.screenPreviewEnabled ? 'enabled' : 'disabled'}`);
    lines.push(`  Remote control: ${p.controlEnabled ? 'enabled' : 'disabled'}`);
  }

  // Workspace
  if (snapshot.workspaceConfigured && snapshot.workspaceRootName) {
    lines.push(`Workspace: configured — root folder is "${snapshot.workspaceRootName}"`);
  } else {
    lines.push('Workspace: not configured (file and terminal tools unavailable)');
  }

  if (lines.length === 0) {
    return null;
  }

  return ['[GORKH APP STATE]', ...lines, '[/GORKH APP STATE]'].join('\n');
}

/**
 * Returns the GORKH assistant identity string for the system prompt.
 */
export function buildGorkhIdentity(): string {
  return (
    'You are GORKH, an AI desktop assistant. ' +
    'You help users automate tasks on their computer, explain your own features and settings, ' +
    'and guide them through setup. ' +
    'Every action you propose requires the user\'s explicit approval before it runs — ' +
    'you never take action without their confirmation. ' +
    'You are honest about what you can and cannot do, and you never pretend to have capabilities you lack.'
  );
}
