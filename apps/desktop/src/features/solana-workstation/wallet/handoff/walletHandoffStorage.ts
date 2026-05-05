import { SolanaWalletHandoffRequestSchema } from '@gorkh/shared';
import type { SolanaWalletHandoffRequest } from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.wallet.handoff.request.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPendingHandoffRequest(): SolanaWalletHandoffRequest | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const validated = SolanaWalletHandoffRequestSchema.safeParse(parsed);
    if (!validated.success) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    // Auto-clear expired requests
    if (Date.now() > validated.data.expiry) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return validated.data;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function savePendingHandoffRequest(request: SolanaWalletHandoffRequest): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(request));
  } catch {
    // Best-effort only.
  }
}

export function clearPendingHandoffRequest(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort only.
  }
}
