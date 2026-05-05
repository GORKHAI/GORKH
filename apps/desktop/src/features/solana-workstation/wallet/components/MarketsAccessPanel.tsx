import { useState, useEffect } from 'react';
import { type SolanaWalletProfile } from '@gorkh/shared';
import { createMarketsWatchlistItemFromWalletProfile } from '../walletBridge.js';
import { loadMarketsWorkspaceState } from '../../markets/marketsStorage.js';

export function MarketsAccessPanel({
  selectedProfile,
  onAddToMarkets,
}: {
  selectedProfile: SolanaWalletProfile | null;
  onAddToMarkets?: (profile: SolanaWalletProfile) => void;
}) {
  const [alreadyAdded, setAlreadyAdded] = useState(false);

  useEffect(() => {
    if (!selectedProfile?.publicAddress) {
      setAlreadyAdded(false);
      return;
    }
    const item = createMarketsWatchlistItemFromWalletProfile(selectedProfile);
    if (!item) {
      setAlreadyAdded(false);
      return;
    }
    const markets = loadMarketsWorkspaceState();
    setAlreadyAdded(markets?.watchlist.some((w) => w.id === item.id) ?? false);
  }, [selectedProfile]);

  const handleAdd = () => {
    if (!selectedProfile?.publicAddress || !onAddToMarkets) return;
    onAddToMarkets(selectedProfile);
    setAlreadyAdded(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(226,232,240,0.6)',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Markets Access</span>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          Connect your wallet profile to GORKH Markets for read-only watchlist tracking.
          No automatic fetching, analysis, or trading.
        </p>
      </div>

      {!selectedProfile && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            fontSize: '0.85rem',
            color: '#92400e',
          }}
        >
          Select a wallet profile with a public address to add it to Markets.
        </div>
      )}

      {selectedProfile && !selectedProfile.publicAddress && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            fontSize: '0.85rem',
            color: '#92400e',
          }}
        >
          This profile has no public address. Add one in the Wallet tab to use Markets Access.
        </div>
      )}

      {selectedProfile && selectedProfile.publicAddress && (
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
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
            {selectedProfile.label}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
            {selectedProfile.publicAddress}
          </div>
          <button
            onClick={handleAdd}
            disabled={alreadyAdded}
            style={{
              alignSelf: 'flex-start',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: alreadyAdded ? '#dcfce7' : '#0f172a',
              color: alreadyAdded ? '#166534' : '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: alreadyAdded ? 'default' : 'pointer',
            }}
          >
            {alreadyAdded ? 'Already in Markets Watchlist' : 'Add Wallet Profile to Markets Watchlist'}
          </button>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {alreadyAdded
              ? 'Wallet profile added to Markets watchlist. Open Markets and click Analyze Read-Only manually.'
              : 'This creates a watchlist entry. No automatic fetch or analysis is triggered.'}
          </div>
        </div>
      )}
    </div>
  );
}
