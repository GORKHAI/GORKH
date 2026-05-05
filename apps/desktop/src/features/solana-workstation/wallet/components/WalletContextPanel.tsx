import { useState, useCallback } from 'react';
import { type SolanaWalletContextSummary } from '@gorkh/shared';

export function WalletContextPanel({
  summary,
}: {
  summary: SolanaWalletContextSummary;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(summary.markdown)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // ignore
      });
  }, [summary.markdown]);

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
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Wallet Context</span>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          Copy sanitized wallet context for manual assistant review. No auto-send. No secrets.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy Context'}
        </button>
      </div>

      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.78rem',
          lineHeight: 1.55,
          color: '#475569',
          whiteSpace: 'pre-wrap',
          maxHeight: '400px',
          overflow: 'auto',
        }}
      >
        {summary.markdown}
      </div>

      <div
        style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.7rem',
          color: '#94a3b8',
        }}
      >
        Redactions: {summary.redactionsApplied.length === 0 ? 'None' : summary.redactionsApplied.join(', ')}
      </div>
    </div>
  );
}
