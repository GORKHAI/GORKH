import { useState, useCallback } from 'react';
import { assertSafeMarketsLabel, isValidSolanaAddress } from '../marketsGuards.js';
import type { SolanaMarketsWatchlistItem } from '@gorkh/shared';

export function WatchlistPanel({
  items,
  network: _network,
  onAdd,
  onRemove,
  onSelect,
  isAnalyzing,
}: {
  items: SolanaMarketsWatchlistItem[];
  network: string;
  onAdd: (address: string, label?: string) => void;
  onRemove: (id: string) => void;
  onSelect: (item: SolanaMarketsWatchlistItem) => void;
  isAnalyzing?: boolean;
}) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    setError(null);
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Address is required.');
      return;
    }
    if (!isValidSolanaAddress(trimmed)) {
      setError('Invalid Solana address format.');
      return;
    }
    try {
      if (label.trim()) assertSafeMarketsLabel(label.trim());
    } catch (e: any) {
      setError(e.message);
      return;
    }
    onAdd(trimmed, label.trim() || undefined);
    setAddress('');
    setLabel('');
  }, [address, label, onAdd]);

  const activeItems = items.filter((i) => i.status !== 'archived');

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '10px',
        background: '#fff',
        border: '1px solid rgba(226,232,240,0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minWidth: '260px',
        maxWidth: '320px',
      }}
    >
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Watchlist ({activeItems.length})</span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <input
          type="text"
          placeholder="Solana address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
          }}
        />
        <input
          type="text"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={isAnalyzing}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: isAnalyzing ? '#cbd5e1' : '#0f172a',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          Add to Watchlist
        </button>
        {error && (
          <span style={{ fontSize: '0.7rem', color: '#991b1b' }}>{error}</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '400px', overflow: 'auto' }}>
        {activeItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                {item.label ?? item.address.slice(0, 8) + '…'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                style={{
                  fontSize: '0.6rem',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.address}
            </span>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
              <span
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.05rem 0.3rem',
                  borderRadius: '3px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                }}
              >
                {item.kind ?? 'unknown'}
              </span>
              <span
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.05rem 0.3rem',
                  borderRadius: '3px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                }}
              >
                {item.network}
              </span>
            </div>
          </div>
        ))}
        {activeItems.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
            No watchlist items yet. Add an address above.
          </span>
        )}
      </div>
    </div>
  );
}
