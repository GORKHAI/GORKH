import { invoke } from '@tauri-apps/api/core';
import { LocalWalletProfileSchema, type LocalWalletProfile, type SolanaRpcNetwork } from '@gorkh/shared';

interface VaultProfilePayload {
  walletId: string;
  label: string;
  publicAddress: string;
  source: LocalWalletProfile['source'];
  securityStatus: LocalWalletProfile['securityStatus'];
  keychainAccount: string;
  network: SolanaRpcNetwork | 'mainnet';
  createdAt: number;
}

export function normalizeVaultNetwork(network: SolanaRpcNetwork | 'mainnet'): SolanaRpcNetwork {
  return network === 'mainnet' ? 'mainnet-beta' : network;
}

function toLocalWalletProfile(payload: VaultProfilePayload): LocalWalletProfile {
  const now = Date.now();
  return LocalWalletProfileSchema.parse({
    walletId: payload.walletId,
    label: payload.label,
    publicAddress: payload.publicAddress,
    source: payload.source,
    securityStatus: payload.securityStatus,
    keychainAccount: payload.keychainAccount,
    network: normalizeVaultNetwork(payload.network),
    createdAt: payload.createdAt,
    updatedAt: now,
    localOnly: true,
  });
}

export async function createLocalWallet(input: {
  label: string;
  network: SolanaRpcNetwork;
}): Promise<LocalWalletProfile> {
  const payload = await invoke<VaultProfilePayload>('wallet_vault_create', {
    request: input,
  });
  return toLocalWalletProfile(payload);
}

export async function importLocalWallet(input: {
  label: string;
  network: SolanaRpcNetwork;
  secret: string;
}): Promise<LocalWalletProfile> {
  const payload = await invoke<VaultProfilePayload>('wallet_vault_import', {
    request: input,
  });
  return toLocalWalletProfile(payload);
}

export async function forgetLocalWallet(walletId: string): Promise<void> {
  const result = await invoke<{ ok: boolean; error?: string }>('wallet_vault_forget', { walletId });
  if (!result.ok) {
    throw new Error(result.error ?? 'Failed to forget wallet.');
  }
}

export async function unlockLocalWallet(profile: LocalWalletProfile): Promise<LocalWalletProfile> {
  const status = await invoke<{
    walletId: string;
    publicAddress?: string;
    securityStatus: 'locked' | 'error';
    secretAvailable: boolean;
  }>('wallet_vault_status', { walletId: profile.walletId });

  if (!status.secretAvailable || status.publicAddress !== profile.publicAddress) {
    throw new Error('Wallet keychain entry is unavailable or does not match this wallet.');
  }

  return {
    ...profile,
    securityStatus: 'unlocked',
    updatedAt: Date.now(),
  };
}

export function lockLocalWallet(profile: LocalWalletProfile): LocalWalletProfile {
  return {
    ...profile,
    securityStatus: 'locked',
    updatedAt: Date.now(),
  };
}
