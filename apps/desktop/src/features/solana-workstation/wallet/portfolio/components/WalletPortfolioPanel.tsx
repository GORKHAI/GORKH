import { useState, useMemo, useCallback } from 'react';
import type {
  SolanaWalletProfile,
  SolanaWalletReadOnlySnapshot,
  SolanaMarketsWorkspaceState,
} from '@gorkh/shared';
import { createWalletPortfolioSummary } from '../createWalletPortfolioSummary.js';
import { createWalletPortfolioContextSummary } from '../createWalletPortfolioContextSummary.js';
import { buildMarketsWatchlistItemFromTokenHolding } from '../buildMarketsWatchlistItemFromTokenHolding.js';
import { WalletTokenHoldingsTable } from './WalletTokenHoldingsTable.js';
import {
  loadMarketsWorkspaceState,
  saveMarketsWorkspaceState,
  createEmptyMarketsWorkspaceState,
} from '../../../markets/marketsStorage.js';

export interface WalletPortfolioPanelProps {
  profile: SolanaWalletProfile | null;
  snapshot: SolanaWalletReadOnlySnapshot | null;
  ownershipProofStatus?: string;
  ownershipVerifiedAt?: number;
  onOpenMarkets?: () => void;
}

export function WalletPortfolioPanel({
  profile,
  snapshot,
  ownershipProofStatus,
  ownershipVerifiedAt,
  onOpenMarkets,
}: WalletPortfolioPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const portfolio = useMemo(() => {
    if (!profile) return null;
    return createWalletPortfolioSummary({
      walletProfile: profile,
      snapshot,
      ownershipProofStatus,
      ownershipVerifiedAt,
    });
  }, [profile, snapshot, ownershipProofStatus, ownershipVerifiedAt]);

  const contextSummary = useMemo(() => {
    if (!portfolio) return null;
    return createWalletPortfolioContextSummary({
      portfolio,
      walletProfileLabel: profile?.label,
    });
  }, [portfolio, profile]);

  const watchlistAddresses = useMemo(() => {
    const marketsState = loadMarketsWorkspaceState() ?? createEmptyMarketsWorkspaceState();
    return new Set(marketsState.watchlist.map((w) => w.address));
  }, []);

  const handleAddTokenToMarkets = useCallback(
    (holding: { mint: string; tokenAccountCount: number }) => {
      if (!profile) return;
      const item = buildMarketsWatchlistItemFromTokenHolding(
        holding as Parameters<typeof buildMarketsWatchlistItemFromTokenHolding>[0],
        profile.network,
        profile.id
      );

      const marketsState = loadMarketsWorkspaceState() ?? createEmptyMarketsWorkspaceState();
      const exists = marketsState.watchlist.some(
        (w) => w.address === item.address && w.network === item.network
      );
      if (exists) {
        setCopyFeedback('Already in Markets watchlist.');
        setTimeout(() => setCopyFeedback(null), 2000);
        return;
      }

      const updated: SolanaMarketsWorkspaceState = {
        ...marketsState,
        watchlist: [...marketsState.watchlist, item],
        updatedAt: Date.now(),
      };
      saveMarketsWorkspaceState(updated);
      setCopyFeedback('Added to Markets watchlist.');
      setTimeout(() => setCopyFeedback(null), 2000);
    },
    [profile]
  );

  const handleCopyMint = useCallback((mint: string) => {
    navigator.clipboard.writeText(mint).catch(() => {});
    setCopyFeedback('Mint copied to clipboard.');
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  const handleCopyPortfolioContext = useCallback(() => {
    if (!contextSummary) return;
    navigator.clipboard.writeText(contextSummary.markdown).catch(() => {});
    setCopyFeedback('Portfolio context copied.');
    setTimeout(() => setCopyFeedback(null), 2000);
  }, [contextSummary]);

  if (!portfolio) {
    return (
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          fontSize: '0.85rem',
          color: '#64748b',
        }}
      >
        Select a wallet profile to view its portfolio.
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          fontSize: '0.85rem',
          color: '#64748b',
        }}
      >
        Refresh a read-only wallet snapshot first to populate portfolio data.
      </div>
    );
  }

  const ownershipBadge =
    ownershipProofStatus === 'verified'
      ? { label: 'Verified via message signing', color: '#166534', bg: '#dcfce7' }
      : ownershipProofStatus
        ? { label: 'Address-only', color: '#92400e', bg: '#fef9c3' }
        : { label: 'Not verified', color: '#64748b', bg: '#f1f5f9' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {copyFeedback && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            fontSize: '0.78rem',
            color: '#065f46',
          }}
        >
          {copyFeedback}
        </div>
      )}

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
        Read-only portfolio. GORKH cannot sign, swap, trade, or move funds.
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            flex: '1 1 180px',
            padding: '1rem',
            borderRadius: '8px',
            background: '#fff',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>SOL Balance</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {portfolio.solBalanceUi ?? '—'} SOL
          </div>
        </div>

        <div
          style={{
            flex: '1 1 180px',
            padding: '1rem',
            borderRadius: '8px',
            background: '#fff',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Token Holdings</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {portfolio.tokenHoldingCount}
          </div>
        </div>

        <div
          style={{
            flex: '1 1 180px',
            padding: '1rem',
            borderRadius: '8px',
            background: '#fff',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Token Accounts</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {portfolio.tokenAccountCount}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.6rem',
            borderRadius: '999px',
            background: ownershipBadge.bg,
            color: ownershipBadge.color,
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          {ownershipBadge.label}
        </span>
        {portfolio.snapshotFetchedAt && (
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Snapshot: {new Date(portfolio.snapshotFetchedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          Token Holdings
        </div>
        <WalletTokenHoldingsTable
          holdings={portfolio.holdings}
          watchlistAddresses={watchlistAddresses}
          onAddToMarkets={handleAddTokenToMarkets}
          onCopyMint={handleCopyMint}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {onOpenMarkets && (
          <button
            onClick={onOpenMarkets}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Open Markets
          </button>
        )}
        <button
          onClick={handleCopyPortfolioContext}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Copy Portfolio Context
        </button>
      </div>

      {portfolio.warnings.length > 0 && (
        <div
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: '6px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            fontSize: '0.75rem',
            color: '#92400e',
          }}
        >
          <strong>Warnings:</strong>
          {portfolio.warnings.map((w: string, i: number) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
