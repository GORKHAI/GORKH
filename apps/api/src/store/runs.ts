import type { RunWithSteps, RunStep, StepStatus, ApprovalRequest, LogLine } from '@ai-operator/shared';
import { RunStatus, ApprovalDecision } from '@ai-operator/shared';

// In-memory run store
const runs = new Map<string, RunWithSteps>();

// Track active run engines
const activeEngines = new Map<string, RunEngine>();

export interface RunInput {
  deviceId: string;
  goal: string;
}

export interface CreateStepInput {
  title: string;
}

// Generate deterministic steps for a run
export function generateRunSteps(_goal: string): RunStep[] {
  return [
    {
      stepId: 'step-1',
      title: 'Understand goal',
      status: 'pending' as StepStatus,
      logs: [],
    },
    {
      stepId: 'step-2',
      title: 'Propose approach',
      status: 'pending' as StepStatus,
      logs: [],
    },
    {
      stepId: 'step-3',
      title: 'Request approval to proceed',
      status: 'pending' as StepStatus,
      logs: [],
    },
    {
      stepId: 'step-4',
      title: 'Produce final result summary',
      status: 'pending' as StepStatus,
      logs: [],
    },
  ];
}

export const runStore = {
  get(runId: string): RunWithSteps | undefined {
    return runs.get(runId);
  },

  getByDevice(deviceId: string): RunWithSteps[] {
    return Array.from(runs.values()).filter((r) => r.deviceId === deviceId);
  },

  getAll(): RunWithSteps[] {
    return Array.from(runs.values());
  },

  create(input: RunInput): RunWithSteps {
    const now = Date.now();
    const run: RunWithSteps = {
      runId: crypto.randomUUID(),
      deviceId: input.deviceId,
      goal: input.goal,
      status: 'queued' as const,
      createdAt: now,
      updatedAt: now,
      steps: generateRunSteps(input.goal),
      messages: [],
    };

    runs.set(run.runId, run);
    return run;
  },

  updateStatus(runId: string, status: RunStatus, reason?: string): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run) return undefined;

    run.status = status;
    run.updatedAt = Date.now();
    if (reason) {
      run.reason = reason;
    }

    return run;
  },

  updateStep(runId: string, stepId: string, updates: Partial<RunStep>): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run) return undefined;

    const step = run.steps.find((s) => s.stepId === stepId);
    if (!step) return undefined;

    Object.assign(step, updates);
    run.updatedAt = Date.now();

    return run;
  },

  addLog(runId: string, stepId: string, log: LogLine): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run) return undefined;

    const step = run.steps.find((s) => s.stepId === stepId);
    if (!step) return undefined;

    step.logs.push(log);
    // Keep only last 1000 logs per step
    if (step.logs.length > 1000) {
      step.logs = step.logs.slice(-1000);
    }

    run.updatedAt = Date.now();
    return run;
  },

  setPendingApproval(runId: string, approval: ApprovalRequest): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run) return undefined;

    run.pendingApproval = approval;
    run.updatedAt = Date.now();
    return run;
  },

  resolveApproval(runId: string, decision: ApprovalDecision, comment?: string): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run || !run.pendingApproval) return undefined;

    run.pendingApproval.status = decision === 'approved' ? 'approved' : 'denied';
    run.pendingApproval.decisionAt = Date.now();
    run.updatedAt = Date.now();

    // Add as a message
    run.messages = run.messages ?? [];
    run.messages.push({
      role: 'agent',
      text: `Approval ${decision}${comment ? `: ${comment}` : ''}`,
      createdAt: Date.now(),
    });

    return run;
  },

  addMessage(runId: string, role: 'user' | 'agent', text: string): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run) return undefined;

    run.messages = run.messages ?? [];
    run.messages.push({
      role,
      text,
      createdAt: Date.now(),
    });
    run.updatedAt = Date.now();

    return run;
  },

  cancel(runId: string, reason: string): RunWithSteps | undefined {
    const run = runs.get(runId);
    if (!run) return undefined;

    // Can only cancel queued or running runs
    if (run.status !== 'queued' && run.status !== 'running' && run.status !== 'waiting_for_user') {
      return undefined;
    }

    run.status = 'canceled';
    run.reason = reason;
    run.updatedAt = Date.now();

    // Stop the engine if running
    const engine = activeEngines.get(runId);
    if (engine) {
      engine.stop();
      activeEngines.delete(runId);
    }

    return run;
  },

  // Engine management
  setEngine(runId: string, engine: RunEngine): void {
    activeEngines.set(runId, engine);
  },

  getEngine(runId: string): RunEngine | undefined {
    return activeEngines.get(runId);
  },

  deleteEngine(runId: string): void {
    activeEngines.delete(runId);
  },

  // Cleanup old completed/failed/canceled runs (call periodically)
  cleanupOldRuns(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let count = 0;

    for (const [id, run] of runs) {
      if ((run.status === 'done' || run.status === 'failed' || run.status === 'canceled') && run.updatedAt < cutoff) {
        runs.delete(id);
        activeEngines.delete(id);
        count++;
      }
    }

    return count;
  },
};

// Cleanup old runs every hour
setInterval(() => {
  const cleaned = runStore.cleanupOldRuns();
  if (cleaned > 0) {
    console.log(`[RunStore] Cleaned up ${cleaned} old runs`);
  }
}, 60 * 60_000);

// RunEngine interface (defined here to avoid circular dependency)
export interface RunEngine {
  start(): Promise<void>;
  stop(): void;
  handleApproval(decision: ApprovalDecision, comment?: string): void;
}
