import {
  SolanaWalletWorkspaceStateSchema,
  type SolanaWalletWorkspaceState,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.wallet.workspace.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadWalletWorkspaceState(): SolanaWalletWorkspaceState | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = SolanaWalletWorkspaceStateSchema.safeParse(parsed);
    if (result.success) return result.data;
    // eslint-disable-next-line no-console
    console.warn('[GORKH Wallet] Stored workspace state was invalid; resetting.', result.error);
    return null;
  } catch {
    return null;
  }
}

export function saveWalletWorkspaceState(state: SolanaWalletWorkspaceState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full
  }
}

export function clearWalletWorkspaceState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createEmptyWalletWorkspaceState(now: number = Date.now()): SolanaWalletWorkspaceState {
  return {
    profiles: [],
    receiveRequests: [],
    sendDrafts: [],
    readOnlySnapshots: [],
    updatedAt: now,
  };
}
