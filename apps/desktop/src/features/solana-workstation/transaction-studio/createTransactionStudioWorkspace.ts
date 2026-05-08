import {
  SolanaRpcNetwork,
  TransactionStudioInputKind,
  TransactionStudioSource,
  type TransactionStudioInput,
  type TransactionStudioSource as TransactionStudioSourceType,
  type TransactionStudioWorkspaceState,
} from '@gorkh/shared';
import { classifyTransactionStudioInput } from './classifyTransactionStudioInput.js';
import { redactTransactionStudioInput } from './transactionStudioGuards.js';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTransactionStudioInput(input: {
  rawInput: string;
  source?: TransactionStudioSourceType;
  label?: string;
  kind?: TransactionStudioInput['kind'];
}): TransactionStudioInput {
  const redacted = redactTransactionStudioInput(input.rawInput);
  return {
    id: id('txs-input'),
    kind: input.kind ?? classifyTransactionStudioInput(redacted.value),
    source: input.source ?? TransactionStudioSource.PASTED,
    rawInput: redacted.value.slice(0, 32_000),
    label: input.label,
    createdAt: Date.now(),
    redactionsApplied: redacted.redactionsApplied,
    localOnly: true,
  };
}

export function createEmptyTransactionStudioWorkspace(): TransactionStudioWorkspaceState {
  return {
    id: id('txs-workspace'),
    selectedNetwork: SolanaRpcNetwork.DEVNET,
    selectedEndpoint: undefined,
    activeInput: undefined,
    activeDecodedTransaction: undefined,
    activeSimulation: undefined,
    activeRiskReport: undefined,
    activeExplanation: undefined,
    lastUpdatedAt: Date.now(),
    localOnly: true,
  };
}

export function createUnsupportedTransactionStudioInput(rawInput: string): TransactionStudioInput {
  return createTransactionStudioInput({
    rawInput,
    kind: TransactionStudioInputKind.UNKNOWN,
    source: TransactionStudioSource.PASTED,
    label: 'Unsupported input',
  });
}
