import {
  SolanaPrivateWorkspaceStateSchema,
  type SolanaPrivateWorkspaceState,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.private.workspace.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPrivateWorkspaceState(): SolanaPrivateWorkspaceState | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = SolanaPrivateWorkspaceStateSchema.safeParse(parsed);
    if (result.success) return result.data;
    // eslint-disable-next-line no-console
    console.warn('[GORKH Private] Stored workspace state was invalid; resetting.', result.error);
    return null;
  } catch {
    return null;
  }
}

export function savePrivateWorkspaceState(state: SolanaPrivateWorkspaceState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full
  }
}

export function clearPrivateWorkspaceState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createEmptyPrivateWorkspaceState(now: number = Date.now()): SolanaPrivateWorkspaceState {
  return {
    drafts: [],
    routePlanPreviews: [],
    receiveRequests: [],
    updatedAt: now,
  };
}
