import {
  TransactionStudioWorkspaceStateSchema,
  type TransactionStudioWorkspaceState,
} from '@gorkh/shared';
import { createEmptyTransactionStudioWorkspace } from './createTransactionStudioWorkspace.js';

export const TRANSACTION_STUDIO_CONTEXT_STORAGE_KEY =
  'gorkh.solana.transactionStudio.lastContext.v1';
export const TRANSACTION_STUDIO_WORKSPACE_STORAGE_KEY =
  'gorkh.solana.transactionStudio.workspace.v1';

function hasLocalStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined';
}

const CONTEXT_FORBIDDEN_PATTERNS: RegExp[] = [
  /privateKey/i,
  /private[\s-]+key/i,
  /seed[\s-]+phrase/i,
  /wallet[\s-]+json/i,
  /secretKey/i,
  /cloak[\s-]+note/i,
  /viewing[\s-]+key/i,
  /zerion.*(?:api[\s-]+key|token)/i,
  /api[\s-]+key/i,
  /bearer\s+[a-z0-9._-]{16,}/i,
  /raw(?:Transaction|Tx|Payload)/i,
];

export function assertSafeTransactionStudioContext(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const pattern of CONTEXT_FORBIDDEN_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error('Transaction Studio context snapshot contains forbidden secret or raw payload material.');
    }
  }
}

export function loadTransactionStudioWorkspace(): TransactionStudioWorkspaceState {
  if (!hasLocalStorage()) return createEmptyTransactionStudioWorkspace();
  const raw = globalThis.localStorage.getItem(TRANSACTION_STUDIO_WORKSPACE_STORAGE_KEY);
  if (!raw) return createEmptyTransactionStudioWorkspace();
  try {
    return TransactionStudioWorkspaceStateSchema.parse(JSON.parse(raw));
  } catch {
    return createEmptyTransactionStudioWorkspace();
  }
}

export function saveTransactionStudioWorkspace(state: TransactionStudioWorkspaceState): void {
  if (!hasLocalStorage()) return;
  const sanitized: TransactionStudioWorkspaceState = {
    ...state,
    activeInput: state.activeInput
      ? {
          ...state.activeInput,
          rawInput:
            state.activeInput.kind === 'signature' || state.activeInput.kind === 'address'
              ? state.activeInput.rawInput
              : '[raw transaction excluded from workspace persistence]',
          redactionsApplied: [
            ...state.activeInput.redactionsApplied,
            'transactionStudio.workspace.rawTransactionExcluded',
          ],
        }
      : undefined,
  };
  globalThis.localStorage.setItem(
    TRANSACTION_STUDIO_WORKSPACE_STORAGE_KEY,
    JSON.stringify(sanitized)
  );
}

export function saveTransactionStudioLastContext(value: unknown): void {
  assertSafeTransactionStudioContext(value);
  if (!hasLocalStorage()) return;
  globalThis.localStorage.setItem(TRANSACTION_STUDIO_CONTEXT_STORAGE_KEY, JSON.stringify(value));
}

export function loadTransactionStudioLastContext(): unknown | null {
  if (!hasLocalStorage()) return null;
  const raw = globalThis.localStorage.getItem(TRANSACTION_STUDIO_CONTEXT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTransactionStudioWorkspace(): void {
  if (!hasLocalStorage()) return;
  globalThis.localStorage.removeItem(TRANSACTION_STUDIO_WORKSPACE_STORAGE_KEY);
}
