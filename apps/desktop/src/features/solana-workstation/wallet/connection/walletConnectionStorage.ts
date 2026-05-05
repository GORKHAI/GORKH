import {
  SolanaWalletConnectionStateSchema,
  type SolanaWalletConnectionState,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.wallet.connection.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadWalletConnectionState(): SolanaWalletConnectionState | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = SolanaWalletConnectionStateSchema.safeParse(parsed);
    if (result.success) return result.data;
    // eslint-disable-next-line no-console
    console.warn('[GORKH Wallet] Stored connection state was invalid; resetting.', result.error);
    return null;
  } catch {
    return null;
  }
}

export function saveWalletConnectionState(state: SolanaWalletConnectionState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full
  }
}

export function clearWalletConnectionState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createEmptyWalletConnectionState(
  now: number = Date.now()
): SolanaWalletConnectionState {
  return {
    status: 'disconnected',
    network: 'devnet',
    capabilities: [
      {
        name: 'read_address',
        status: 'enabled_read_only',
        safetyNote: 'Public address is read from the connected wallet.',
      },
      {
        name: 'sign_transaction',
        status: 'disabled_signing',
        safetyNote: 'Signing is disabled in Phase 13.',
      },
      {
        name: 'sign_message',
        status: 'disabled_signing',
        safetyNote: 'Message signing is disabled in Phase 13.',
      },
      {
        name: 'send_transaction',
        status: 'disabled_execution',
        safetyNote: 'Transaction execution is disabled in Phase 13.',
      },
      {
        name: 'local_generated_wallet',
        status: 'planned',
        safetyNote: 'Local generated wallet is planned for a future phase.',
      },
    ],
    updatedAt: now,
  };
}
