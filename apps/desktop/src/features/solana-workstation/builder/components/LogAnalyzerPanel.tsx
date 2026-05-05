import { useState, useCallback } from 'react';
import type { SolanaBuilderIdlSummary, SolanaBuilderLogAnalysis } from '@gorkh/shared';
import { analyzeSolanaBuilderLogs } from '../analyzeLogs.js';

interface LogAnalyzerPanelProps {
  idls: SolanaBuilderIdlSummary[];
}

export function LogAnalyzerPanel({ idls }: LogAnalyzerPanelProps) {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<SolanaBuilderLogAnalysis | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAnalyze = useCallback(() => {
    setBusy(true);
    const result = analyzeSolanaBuilderLogs(input, idls);
    setAnalysis(result);
    setBusy(false);
  }, [input, idls]);

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return { bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d' };
      case 'error': return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' };
      case 'warning': return { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' };
      default: return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste Anchor/Solana logs here…"
        rows={6}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '10px',
          border: '1px solid rgba(148,163,184,0.24)',
          background: 'rgba(255,255,255,0.8)',
          fontSize: '0.8rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleAnalyze}
          disabled={busy || !input.trim()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            background: busy || !input.trim() ? '#e5e7eb' : '#0f172a',
            color: busy || !input.trim() ? '#9ca3af' : 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Analyzing…' : 'Analyze Logs'}
        </button>
        <button
          onClick={() => { setInput(''); setAnalysis(null); }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'rgba(255,255,255,0.8)',
            color: '#0f172a',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(241,245,249,0.6)',
              border: '1px solid rgba(226,232,240,0.6)',
              fontSize: '0.85rem',
              color: '#475569',
            }}
          >
            <strong>Summary:</strong> {analysis.summary}
          </div>

          {analysis.findings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {analysis.findings.map((f) => {
                const sc = severityColor(f.severity);
                return (
                  <div
                    key={f.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: sc.bg,
                      border: `1px solid ${sc.border}`,
                      fontSize: '0.8rem',
                      color: sc.text,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <strong>{f.title}</strong>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {f.severity}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {f.confidence} confidence
                      </span>
                    </div>
                    <div style={{ marginTop: '0.25rem', opacity: 0.9 }}>{f.description}</div>
                    {f.matchedIdlErrorName && (
                      <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                        Matched IDL Error: {f.matchedIdlErrorName}
                        {f.matchedCode !== undefined && ` (code ${f.matchedCode})`}
                      </div>
                    )}
                    {f.rawExcerpt && (
                      <div
                        style={{
                          marginTop: '0.35rem',
                          padding: '0.4rem',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.4)',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.72rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {f.rawExcerpt}
                      </div>
                    )}
                    <div style={{ marginTop: '0.35rem', fontWeight: 600 }}>Recommendation:</div>
                    <div style={{ opacity: 0.9 }}>{f.recommendation}</div>
                  </div>
                );
              })}
            </div>
          )}

          {analysis.safetyNotes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {analysis.safetyNotes.map((note, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    color: '#92400e',
                    background: 'rgba(254,252,232,0.5)',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  ⚠️ {note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
