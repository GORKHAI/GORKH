import { type SolanaMarketsRiskSignal } from '@gorkh/shared';

export function MarketRiskSignalsPanel({ signals }: { signals: SolanaMarketsRiskSignal[] }) {
  if (signals.length === 0) {
    return (
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '6px',
          background: 'rgba(241,245,249,0.5)',
          border: '1px dashed rgba(148,163,184,0.3)',
          fontSize: '0.8rem',
          color: '#94a3b8',
        }}
      >
        No risk signals detected.
      </div>
    );
  }

  const levelColors: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    medium: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    high: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    critical: { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {signals.map((signal) => {
        const lc = levelColors[signal.level] ?? levelColors.low;
        return (
          <div
            key={signal.id}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '6px',
              background: lc.bg,
              border: `1px solid ${lc.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: lc.text }}>
                {signal.title}
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.6)',
                  color: lc.text,
                  border: `1px solid ${lc.border}`,
                }}
              >
                {signal.level}
              </span>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                confidence: {signal.confidence}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>{signal.description}</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
              {signal.recommendation}
            </span>
          </div>
        );
      })}
    </div>
  );
}
