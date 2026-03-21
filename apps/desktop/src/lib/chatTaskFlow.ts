import type { RunWithSteps } from '@ai-operator/shared';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';
import { createDesktopRun } from './desktopTasks.js';

const ACTIVE_RUN_STATUSES = new Set<RunWithSteps['status']>([
  'queued',
  'running',
  'waiting_for_user',
]);

export const ASSISTANT_OPENING_GOAL =
  'Ask the user what they want done on this desktop, then wait for their reply before taking any action.';

export function isAssistantOpeningGoal(goal: string | null | undefined): boolean {
  return (goal ?? '').trim() === ASSISTANT_OPENING_GOAL;
}

export function getAssistantDisplayGoal(
  goal: string | null | undefined,
  latestUserMessage?: string | null
): string {
  if (!isAssistantOpeningGoal(goal)) {
    return goal?.trim() || 'Ready for your instructions';
  }

  const trimmedUserMessage = latestUserMessage?.trim();
  return trimmedUserMessage || 'Ready for your instructions';
}

interface EnsureAssistantRunForMessageInput {
  message: string;
  activeRun: RunWithSteps | null;
  runtimeConfig: DesktopApiRuntimeConfig;
  deviceToken: string;
  createRun?: typeof createDesktopRun;
}

export function isAssistantRunActive(run: RunWithSteps | null | undefined): run is RunWithSteps {
  return Boolean(run && ACTIVE_RUN_STATUSES.has(run.status));
}

export async function ensureAssistantRunForMessage(
  input: EnsureAssistantRunForMessageInput
): Promise<RunWithSteps> {
  if (isAssistantRunActive(input.activeRun)) {
    return input.activeRun;
  }

  const createRun = input.createRun ?? createDesktopRun;
  return createRun(input.runtimeConfig, input.deviceToken, {
    goal: input.message.trim(),
    mode: 'ai_assist',
  });
}
