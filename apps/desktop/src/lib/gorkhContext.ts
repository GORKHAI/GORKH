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
  GORKH_PROVIDER_EXPLANATIONS,
} from './gorkhKnowledge.js';

// ---------------------------------------------------------------------------
// Snapshot types
// ---------------------------------------------------------------------------

export type GorkhAuthState = 'checking' | 'signed_out' | 'signing_in' | 'signed_in' | 'signing_out';
export type GorkhPermissionStatus = 'granted' | 'denied' | 'unknown';

export interface GorkhPermissionsSnapshot {
  screenRecordingStatus: GorkhPermissionStatus;
  accessibilityStatus: GorkhPermissionStatus;
  screenPreviewEnabled: boolean;
  controlEnabled: boolean;
}

export interface GorkhAppSnapshot {
  authState: GorkhAuthState;
  provider: string | null;
  providerConfigured: boolean;
  permissions: GorkhPermissionsSnapshot | null;
  workspaceConfigured: boolean;
  workspaceRootName: string | null;
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
      lines.push(`AI provider: ${providerExplanation} — NOT configured (setup required)`
      );
    }
  } else {
    lines.push('AI provider: not selected');
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
