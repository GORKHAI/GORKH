import type { SolanaBuilderIdlSummary } from '@gorkh/shared';

interface IdlViewerProps {
  idl: SolanaBuilderIdlSummary;
}

export function IdlViewer({ idl }: IdlViewerProps) {
  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(148,163,184,0.18)',
        maxHeight: '400px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{idl.name}</div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {idl.version && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: '#f1f5f9',
                color: '#64748b',
              }}
            >
              v{idl.version}
            </span>
          )}
          {idl.spec && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: '#eef2ff',
                color: '#4338ca',
              }}
            >
              spec {idl.spec}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {idl.instructions.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              marginBottom: '0.35rem',
            }}
          >
            Instructions ({idl.instructions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {idl.instructions.map((inst, i) => (
              <div
                key={i}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(241,245,249,0.5)',
                  border: '1px solid rgba(226,232,240,0.5)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                  {inst.name}
                </div>
                {inst.docs && inst.docs.length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', fontStyle: 'italic' }}>
                    {inst.docs[0]}
                  </div>
                )}
                {inst.accounts.length > 0 && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: '#64748b' }}>
                    <strong>Accounts:</strong>{' '}
                    {inst.accounts.map((a) => `${a.name}${a.isMut ? '*' : ''}${a.isSigner ? '†' : ''}`).join(', ')}
                  </div>
                )}
                {inst.args.length > 0 && (
                  <div style={{ marginTop: '0.15rem', fontSize: '0.72rem', color: '#64748b' }}>
                    <strong>Args:</strong>{' '}
                    {inst.args.map((a) => a.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts */}
      {idl.accounts.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              marginBottom: '0.35rem',
            }}
          >
            Accounts ({idl.accounts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {idl.accounts.map((acc, i) => (
              <div
                key={i}
                style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(241,245,249,0.4)',
                  fontSize: '0.78rem',
                  color: '#475569',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {acc.name}
                {acc.type.fields && (
                  <span style={{ color: '#94a3b8', marginLeft: '0.35rem' }}>
                    ({acc.type.fields.length} fields)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {idl.errors.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              marginBottom: '0.35rem',
            }}
          >
            Errors ({idl.errors.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {idl.errors.map((err, i) => (
              <div
                key={i}
                style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(254,242,242,0.4)',
                  fontSize: '0.75rem',
                  color: '#7f1d1d',
                }}
              >
                <strong>{err.name}</strong>{' '}
                <span style={{ color: '#991b1b', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                  {err.code}
                </span>
                {err.msg && <span style={{ color: '#b91c1c', marginLeft: '0.35rem' }}>{err.msg}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {idl.events && idl.events.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              marginBottom: '0.35rem',
            }}
          >
            Events ({idl.events.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {idl.events.map((evt, i) => (
              <div
                key={i}
                style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(254,252,232,0.4)',
                  fontSize: '0.78rem',
                  color: '#475569',
                }}
              >
                <strong>{evt.name}</strong>{' '}
                <span style={{ color: '#94a3b8' }}>({evt.fields.length} fields)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {idl.instructions.length === 0 && idl.accounts.length === 0 && idl.errors.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          No instructions, accounts, or errors found in this IDL.
        </div>
      )}
    </div>
  );
}
