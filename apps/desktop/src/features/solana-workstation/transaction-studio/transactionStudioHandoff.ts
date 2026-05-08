import {
  TransactionStudioInputKind,
  TransactionStudioSource,
  type TransactionStudioHandoff,
  type TransactionStudioSource as TransactionStudioSourceType,
} from '@gorkh/shared';
import { classifyTransactionStudioInput } from './classifyTransactionStudioInput.js';
import { redactTransactionStudioInput } from './transactionStudioGuards.js';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTransactionStudioHandoff(input: {
  source: TransactionStudioSourceType;
  rawInput?: string;
  label?: string;
  decodedSummary?: string;
  warnings?: string[];
}): TransactionStudioHandoff {
  const redacted = redactTransactionStudioInput(input.rawInput ?? '');
  const kind = redacted.value
    ? classifyTransactionStudioInput(redacted.value)
    : input.source === TransactionStudioSource.CLOAK
      ? TransactionStudioInputKind.CLOAK_DRAFT
      : input.source === TransactionStudioSource.ZERION
        ? TransactionStudioInputKind.ZERION_PROPOSAL
        : input.source === TransactionStudioSource.AGENT
          ? TransactionStudioInputKind.AGENT_DRAFT
          : TransactionStudioInputKind.UNKNOWN;

  return {
    id: id('txs-handoff'),
    source: input.source,
    targetModule: 'transaction_studio',
    inputKind: kind,
    label: input.label ?? 'Transaction Studio review handoff',
    rawInput: redacted.value || undefined,
    decodedSummary: input.decodedSummary,
    executionBlocked: true,
    createdAt: Date.now(),
    warnings: [
      ...(input.warnings ?? []),
      ...redacted.redactionsApplied.map((redaction) => `Redaction applied: ${redaction}`),
      'Review-only handoff. Execution is blocked.',
    ],
  };
}
