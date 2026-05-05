import type { SolanaWalletPortfolioTokenHolding } from '@gorkh/shared';

export interface WalletHoldingCardProps {
  holding: SolanaWalletPortfolioTokenHolding;
  onAddToMarkets?: () => void;
  onCopyMint?: () => void;
  isInWatchlist?: boolean;
}

export function WalletHoldingCard({ holding, onAddToMarkets, onCopyMint, isInWatchlist }: WalletHoldingCardProps) {
  const displayLabel = holding.symbol ?? holding.label ?? `${holding.mint.slice(0, 12)}…`;

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{displayLabel}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {holding.amountUi ?? holding.amountRaw ?? '—'}
        </span>
      </div>

      <div style={{ fontSize: '0.72rem', color: '#94a3b8', wordBreak: 'break-all' }}>
        Mint: {holding.mint}
      </div>

      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
        Token accounts: {holding.tokenAccountCount}
        {holding.decimals !== undefined && ` · Decimals: ${holding.decimals}`}
      </div>

      {holding.warnings.length > 0 && (
        <div
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '4px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.72rem',
            color: '#991b1b',
          }}
        >
          {holding.warnings.map((w: string, i: number) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
        {onAddToMarkets && (
          <button
            onClick={onAddToMarkets}
            disabled={isInWatchlist}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              background: isInWatchlist ? '#f1f5f9' : '#fff',
              color: isInWatchlist ? '#94a3b8' : '#0f172a',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: isInWatchlist ? 'default' : 'pointer',
            }}
          >
            {isInWatchlist ? 'In Markets' : 'Add to Markets'}
          </button>
        )}
        {onCopyMint && (
          <button
            onClick={onCopyMint}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Copy Mint
          </button>
        )}
      </div>
    </div>
  );
}
