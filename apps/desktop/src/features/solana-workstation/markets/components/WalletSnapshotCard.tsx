import { type SolanaMarketsWalletSnapshot } from '@gorkh/shared';

export function WalletSnapshotCard({ snapshot }: { snapshot: SolanaMarketsWalletSnapshot }) {
  if (!snapshot.exists) {
    return (
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '6px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.8rem',
          color: '#991b1b',
        }}
      >
        Wallet account not found.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(226,232,240,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Wallet</span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.75rem' }}>
        <span style={{ color: '#64748b' }}>SOL Balance:</span>
        <span style={{ color: '#0f172a' }}>{snapshot.solBalanceUi ?? '?'} SOL</span>

        <span style={{ color: '#64748b' }}>Token Accounts:</span>
        <span style={{ color: '#0f172a' }}>{snapshot.tokenAccountCount}</span>
      </div>

      {snapshot.tokenAccountsPreview && snapshot.tokenAccountsPreview.length > 0 && (
        <>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '0.3rem' }}>
            Token Accounts (Top {snapshot.tokenAccountsPreview.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {snapshot.tokenAccountsPreview.map((t, i) => (
              <div
                key={t.pubkey + i}
                style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  fontFamily: 'monospace',
                  display: 'flex',
                  gap: '0.5rem',
                  overflow: 'hidden',
                }}
              >
                <span>{t.uiAmountString ?? t.amountRaw}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.mint}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {snapshot.warnings && snapshot.warnings.length > 0 && (
        <div
          style={{
            marginTop: '0.3rem',
            padding: '0.3rem 0.5rem',
            borderRadius: '4px',
            background: '#fef3c7',
            fontSize: '0.7rem',
            color: '#92400e',
          }}
        >
          {snapshot.warnings.join(' ')}
        </div>
      )}
    </div>
  );
}
