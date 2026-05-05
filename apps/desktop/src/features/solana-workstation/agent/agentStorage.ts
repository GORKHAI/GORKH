import {
  SolanaAgentWorkspaceStateSchema,
  type SolanaAgentWorkspaceState,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.agent.workspace.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadAgentWorkspaceState(): SolanaAgentWorkspaceState | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const result = SolanaAgentWorkspaceStateSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    // eslint-disable-next-line no-console
    console.warn('[GORKH Agent] Stored workspace state was invalid and has been reset.', result.error);
    return null;
  } catch {
    return null;
  }
}

export function saveAgentWorkspaceState(state: SolanaAgentWorkspaceState): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled; fail silently
  }
}

export function clearAgentWorkspaceState(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createEmptyAgentWorkspaceState(now: number = Date.now()): SolanaAgentWorkspaceState {
  return {
    agents: [],
    selectedAgentId: undefined,
    drafts: [],
    attestationPreviews: [],
    auditEvents: [],
    updatedAt: now,
  };
}
