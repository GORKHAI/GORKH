import { SOLANA_MARKETS_PHASE_8_SAFETY_NOTES } from '@gorkh/shared';

export function MarketsSafetyPanel() {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        background: 'rgba(254,252,232,0.6)',
        border: '1px solid rgba(253,224,71,0.3)',
        fontSize: '0.8rem',
        lineHeight: 1.5,
        color: '#854d0e',
      }}
    >
      <strong>Markets v0.1 is read-only.</strong>
      <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>
        {SOLANA_MARKETS_PHASE_8_SAFETY_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
