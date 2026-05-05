import type { SolanaWalletTokenAccountPreview } from '@gorkh/shared';

export function TokenAccountsPreview({
  accounts,
  totalCount,
}: {
  accounts: SolanaWalletTokenAccountPreview[];
  totalCount: number;
}) {
  if (accounts.length === 0) {
    return (
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '0.5rem 0' }}>
        No token accounts found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
        Token Accounts ({accounts.length} shown{totalCount > accounts.length ? ` of ${totalCount}` : ''})
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.3rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: '#475569',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.2rem',
        }}
      >
        <span>Mint</span>
        <span>Amount</span>
        <span>Account</span>
      </div>
      {accounts.map((acc, i) => (
        <div
          key={acc.pubkey + i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.3rem',
            fontSize: '0.7rem',
            color: '#64748b',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          <span title={acc.mint}>{acc.mint.slice(0, 8)}…</span>
          <span>{acc.amountUi ?? acc.amountRaw ?? '—'}</span>
          <span title={acc.pubkey}>{acc.pubkey.slice(0, 8)}…</span>
        </div>
      ))}
    </div>
  );
}
