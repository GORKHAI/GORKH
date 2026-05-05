import type { SolanaMarketLiquidityContext } from '@gorkh/shared';

export interface LiquidityContextCardProps {
  context: SolanaMarketLiquidityContext;
}

export function LiquidityContextCard({ context }: LiquidityContextCardProps) {
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
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Liquidity Context</span>
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
        Provider: {context.provider} · Pools: {context.pools.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
        {context.pools.map((pool: typeof context.pools[number], idx: number) => (
          <div
            key={idx}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '4px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.72rem',
              color: '#0f172a',
            }}
          >
            <div style={{ fontWeight: 600 }}>{pool.protocol}</div>
            {pool.liquidityUsd && <div>Liquidity: ${pool.liquidityUsd}</div>}
            {pool.baseMint && <div>Base: {pool.baseMint}</div>}
            {pool.quoteMint && <div>Quote: {pool.quoteMint}</div>}
            {pool.warning && <div style={{ color: '#92400e' }}>Warning: {pool.warning}</div>}
          </div>
        ))}
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
