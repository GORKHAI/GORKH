import { useState } from 'react';
import { type SolanaWorkstationContextBundle } from '@gorkh/shared';

export function ContextBundlePreview({ bundle }: { bundle: SolanaWorkstationContextBundle }) {
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(bundle.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(bundle.jsonPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(226,232,240,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{bundle.title}</span>
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0',
          }}
        >
          local only
        </span>
      </div>

      <span style={{ fontSize: '0.8rem', color: '#475569' }}>{bundle.description}</span>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {bundle.sources.map((s) => (
          <span
            key={s}
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {bundle.redactionsApplied.length > 0 && (
        <div
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            fontSize: '0.75rem',
            color: '#92400e',
          }}
        >
          <strong>Redactions applied:</strong> {bundle.redactionsApplied.join(', ')}
        </div>
      )}

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.75rem',
          color: '#475569',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          maxHeight: '200px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {bundle.markdown}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => void handleCopyMarkdown()}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '9999px',
            border: 'none',
            background: '#0f172a',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
        <button
          onClick={() => void handleCopyJson()}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '9999px',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'rgba(255,255,255,0.8)',
            color: '#0f172a',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Copy JSON Preview
        </button>
      </div>
    </div>
  );
}
