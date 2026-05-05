import {
  SolanaMarketsItemKind,
  SolanaMarketsItemStatus,
  type SolanaWalletPortfolioTokenHolding,
  type SolanaMarketsWatchlistItem,
  type SolanaRpcNetwork,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// buildMarketsWatchlistItemFromTokenHolding
// ----------------------------------------------------------------------------
// Creates a Markets watchlist item from a wallet portfolio token holding.
// No automatic fetch or analysis. localOnly only.
// ----------------------------------------------------------------------------

export function buildMarketsWatchlistItemFromTokenHolding(
  holding: SolanaWalletPortfolioTokenHolding,
  network: SolanaRpcNetwork,
  walletProfileId?: string
): SolanaMarketsWatchlistItem {
  const now = Date.now();
  const label = holding.symbol ?? holding.label ?? `${holding.mint.slice(0, 10)}…`;
  const tags = ['wallet_holding'];
  if (walletProfileId) {
    tags.push(`wallet_profile:${walletProfileId}`);
  }

  return {
    id: `watchlist-token-${holding.mint.slice(0, 16)}-${network}`,
    address: holding.mint,
    label,
    kind: SolanaMarketsItemKind.TOKEN_MINT,
    network,
    status: SolanaMarketsItemStatus.IDLE,
    tags,
    notes: `Added from wallet portfolio. Token accounts: ${holding.tokenAccountCount}. No automatic fetch or analysis.`,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
  };
}
