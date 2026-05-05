import {
  SOLANA_WALLET_PHASE_10_SAFETY_NOTES,
  SOLANA_WALLET_READ_ONLY_SAFETY_NOTES,
  SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES,
  SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
  type SolanaWalletWorkspaceState,
  type SolanaWalletContextSummary,
  type SolanaRpcNetwork,
} from '@gorkh/shared';
import { loadWalletConnectionState } from './connection/walletConnectionStorage.js';
import { loadVerifiedOwnershipProofs } from './ownership/ownershipProofStorage.js';
import { createWalletPortfolioSummary } from './portfolio/createWalletPortfolioSummary.js';

export function createWalletContextSummary(
  state: SolanaWalletWorkspaceState,
  network: SolanaRpcNetwork,
  selectedProfileId?: string
): SolanaWalletContextSummary {
  const now = new Date().toISOString();
  const selectedProfile = state.profiles.find((p) => p.id === selectedProfileId) ?? state.profiles[0] ?? null;
  const latestSnapshot = selectedProfile
    ? state.readOnlySnapshots.find((s) => s.walletProfileId === selectedProfile.id)
    : null;

  const activeSendDrafts = state.sendDrafts.filter(
    (d) => d.status !== 'rejected_local' && d.status !== 'archived_local'
  );

  const connectionState = loadWalletConnectionState();
  const verifiedOwnerships = loadVerifiedOwnershipProofs();

  const profileOwnership = selectedProfile?.publicAddress
    ? verifiedOwnerships.find((o) => o.publicAddress === selectedProfile.publicAddress)
    : null;

  const portfolio = selectedProfile && latestSnapshot
    ? createWalletPortfolioSummary({
        walletProfile: selectedProfile,
        snapshot: latestSnapshot,
        ownershipProofStatus: profileOwnership ? 'verified' : undefined,
        ownershipVerifiedAt: profileOwnership?.verifiedAt,
      })
    : null;

  const lines: string[] = [];
  lines.push('# GORKH Wallet Context');
  lines.push('');
  lines.push('> **Wallet shell only.** No private transfer, signing, or trading execution is available in this phase.');
  lines.push('');
  lines.push('## Overview');
  lines.push(`- **Network:** ${network}`);
  if (selectedProfile) {
    lines.push(`- **Selected profile:** ${selectedProfile.label}`);
    if (selectedProfile.publicAddress) {
      lines.push(`- **Public address:** ${selectedProfile.publicAddress}`);
    }
    lines.push(`- **Preferred route:** ${selectedProfile.preferredPrivateRoute}`);
  }
  if (connectionState?.status === 'connected_read_only') {
    lines.push(`- **External wallet:** ${connectionState.provider ?? 'unknown'}`);
    lines.push(`- **Connection status:** connected_read_only`);
  }
  if (profileOwnership) {
    lines.push(`- **Ownership proof:** ${profileOwnership.verifier === 'local_ed25519' ? 'Verified (Ed25519)' : 'Browser provider claim'}`);
    lines.push(`- **Verified at:** ${new Date(profileOwnership.verifiedAt).toISOString()}`);
  }
  lines.push(`- **Receive requests:** ${state.receiveRequests.length}`);
  lines.push(`- **Send drafts:** ${activeSendDrafts.length}`);
  lines.push(`- **Profiles:** ${state.profiles.length}`);
  if (latestSnapshot) {
    lines.push(`- **Latest snapshot SOL:** ${latestSnapshot.solBalanceUi ?? '—'} SOL`);
    lines.push(`- **Token accounts:** ${latestSnapshot.tokenAccountCount ?? 0}`);
    lines.push(`- **Snapshot fetched:** ${latestSnapshot.fetchedAt ? new Date(latestSnapshot.fetchedAt).toISOString() : '—'}`);
  }
  lines.push(`- **Generated:** ${now}`);
  lines.push('');

  if (state.profiles.length > 0) {
    lines.push('## Wallet Profiles');
    for (const profile of state.profiles) {
      lines.push(`### ${profile.label}`);
      lines.push(`- **Status:** ${profile.status}`);
      lines.push(`- **Network:** ${profile.network}`);
      if (profile.publicAddress) {
        lines.push(`- **Address:** ${profile.publicAddress}`);
      }
      const ownership = verifiedOwnerships.find((o) => o.publicAddress === profile.publicAddress);
      if (ownership) {
        lines.push(`- **Ownership:** ${ownership.verifier === 'local_ed25519' ? 'Verified' : 'Claimed'}`);
      }
      lines.push(`- **Preferred route:** ${profile.preferredPrivateRoute}`);
      if (profile.tags.length > 0) {
        lines.push(`- **Tags:** ${profile.tags.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (state.receiveRequests.length > 0) {
    lines.push('## Receive Requests');
    for (const r of state.receiveRequests) {
      lines.push(`- **${r.label}** — ${r.requestedAssetSymbol} ${r.requestedAmountUi ?? ''} (${r.route})`);
    }
    lines.push('');
  }

  if (activeSendDrafts.length > 0) {
    lines.push('## Send Drafts');
    for (const d of activeSendDrafts) {
      lines.push(`### ${d.assetSymbol} ${d.amountUi}`);
      lines.push(`- **Recipient:** ${d.recipientAddressOrLabel}`);
      lines.push(`- **Route:** ${d.route}`);
      lines.push(`- **Risk:** ${d.riskLevel}`);
      lines.push(`- **Blocked reasons:** ${d.blockedReasons.length}`);
      lines.push('');
    }
  }

  if (latestSnapshot) {
    lines.push('## Latest Read-Only Snapshot');
    lines.push(`- **Address:** ${latestSnapshot.address}`);
    lines.push(`- **Network:** ${latestSnapshot.network}`);
    lines.push(`- **SOL Balance:** ${latestSnapshot.solBalanceUi ?? '—'} SOL`);
    lines.push(`- **Token Accounts:** ${latestSnapshot.tokenAccountCount ?? 0}`);
    if (latestSnapshot.tokenAccountsPreview.length > 0) {
      lines.push('### Token Accounts Preview');
      for (const t of latestSnapshot.tokenAccountsPreview.slice(0, 5)) {
        lines.push(`- ${t.mint.slice(0, 16)}… — ${t.amountUi ?? t.amountRaw ?? '—'}`);
      }
    }
    lines.push('');
    lines.push('> Snapshot is public RPC data and not a wallet ownership proof.');
    lines.push('');
  }

  if (portfolio) {
    lines.push('## Portfolio Summary');
    lines.push(`- **Token Holdings:** ${portfolio.tokenHoldingCount}`);
    lines.push(`- **Token Accounts:** ${portfolio.tokenAccountCount}`);
    if (portfolio.holdings.length > 0) {
      lines.push('### Holdings');
      for (const h of portfolio.holdings.slice(0, 10)) {
        const label = h.symbol ?? h.label ?? `${h.mint.slice(0, 12)}…`;
        lines.push(`- ${label}: ${h.amountUi ?? h.amountRaw ?? '—'} (${h.tokenAccountCount} account${h.tokenAccountCount === 1 ? '' : 's'})`);
      }
    }
    if (portfolio.warnings.length > 0) {
      lines.push('### Portfolio Warnings');
      for (const w of portfolio.warnings) {
        lines.push(`- ${w}`);
      }
    }
    lines.push('');
  }

  lines.push('## Safety Notes');
  for (const note of SOLANA_WALLET_PHASE_10_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  if (latestSnapshot) {
    for (const note of SOLANA_WALLET_READ_ONLY_SAFETY_NOTES) {
      lines.push(`- ${note}`);
    }
  }
  if (connectionState?.status === 'connected_read_only') {
    for (const note of SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES) {
      lines.push(`- ${note}`);
    }
  }
  if (profileOwnership) {
    lines.push('- Ownership proof does not authorize transactions.');
  }
  lines.push('');

  return {
    generatedAt: now,
    selectedProfileLabel: selectedProfile?.label,
    selectedProfileAddress: selectedProfile?.publicAddress,
    network,
    receiveRequestCount: state.receiveRequests.length,
    sendDraftCount: activeSendDrafts.length,
    snapshotSolBalance: latestSnapshot?.solBalanceUi,
    snapshotTokenAccountCount: latestSnapshot?.tokenAccountCount,
    snapshotFetchedAt: latestSnapshot?.fetchedAt,
    markdown: lines.join('\n'),
    redactionsApplied: [],
    safetyNotes: [
      ...SOLANA_WALLET_PHASE_10_SAFETY_NOTES,
      ...(latestSnapshot ? SOLANA_WALLET_READ_ONLY_SAFETY_NOTES : []),
      ...(connectionState?.status === 'connected_read_only' ? SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES : []),
      ...(profileOwnership ? ['Ownership proof does not authorize transactions.'] : []),
    ...(portfolio ? SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES : []),
    ],
  };
}
