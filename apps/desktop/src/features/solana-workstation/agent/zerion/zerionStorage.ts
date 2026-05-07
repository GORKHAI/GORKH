import {
  ZERION_DEFAULT_BINARY,
  ZerionAgentPolicySchema,
  ZerionAgentProposalSchema,
  ZerionAuditEventSchema,
  ZerionExecutionResultSchema,
  type ZerionAgentPolicy,
  type ZerionAgentProposal,
  type ZerionAuditEvent,
  type ZerionExecutionResult,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.agent.zerion.metadata.v1';
const FORBIDDEN_KEYS = ['apiKey', 'agentToken', 'privateKey', 'seedPhrase', 'mnemonic', 'walletBackup'];

export interface ZerionLocalState {
  binary: string;
  selectedWalletName?: string;
  policy?: ZerionAgentPolicy;
  proposal?: ZerionAgentProposal;
  lastResult?: ZerionExecutionResult;
  auditEvents: ZerionAuditEvent[];
  updatedAt: number;
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function assertNoForbiddenMetadata(value: unknown): void {
  const text = JSON.stringify(value);
  for (const key of FORBIDDEN_KEYS) {
    if (text.includes(key)) {
      throw new Error(`Zerion local metadata must not include ${key}.`);
    }
  }
  if (/zk_[A-Za-z0-9_-]+/.test(text)) {
    throw new Error('Zerion API keys must not be stored in localStorage.');
  }
}

export function createEmptyZerionLocalState(now: number = Date.now()): ZerionLocalState {
  return {
    binary: ZERION_DEFAULT_BINARY,
    auditEvents: [],
    updatedAt: now,
  };
}

export function loadZerionLocalState(): ZerionLocalState {
  const storage = getStorage();
  if (!storage) return createEmptyZerionLocalState();
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyZerionLocalState();
  try {
    const parsed = JSON.parse(raw) as Partial<ZerionLocalState>;
    return {
      binary: typeof parsed.binary === 'string' ? parsed.binary : ZERION_DEFAULT_BINARY,
      selectedWalletName: typeof parsed.selectedWalletName === 'string' ? parsed.selectedWalletName : undefined,
      policy: parsed.policy ? ZerionAgentPolicySchema.parse(parsed.policy) : undefined,
      proposal: parsed.proposal ? ZerionAgentProposalSchema.parse(parsed.proposal) : undefined,
      lastResult: parsed.lastResult ? ZerionExecutionResultSchema.parse(parsed.lastResult) : undefined,
      auditEvents: Array.isArray(parsed.auditEvents)
        ? parsed.auditEvents.map((event) => ZerionAuditEventSchema.parse(event))
        : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return createEmptyZerionLocalState();
  }
}

export function saveZerionLocalState(state: ZerionLocalState): void {
  assertNoForbiddenMetadata(state);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

