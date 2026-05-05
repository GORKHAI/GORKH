import type { RunWithSteps } from '@gorkh/shared';
import { sanitizeAgentProposalForPersistence, sanitizeRunLogLine } from '@gorkh/shared';

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
