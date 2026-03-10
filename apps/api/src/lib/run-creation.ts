import { DEFAULT_RUN_CONSTRAINTS, type Device, type RunMode } from '@ai-operator/shared';
import type { RunWithSteps } from '@ai-operator/shared';
import type { runsRepo } from '../repos/runs.js';
import type { runStore } from '../store/runs.js';
import type { ownership } from './ownership.js';

interface CreateRunForOwnedDeviceInput {
  userId: string;
  device: Pick<Device, 'deviceId' | 'connected'>;
  goal: string;
  mode?: RunMode;
  queueEnabled?: boolean;
  runStore: Pick<typeof runStore, 'create'>;
  ownership: Pick<typeof ownership, 'setRunOwner'>;
  runsRepo: Pick<typeof runsRepo, 'save'>;
  dispatchRunStart: (
    deviceId: string,
    payload: {
      runId: string;
      goal: string;
      mode: RunMode;
      constraints: typeof DEFAULT_RUN_CONSTRAINTS | undefined;
    }
  ) => Promise<{ queued: boolean; delivered: boolean }>;
}

export async function createRunForOwnedDevice(input: CreateRunForOwnedDeviceInput): Promise<{
  run: RunWithSteps;
  mode: RunMode;
  constraints: typeof DEFAULT_RUN_CONSTRAINTS | undefined;
  delivery: { queued: boolean; delivered: boolean } | null;
}> {
  const mode: RunMode = input.mode === 'ai_assist' ? 'ai_assist' : 'manual';
  const constraints = mode === 'ai_assist' ? DEFAULT_RUN_CONSTRAINTS : undefined;
  const run = input.runStore.create({
    deviceId: input.device.deviceId,
    goal: input.goal,
    mode,
    constraints,
  });

  input.ownership.setRunOwner(run.runId, input.userId);
  await input.runsRepo.save(run, input.userId);

  let delivery: { queued: boolean; delivered: boolean } | null = null;
  if (input.device.connected || input.queueEnabled) {
    delivery = await input.dispatchRunStart(input.device.deviceId, {
      runId: run.runId,
      goal: input.goal,
      mode,
      constraints,
    });
  }

  return {
    run,
    mode,
    constraints,
    delivery,
  };
}
