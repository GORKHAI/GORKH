import {
  SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES,
  type SolanaExternalWalletProvider,
  type SolanaRpcNetwork,
} from '@gorkh/shared';
import { createWalletProfile } from '../createWalletProfile.js';

// ----------------------------------------------------------------------------
// createWalletProfileFromConnection.ts
// ----------------------------------------------------------------------------
// Creates a local wallet profile from an external wallet connection.
// Only public address is used. No adapter objects. No signing.
// ----------------------------------------------------------------------------

export interface WalletProfileFromConnectionInput {
  provider: SolanaExternalWalletProvider;
  publicAddress: string;
  network: SolanaRpcNetwork;
}

export function createWalletProfileFromConnection(input: WalletProfileFromConnectionInput) {
  const { provider, publicAddress, network } = input;

  return createWalletProfile({
    label: `${capitalize(provider)} Wallet`,
    publicAddress,
    network,
    preferredPrivateRoute: 'manual_privacy_review_only' as const,
    tags: ['external_wallet', provider],
    notes: `Connected via ${capitalize(provider)}. Read-only in Phase 13.`,
  });
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getConnectionSafetyNotes(provider: SolanaExternalWalletProvider): string[] {
  return [
    ...SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES,
    `Connected via ${capitalize(provider)}.`,
    'Only the public address is stored locally.',
    'No adapter object, permissions, or signatures are stored.',
  ];
}
