import { useCallback } from 'react';
import type { SolanaBuilderContextSummary } from '@gorkh/shared';

interface BuilderContextPanelProps {
  summary: SolanaBuilderContextSummary | null;
}

export function BuilderContextPanel({ summary }: BuilderContextPanelProps) {
  const copyToClipboard = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.copyableMarkdown);
    } catch {
      // ignore
    }
  }, [summary]);

  if (!summary) {
    return (
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '8px',
          background: 'rgba(241,245,249,0.5)',
          border: '1px dashed rgba(148,163,184,0.3)',
          fontSize: '0.85rem',
          color: '#94a3b8',
          textAlign: 'center',
        }}
      >
        Inspect a workspace first to generate a context summary.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => void copyToClipboard()}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            background: '#0f172a',
            color: 'white',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Copy Markdown
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(148,163,184,0.18)',
          fontSize: '0.78rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          color: '#475569',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: '500px',
          overflow: 'auto',
        }}
      >
        {summary.copyableMarkdown}
      </pre>
    </div>
  );
}
