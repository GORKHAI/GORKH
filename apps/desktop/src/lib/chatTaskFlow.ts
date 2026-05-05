import type { RunWithSteps } from '@gorkh/shared';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';
import { createDesktopRun } from './desktopTasks.js';

const ACTIVE_RUN_STATUSES = new Set<RunWithSteps['status']>([
  'queued',
  'running',
  'waiting_for_user',
]);

export interface AssistantTaskConfirmation {
  goal: string;
  summary: string;
  prompt: string;
  providerMode?: 'local' | 'hosted_free_ai';
}

export function shouldConfirmAssistantTaskStart(run: RunWithSteps | null | undefined): boolean {
  return !isAssistantRunActive(run);
}

export function interpretAssistantTaskConfirmationResponse(text: string): 'confirm' | 'cancel' | null {
  const lower = text.trim().toLowerCase();

  // Positive confirmations
  const confirmPatterns = [
    /^yes$/,
    /^yeah$/,
    /^yep$/,
    /^sure$/,
    /^ok$/,
    /^okay$/,
    /^go ahead$/,
    /^do it$/,
    /^proceed$/,
    /^start$/,
    /^confirm$/,
    /^let['']?s do it$/,
    /^sounds good$/,
  ];

  for (const pattern of confirmPatterns) {
    if (pattern.test(lower)) {
      return 'confirm';
    }
  }

  // Cancellations
  const cancelPatterns = [
    /^no$/,
    /^nope$/,
    /^cancel$/,
    /^stop$/,
    /^don['']?t$/,
    /^nevermind$/,
    /^never mind$/,
    /^pass$/,
  ];

  for (const pattern of cancelPatterns) {
    if (pattern.test(lower)) {
      return 'cancel';
    }
  }

  return null;
}

export function isAssistantRunActive(run: RunWithSteps | null | undefined): boolean {
  if (!run) {
    return false;
  }

  return ACTIVE_RUN_STATUSES.has(run.status);
}

export async function ensureAssistantRunForMessage({
  message,
  activeRun,
  runtimeConfig,
  deviceToken,
}: {
  message: string;
  activeRun: RunWithSteps | null;
  runtimeConfig: DesktopApiRuntimeConfig;
  deviceToken: string;
}): Promise<RunWithSteps> {
  if (activeRun && isAssistantRunActive(activeRun)) {
    return activeRun;
  }

  return createDesktopRun(runtimeConfig, deviceToken, {
    goal: message,
    mode: 'ai_assist',
  });
}
