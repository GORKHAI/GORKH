import {
  SolanaWalletProfileStatus,
  type SolanaWalletProfile,
  type SolanaWalletRouteKind,
  type SolanaRpcNetwork,
} from '@gorkh/shared';
import { validateWalletPublicAddress } from './walletGuards.js';

export interface CreateWalletProfileInput {
  label: string;
  publicAddress?: string;
  network: SolanaRpcNetwork;
  preferredPrivateRoute: SolanaWalletRouteKind;
  notes?: string;
  tags?: string[];
}

export function createWalletProfile(
  input: CreateWalletProfileInput,
  now: number = Date.now()
): SolanaWalletProfile {
  if (input.publicAddress) {
    const error = validateWalletPublicAddress(input.publicAddress);
    if (error) {
      throw new Error(error);
    }
  }

  const status = input.publicAddress
    ? SolanaWalletProfileStatus.ADDRESS_ONLY
    : SolanaWalletProfileStatus.LOCAL_PROFILE;

  return {
    id: `wallet-profile-${now}`,
    label: input.label.trim(),
    publicAddress: input.publicAddress?.trim(),
    network: input.network,
    status,
    preferredPrivateRoute: input.preferredPrivateRoute,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: [
      'This is a local wallet profile only.',
      'No private key, seed phrase, or wallet JSON is stored.',
      input.publicAddress
        ? 'Public address is stored for reference only.'
        : 'No public address is configured.',
      'Wallet connection, signing, and execution are not available in Phase 10.',
    ],
  };
}
