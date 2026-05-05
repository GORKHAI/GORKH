import { SOLANA_WALLET_PHASE_10_SAFETY_NOTES, SOLANA_WALLET_DENIED_CAPABILITIES } from '@gorkh/shared';

export function WalletSafetyPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.85rem',
          lineHeight: 1.55,
          color: '#991b1b',
        }}
      >
        <strong>Wallet shell only.</strong> No private transfer, signing, swap, or trading execution is available
        in this phase.
      </div>

      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(226,232,240,0.6)',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Phase 10 Safety Notes</span>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.55 }}>
          {SOLANA_WALLET_PHASE_10_SAFETY_NOTES.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>

      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Denied Capabilities</span>
        <div
          style={{
            marginTop: '0.4rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.3rem',
          }}
        >
          {SOLANA_WALLET_DENIED_CAPABILITIES.map((cap) => (
            <span
              key={cap}
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca',
              }}
            >
              {cap.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
