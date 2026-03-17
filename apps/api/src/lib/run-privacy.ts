import type { RunWithSteps } from '@ai-operator/shared';
import { sanitizeAgentProposalForPersistence, sanitizeRunLogLine } from '@ai-operator/shared';

export function sanitizeRunForPersistence(run: RunWithSteps): RunWithSteps {
  return {
    ...run,
    latestProposal: run.latestProposal ? sanitizeAgentProposalForPersistence(run.latestProposal) : undefined,
    steps: run.steps.map((step) => ({
      ...step,
      logs: step.logs.map((log) => ({
        ...log,
        line: sanitizeRunLogLine(log.line),
      })),
    })),
  };
}
