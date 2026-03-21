/**
 * GORKH internal app tool execution (STEP 2).
 *
 * These tools let the GORKH assistant read and mutate safe app settings
 * without touching the user's file system or running shell commands.
 *
 * Read-only tools (app.get_state) are auto-approved — no user confirmation needed.
 * Write tools (settings.set, free_ai.install) require the standard approval gate.
 */

import { invoke } from '@tauri-apps/api/core';
import type { GorkhToolCall, AppSettingsSetToolCall, AppFreeAiInstallToolCall } from '@ai-operator/shared';

// ---------------------------------------------------------------------------
// Snapshot type returned by the Rust gorkh_app_snapshot command
// ---------------------------------------------------------------------------

export interface GorkhSnapshotPermissions {
  screenRecording: 'granted' | 'denied' | 'unknown';
  accessibility: 'granted' | 'denied' | 'unknown';
}

export interface GorkhSnapshotFreeAi {
  runtimeRunning: boolean;
  installStage: string;
  selectedTier: string | null;
  selectedModel: string | null;
  externalServiceDetected: boolean;
}

export interface GorkhSnapshot {
  freeAi: GorkhSnapshotFreeAi;
  permissions: GorkhSnapshotPermissions;
  workspaceConfigured: boolean;
  workspaceRootName: string | null;
  autostartEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Read-only tool execution — no approval gate, result fed back to LLM
// ---------------------------------------------------------------------------

/**
 * Execute app.get_state — fetches the current GORKH app snapshot and formats it as
 * a plain-text string suitable for injection into the LLM's action history.
 */
export async function executeGorkhReadTool(toolCall: Extract<GorkhToolCall, { tool: 'app.get_state' }>): Promise<string> {
  void toolCall; // only one read tool variant today
  const snapshot = await invoke<GorkhSnapshot>('gorkh_app_snapshot');
  return formatSnapshotForLlm(snapshot);
}

function formatSnapshotForLlm(s: GorkhSnapshot): string {
  const lines: string[] = ['[GORKH APP STATE — refreshed]'];

  // Free AI
  const fai = s.freeAi;
  if (fai.runtimeRunning) {
    lines.push(`Free AI: running (model: ${fai.selectedModel ?? 'unknown'}, tier: ${fai.selectedTier ?? 'unknown'})`);
  } else {
    const stageLabel = s.freeAi.installStage.replace(/_/g, ' ');
    lines.push(`Free AI: not running (stage: ${stageLabel})`);
  }

  // Permissions
  lines.push(`Permissions — Screen Recording: ${s.permissions.screenRecording}, Accessibility: ${s.permissions.accessibility}`);

  // Workspace
  lines.push(s.workspaceConfigured
    ? `Workspace: configured (${s.workspaceRootName ?? 'unknown'})`
    : 'Workspace: not configured'
  );

  // Autostart
  lines.push(`Launch at login: ${s.autostartEnabled ? 'enabled' : 'disabled'}`);

  lines.push('[/GORKH APP STATE]');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Write tool execution — called after user approves
// ---------------------------------------------------------------------------

/** Execute settings.set — updates a safe GORKH setting. */
export async function executeSettingsSet(toolCall: AppSettingsSetToolCall): Promise<string> {
  const result = await invoke<{ ok: boolean; error?: string }>('gorkh_settings_set', {
    key: toolCall.key,
    value: toolCall.value,
  });

  if (result.ok) {
    return `Setting "${toolCall.key}" updated to ${toolCall.value}.`;
  }
  throw new Error(result.error ?? `Failed to update setting "${toolCall.key}"`);
}

/** Execute free_ai.install — triggers Free AI installation for the given tier. */
export async function executeFreeAiInstall(toolCall: AppFreeAiInstallToolCall): Promise<string> {
  await invoke('local_ai_install_start', { preferredTier: toolCall.tier });
  return `Free AI installation started (tier: ${toolCall.tier}). Installation will continue in the background — the progress card will update automatically.`;
}

/** Dispatch any GORKH write tool call. Returns a result string or throws. */
export async function executeGorkhWriteTool(
  toolCall: AppSettingsSetToolCall | AppFreeAiInstallToolCall
): Promise<string> {
  switch (toolCall.tool) {
    case 'settings.set':
      return executeSettingsSet(toolCall);
    case 'free_ai.install':
      return executeFreeAiInstall(toolCall);
  }
}
