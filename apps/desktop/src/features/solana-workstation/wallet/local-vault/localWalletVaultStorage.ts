import { LocalWalletProfileSchema, type LocalWalletProfile } from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.wallet.localVaultMetadata.v1';
const SELECTED_KEY = 'gorkh.solana.wallet.selectedLocalWallet.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadLocalWalletProfiles(): LocalWalletProfile[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => LocalWalletProfileSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

export function saveLocalWalletProfiles(profiles: LocalWalletProfile[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function loadSelectedLocalWalletId(): string | null {
  return getStorage()?.getItem(SELECTED_KEY) ?? null;
}

export function saveSelectedLocalWalletId(walletId: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  if (walletId) {
    storage.setItem(SELECTED_KEY, walletId);
  } else {
    storage.removeItem(SELECTED_KEY);
  }
}

export function getLocalWalletPublicContext(): Pick<
  LocalWalletProfile,
  'walletId' | 'label' | 'publicAddress' | 'source' | 'securityStatus' | 'network'
> | null {
  const selectedId = loadSelectedLocalWalletId();
  const wallet = loadLocalWalletProfiles().find((profile) => profile.walletId === selectedId) ?? null;
  if (!wallet) return null;
  return {
    walletId: wallet.walletId,
    label: wallet.label,
    publicAddress: wallet.publicAddress,
    source: wallet.source,
    securityStatus: wallet.securityStatus,
    network: wallet.network,
  };
}
