import { useState, useCallback } from 'react';
import {
  SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS,
} from '@gorkh/shared';
import { runDiagnosticCommand, type DiagnosticResult } from '../runDiagnosticCommand.js';

export function DiagnosticsPanel() {
  const [results, setResults] = useState<Record<string, DiagnosticResult>>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = useCallback(async (cmd: string, args: string[]) => {
    const key = `${cmd} ${args.join(' ')}`;
    setBusy((prev) => new Set(prev).add(key));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    try {
      const result = await runDiagnosticCommand(cmd, args);
      setResults((prev) => ({ ...prev, [key]: result }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setBusy((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          fontSize: '0.8rem',
          color: '#64748b',
          lineHeight: 1.5,
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          background: 'rgba(254,252,232,0.4)',
          border: '1px solid rgba(253,224,71,0.2)',
        }}
      >
        Only exact diagnostic commands are allowed. No build, test, deploy, or install commands.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS.map((c) => {
          const key = `${c.cmd} ${c.args.join(' ')}`;
          const isBusy = busy.has(key);
          const result = results[key];
          const error = errors[key];

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(148,163,184,0.18)',
                minWidth: '220px',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <code style={{ fontSize: '0.78rem', color: '#334155', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                  {c.cmd} {c.args.join(' ')}
                </code>
                <button
                  onClick={() => void run(c.cmd, c.args)}
                  disabled={isBusy}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isBusy ? '#e5e7eb' : '#0f172a',
                    color: isBusy ? '#9ca3af' : 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isBusy ? '…' : 'Run'}
                </button>
              </div>

              {error && (
                <div style={{ fontSize: '0.75rem', color: '#991b1b', background: '#fef2f2', padding: '0.4rem', borderRadius: '4px' }}>
                  {error}
                </div>
              )}

              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {result.stdout && (
                    <pre
                      style={{
                        margin: 0,
                        padding: '0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(241,245,249,0.6)',
                        fontSize: '0.72rem',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        color: '#475569',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: '120px',
                        overflow: 'auto',
                      }}
                    >
                      {result.stdout}
                    </pre>
                  )}
                  {result.stderr && (
                    <pre
                      style={{
                        margin: 0,
                        padding: '0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(254,242,242,0.4)',
                        fontSize: '0.72rem',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        color: '#991b1b',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: '120px',
                        overflow: 'auto',
                      }}
                    >
                      {result.stderr}
                    </pre>
                  )}
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    Exit code: {result.exitCode} • {result.redactionApplied ? 'Redactions applied' : ''}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
