import { SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES } from '@gorkh/shared';

export function WalletConnectionSafetyPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Connection Safety</div>

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          fontSize: '0.72rem',
          color: '#92400e',
        }}
      >
        External wallet connection is read-only in this phase. GORKH cannot request signatures or
        move funds.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {SOLANA_WALLET_CONNECTION_PHASE_13_SAFETY_NOTES.map((note, i) => (
          <div key={i} style={{ fontSize: '0.72rem', color: '#64748b' }}>
            • {note}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.72rem',
          color: '#991b1b',
        }}
      >
        <strong>Never paste private keys or seed phrases.</strong> GORKH will never ask for them.
      </div>
    </div>
  );
}
