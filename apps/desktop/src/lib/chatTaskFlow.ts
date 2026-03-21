import type { RunWithSteps } from '@ai-operator/shared';
import type { DesktopApiRuntimeConfig } from './desktopRuntimeConfig.js';
import { createDesktopRun } from './desktopTasks.js';

const ACTIVE_RUN_STATUSES = new Set<RunWithSteps['status']>([
  'queued',
  'running',
  'waiting_for_user',
]);

// Marker prefix used to identify any GORKH opening goal variant (regardless of app state)
const OPENING_GOAL_MARKER = '[GORKH_OPENING]';

export const ASSISTANT_OPENING_GOAL =
  `${OPENING_GOAL_MARKER} Greet the user as GORKH. Briefly explain that you can automate tasks, explain your settings and features, and guide setup. Ask what they would like help with today, then wait for their reply before taking any action.`;

/**
 * Build a context-aware opening goal that tailors the greeting based on whether
 * Free AI is ready. When not ready, the assistant proactively offers to set it up.
 */
export function buildAssistantOpeningGoal(freeAiReady: boolean): string {
  if (!freeAiReady) {
    return `${OPENING_GOAL_MARKER} Greet the user as GORKH. Let them know that Free AI (the free local model) is not set up yet and offer to set it up directly from this chat using your tools. Briefly explain your key features. Ask if they would like to set up Free AI now or if you can help with something else. Wait for their reply before taking any action.`;
  }
  return ASSISTANT_OPENING_GOAL;
}

export function isAssistantOpeningGoal(goal: string | null | undefined): boolean {
  return (goal ?? '').trim().startsWith(OPENING_GOAL_MARKER);
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
