import { getBuilderToolLabel, type SolanaBuilderToolStatus } from '@gorkh/shared';

interface ToolStatusPanelProps {
  statuses: SolanaBuilderToolStatus[];
}

export function ToolStatusPanel({ statuses }: ToolStatusPanelProps) {
  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(148,163,184,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Toolchain Versions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
        {statuses.map((s) => (
          <div
            key={s.tool}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: s.available ? 'rgba(220,252,231,0.4)' : 'rgba(254,242,242,0.4)',
              border: `1px solid ${s.available ? 'rgba(134,239,172,0.25)' : 'rgba(254,202,202,0.25)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
              {getBuilderToolLabel(s.tool)}
            </div>
            {s.available ? (
              <div
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: '#166534',
                }}
              >
                {s.version}
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: '#991b1b' }}>
                {s.error ?? 'Not found'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
