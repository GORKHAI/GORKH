import { SolanaMarketsWorkspaceStateSchema, type SolanaMarketsWorkspaceState } from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.markets.workspace.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadMarketsWorkspaceState(): SolanaMarketsWorkspaceState | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = SolanaMarketsWorkspaceStateSchema.safeParse(parsed);
    if (result.success) return result.data;
    // eslint-disable-next-line no-console
    console.warn('[GORKH Markets] Stored workspace state was invalid; resetting.', result.error);
    return null;
  } catch {
    return null;
  }
}

export function saveMarketsWorkspaceState(state: SolanaMarketsWorkspaceState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full
  }
}

export function clearMarketsWorkspaceState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createEmptyMarketsWorkspaceState(now: number = Date.now()): SolanaMarketsWorkspaceState {
  return {
    watchlist: [],
    analyses: [],
    updatedAt: now,
  };
}
