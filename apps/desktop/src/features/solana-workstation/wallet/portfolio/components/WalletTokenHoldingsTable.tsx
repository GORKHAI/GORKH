import type { SolanaWalletPortfolioTokenHolding } from '@gorkh/shared';
import { WalletHoldingCard } from './WalletHoldingCard.js';

export interface WalletTokenHoldingsTableProps {
  holdings: SolanaWalletPortfolioTokenHolding[];
  watchlistAddresses?: Set<string>;
  onAddToMarkets?: (holding: SolanaWalletPortfolioTokenHolding) => void;
  onCopyMint?: (mint: string) => void;
}

export function WalletTokenHoldingsTable({
  holdings,
  watchlistAddresses,
  onAddToMarkets,
  onCopyMint,
}: WalletTokenHoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          fontSize: '0.8rem',
          color: '#64748b',
        }}
      >
        No token holdings found in the latest snapshot.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {holdings.map((holding) => (
        <WalletHoldingCard
          key={holding.mint}
          holding={holding}
          isInWatchlist={watchlistAddresses?.has(holding.mint) ?? false}
          onAddToMarkets={onAddToMarkets ? () => onAddToMarkets(holding) : undefined}
          onCopyMint={onCopyMint ? () => onCopyMint(holding.mint) : undefined}
        />
      ))}
    </div>
  );
}
