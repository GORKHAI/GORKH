import type { SolanaMarketPriceContext } from '@gorkh/shared';

export interface PriceContextCardProps {
  context: SolanaMarketPriceContext;
}

export function PriceContextCard({ context }: PriceContextCardProps) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        background: context.isSample ? '#fffbeb' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Price Context</span>
        {context.isSample && (
          <span
            style={{
              display: 'inline-block',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: '#f59e0b',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Sample Data
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
        Provider: {context.provider}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.2rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Price USD</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{context.priceUsd ?? '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>24h Change</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{context.priceChange24hPct ?? '—'}%</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Volume 24h</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>${context.volume24hUsd ?? '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Liquidity</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>${context.liquidityUsd ?? '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Market Cap</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>${context.marketCapUsd ?? '—'}</div>
        </div>
      </div>

      {context.warnings.length > 0 && (
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
          {context.warnings.map((w: string, i: number) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
