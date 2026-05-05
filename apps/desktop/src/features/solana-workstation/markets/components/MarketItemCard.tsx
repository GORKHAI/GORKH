import { SolanaMarketsItemKind } from '@gorkh/shared';
import type { SolanaMarketsItemAnalysis } from '@gorkh/shared';
import { MarketRiskSignalsPanel } from './MarketRiskSignalsPanel.js';
import { TokenMintCard } from './TokenMintCard.js';
import { WalletSnapshotCard } from './WalletSnapshotCard.js';

export function MarketItemCard({
  analysis,
  onRemove,
}: {
  analysis: SolanaMarketsItemAnalysis;
  onRemove?: () => void;
}) {
  const { item, accountSnapshot, tokenMintSnapshot, walletSnapshot, riskSignals, summary, analyzedAt } = analysis;
  const kindLabel =
    item.kind === SolanaMarketsItemKind.TOKEN_MINT
      ? 'Token Mint'
      : item.kind === SolanaMarketsItemKind.WALLET
        ? 'Wallet'
        : item.kind === SolanaMarketsItemKind.PROGRAM
          ? 'Program'
          : item.kind === SolanaMarketsItemKind.POOL_OR_ACCOUNT
            ? 'Pool / Account'
            : 'Unknown';

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '10px',
        background: '#fff',
        border: '1px solid rgba(226,232,240,0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            {item.label ?? item.address}
          </span>
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            {kindLabel}
          </span>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              fontSize: '0.7rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div
        style={{
          fontSize: '0.75rem',
          color: '#64748b',
          fontFamily: 'monospace',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.address}
      </div>

      {summary && (
        <div
          style={{
            fontSize: '0.8rem',
            color: '#334155',
            background: '#f8fafc',
            padding: '0.5rem',
            borderRadius: '6px',
          }}
        >
          {summary}
        </div>
      )}

      {accountSnapshot && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.2rem',
            fontSize: '0.7rem',
            color: '#64748b',
            background: '#f8fafc',
            padding: '0.4rem 0.5rem',
            borderRadius: '4px',
          }}
        >
          <span>Balance:</span>
          <span>{accountSnapshot.lamports ?? '?'} lamports</span>
          <span>Executable:</span>
          <span>{accountSnapshot.executable ? 'Yes' : 'No'}</span>
          <span>Owner:</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{accountSnapshot.owner ?? '?'}</span>
        </div>
      )}

      {tokenMintSnapshot && <TokenMintCard snapshot={tokenMintSnapshot} />}
      {walletSnapshot && <WalletSnapshotCard snapshot={walletSnapshot} />}

      <MarketRiskSignalsPanel signals={riskSignals} />

      {analyzedAt && (
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'right' }}>
          Analyzed at {new Date(analyzedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
