import { type SolanaMarketsTokenMintSnapshot } from '@gorkh/shared';

export function TokenMintCard({ snapshot }: { snapshot: SolanaMarketsTokenMintSnapshot }) {
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
        Token mint account not found.
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
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Token Mint</span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.75rem' }}>
        <span style={{ color: '#64748b' }}>Decimals:</span>
        <span style={{ color: '#0f172a' }}>{snapshot.decimals ?? '?'}</span>

        <span style={{ color: '#64748b' }}>Supply:</span>
        <span style={{ color: '#0f172a' }}>{snapshot.supplyUi ?? snapshot.supplyRaw ?? '?'}</span>

        <span style={{ color: '#64748b' }}>Mint Authority:</span>
        <span style={{ color: snapshot.mintAuthorityPresent ? '#92400e' : '#166534' }}>
          {snapshot.mintAuthorityPresent ? 'Present' : 'None'}
        </span>

        <span style={{ color: '#64748b' }}>Freeze Authority:</span>
        <span style={{ color: snapshot.freezeAuthorityPresent ? '#991b1b' : '#166534' }}>
          {snapshot.freezeAuthorityPresent ? 'Present' : 'None'}
        </span>

        <span style={{ color: '#64748b' }}>Initialized:</span>
        <span style={{ color: '#0f172a' }}>{snapshot.isInitialized === false ? 'No' : 'Yes'}</span>

        <span style={{ color: '#64748b' }}>Token Program:</span>
        <span style={{ color: '#0f172a' }}>{snapshot.tokenProgram ?? 'unknown'}</span>
      </div>

      {snapshot.largestAccounts && snapshot.largestAccounts.length > 0 && (
        <>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '0.3rem' }}>
            Largest Accounts
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {snapshot.largestAccounts.slice(0, 5).map((acc, i) => (
              <div
                key={acc.address}
                style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  fontFamily: 'monospace',
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                <span>#{i + 1}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.address}</span>
                <span>{acc.uiAmountString ?? acc.amountRaw}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        style={{
          marginTop: '0.3rem',
          padding: '0.3rem 0.5rem',
          borderRadius: '4px',
          background: '#f1f5f9',
          fontSize: '0.7rem',
          color: '#64748b',
        }}
      >
        Price data planned for a future phase.
      </div>
    </div>
  );
}
