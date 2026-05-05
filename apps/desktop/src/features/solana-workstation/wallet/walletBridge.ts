import {
  SolanaMarketsItemKind,
  SolanaMarketsItemStatus,
  type SolanaWalletProfile,
  type SolanaWalletSendDraft,
  type SolanaMarketsWatchlistItem,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// walletBridge.ts
// ----------------------------------------------------------------------------
// Pure helpers that connect wallet context to Markets, Agent, and Shield
// surfaces without fetching, analyzing, signing, or executing anything.
// ----------------------------------------------------------------------------

export interface MarketsWatchlistItemFromWallet {
  id: string;
  label: string;
  address: string;
  network: string;
  source: 'wallet_profile';
  addedAt: number;
  safetyNotes: string[];
}

export function createMarketsWatchlistItemFromWalletProfile(
  profile: SolanaWalletProfile
): MarketsWatchlistItemFromWallet | null {
  if (!profile.publicAddress) return null;
  return {
    id: `watchlist-from-wallet-${profile.id}`,
    label: profile.label,
    address: profile.publicAddress,
    network: profile.network,
    source: 'wallet_profile',
    addedAt: Date.now(),
    safetyNotes: [
      'Added from GORKH Wallet profile.',
      'No automatic fetch or analysis is triggered.',
      'Markets analysis is read-only and manual only.',
    ],
  };
}

export function buildMarketsWatchlistItemFromWalletProfile(
  profile: SolanaWalletProfile
): SolanaMarketsWatchlistItem | null {
  if (!profile.publicAddress) return null;
  const now = Date.now();
  return {
    id: `watchlist-from-wallet-${profile.id}`,
    address: profile.publicAddress,
    label: profile.label,
    kind: SolanaMarketsItemKind.WALLET,
    network: profile.network,
    status: SolanaMarketsItemStatus.IDLE,
    tags: ['from_wallet'],
    notes: 'Added from GORKH Wallet profile. No automatic fetch or analysis.',
    createdAt: now,
    updatedAt: now,
    localOnly: true,
  };
}

export interface AgentDraftMetadataFromWalletSend {
  title: string;
  description: string;
  walletProfileId: string;
  sendDraftId: string;
  recipient: string;
  amount: string;
  asset: string;
  route: string;
  network: string;
  safetyNotes: string[];
}

export function createAgentDraftMetadataFromWalletSendDraft(
  sendDraft: SolanaWalletSendDraft
): AgentDraftMetadataFromWalletSend {
  return {
    title: `Wallet send draft: ${sendDraft.assetSymbol} ${sendDraft.amountUi}`,
    description: `Private send draft via ${sendDraft.route} to ${sendDraft.recipientAddressOrLabel}. Blocked from execution.`,
    walletProfileId: sendDraft.walletProfileId,
    sendDraftId: sendDraft.id,
    recipient: sendDraft.recipientAddressOrLabel,
    amount: sendDraft.amountUi,
    asset: sendDraft.assetSymbol,
    route: sendDraft.route,
    network: sendDraft.network,
    safetyNotes: [
      'This is wallet send draft metadata only.',
      'No transaction, proof, or execution data is included.',
      ...sendDraft.safetyNotes,
    ],
  };
}

export interface ShieldInputFromWalletSend {
  recipient: string;
  amount: string;
  asset: string;
  network: string;
  route: string;
  blockedReasons: string[];
  safetyNotes: string[];
}

export function createShieldInputFromWalletSendDraft(
  sendDraft: SolanaWalletSendDraft
): ShieldInputFromWalletSend {
  return {
    recipient: sendDraft.recipientAddressOrLabel,
    amount: sendDraft.amountUi,
    asset: sendDraft.assetSymbol,
    network: sendDraft.network,
    route: sendDraft.route,
    blockedReasons: sendDraft.blockedReasons,
    safetyNotes: [
      'Shield input derived from wallet send draft.',
      'No on-chain data is fetched automatically.',
      ...sendDraft.safetyNotes,
    ],
  };
}
