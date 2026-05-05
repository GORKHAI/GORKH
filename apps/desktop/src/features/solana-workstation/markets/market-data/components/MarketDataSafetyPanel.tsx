import { SOLANA_MARKETS_PHASE_17_SAFETY_NOTES } from '@gorkh/shared';

export function MarketDataSafetyPanel() {
  return (
    <div
      style={{
        padding: '0.6rem 0.8rem',
        borderRadius: '6px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        fontSize: '0.78rem',
        color: '#991b1b',
      }}
    >
      <strong>Market Data Safety</strong>
      {SOLANA_MARKETS_PHASE_17_SAFETY_NOTES.map((note: string, i: number) => (
        <div key={i} style={{ marginTop: '0.2rem' }}>
          • {note}
        </div>
      ))}
    </div>
  );
}
