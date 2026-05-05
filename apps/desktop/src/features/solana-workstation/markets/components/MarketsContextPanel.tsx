import { useState } from 'react';
import type { SolanaMarketsContextSummary } from '@gorkh/shared';

export function MarketsContextPanel({ summary }: { summary: SolanaMarketsContextSummary }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

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
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Context Bridge Export</span>
        <button
          onClick={handleCopy}
          style={{
            fontSize: '0.7rem',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: copied ? '#dcfce7' : '#fff',
            color: copied ? '#166534' : '#0f172a',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy Markdown'}
        </button>
      </div>

      <pre
        style={{
          padding: '0.6rem',
          borderRadius: '6px',
          background: '#0f172a',
          color: '#e2e8f0',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          overflow: 'auto',
          maxHeight: '300px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {summary.markdown}
      </pre>
    </div>
  );
}
