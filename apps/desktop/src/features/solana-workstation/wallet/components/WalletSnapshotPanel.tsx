import { useState, useCallback } from 'react';
import type {
  SolanaWalletProfile,
  SolanaWalletReadOnlySnapshot,
  SolanaRpcEndpointConfig,
} from '@gorkh/shared';
import { fetchWalletReadOnlySnapshot } from '../fetchWalletReadOnlySnapshot.js';
import { TokenAccountsPreview } from './TokenAccountsPreview.js';

export function WalletSnapshotPanel({
  profile,
  snapshot,
  onSnapshot,
  onAddToMarkets,
}: {
  profile: SolanaWalletProfile | null;
  snapshot: SolanaWalletReadOnlySnapshot | null;
  onSnapshot: (snapshot: SolanaWalletReadOnlySnapshot) => void;
  onAddToMarkets?: () => void;
}) {
  const [endpoint] = useState<SolanaRpcEndpointConfig>({
    network: profile?.network ?? 'devnet',
    url: 'https://api.devnet.solana.com',
    label: 'Solana Devnet',
    isCustom: false,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    if (!profile || !profile.publicAddress) {
      setError('Select a profile with a public address to refresh.');
      return;
    }
    setStatus('loading');
    setError(null);

    const result = await fetchWalletReadOnlySnapshot({
      walletProfile: profile,
      endpoint,
    });

    if (result.status === 'ready' && result.snapshot) {
      setStatus('ready');
      onSnapshot(result.snapshot);
    } else {
      setStatus('error');
      setError(result.error ?? 'Failed to fetch wallet snapshot.');
    }
  }, [profile, endpoint, onSnapshot]);

  const handleCopyContext = useCallback(() => {
    if (!snapshot) return;
    const lines: string[] = [];
    lines.push(`# Wallet Snapshot`);
    lines.push(`- Address: ${snapshot.address}`);
    lines.push(`- Network: ${snapshot.network}`);
    lines.push(`- SOL Balance: ${snapshot.solBalanceUi ?? '—'} SOL (${snapshot.solBalanceLamports ?? '—'} lamports)`);
    lines.push(`- Token Accounts: ${snapshot.tokenAccountCount ?? 0}`);
    lines.push(`- Fetched: ${snapshot.fetchedAt ? new Date(snapshot.fetchedAt).toISOString() : '—'}`);
    lines.push(`- Source: ${snapshot.source}`);
    lines.push('');
    lines.push('## Safety');
    for (const note of snapshot.safetyNotes) {
      lines.push(`- ${note}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }, [snapshot]);

  const displaySnapshot = snapshot;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Read-Only Wallet Snapshot</div>

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
        Read-only wallet snapshot. GORKH cannot sign or move funds.
      </div>

      {!profile && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Select a wallet profile to fetch snapshot data.</div>
      )}

      {profile && !profile.publicAddress && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          This profile has no public address. Add an address in the Wallet tab.
        </div>
      )}

      {profile && profile.publicAddress && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              <strong>Address:</strong>{' '}
              <span style={{ fontFamily: 'monospace' }}>{profile.publicAddress}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              <strong>Network:</strong> {endpoint.network}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleRefresh}
              disabled={status === 'loading'}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: status === 'loading' ? '#cbd5e1' : '#0f172a',
                color: status === 'loading' ? '#64748b' : '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'loading' ? 'Refreshing…' : 'Refresh Wallet Snapshot'}
            </button>

            {displaySnapshot && (
              <button
                onClick={handleCopyContext}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Copy Snapshot Context
              </button>
            )}

            {displaySnapshot && onAddToMarkets && (
              <button
                onClick={onAddToMarkets}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#8b5cf6',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add to Markets Watchlist
              </button>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                fontSize: '0.78rem',
                color: '#991b1b',
              }}
            >
              {error}
            </div>
          )}

          {displaySnapshot && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Snapshot</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.78rem' }}>
                <div style={{ color: '#64748b' }}>
                  <strong>Account:</strong>{' '}
                  {displaySnapshot.accountExists === true
                    ? 'Found'
                    : displaySnapshot.accountExists === false
                      ? 'Not found'
                      : '—'}
                </div>
                <div style={{ color: '#64748b' }}>
                  <strong>SOL Balance:</strong>{' '}
                  {displaySnapshot.solBalanceUi ? `${displaySnapshot.solBalanceUi} SOL` : '—'}
                </div>
                <div style={{ color: '#64748b' }}>
                  <strong>Token Accounts:</strong> {displaySnapshot.tokenAccountCount ?? 0}
                </div>
                {displaySnapshot.owner && (
                  <div style={{ color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong>Owner:</strong> {displaySnapshot.owner.slice(0, 16)}…
                  </div>
                )}
                {typeof displaySnapshot.executable === 'boolean' && (
                  <div style={{ color: '#64748b' }}>
                    <strong>Executable:</strong> {displaySnapshot.executable ? 'Yes' : 'No'}
                  </div>
                )}
                {typeof displaySnapshot.dataLength === 'number' && (
                  <div style={{ color: '#64748b' }}>
                    <strong>Data Length:</strong> {displaySnapshot.dataLength} bytes
                  </div>
                )}
                {displaySnapshot.fetchedAt && (
                  <div style={{ color: '#64748b' }}>
                    <strong>Fetched:</strong>{' '}
                    {new Date(displaySnapshot.fetchedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <TokenAccountsPreview
                accounts={displaySnapshot.tokenAccountsPreview}
                totalCount={displaySnapshot.tokenAccountCount ?? 0}
              />

              {displaySnapshot.warnings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#92400e' }}>Warnings</div>
                  {displaySnapshot.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: '0.72rem', color: '#92400e' }}>
                      • {w}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Safety Notes</div>
                {displaySnapshot.safetyNotes.map((n, i) => (
                  <div key={i} style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    • {n}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
