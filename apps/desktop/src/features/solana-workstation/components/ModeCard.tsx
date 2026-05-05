import type { WorkstationModeDefinition } from '@gorkh/shared';

interface ModeCardProps {
  mode: WorkstationModeDefinition;
  selected?: boolean;
  onClick?: () => void;
}

export function ModeCard({ mode, selected, onClick }: ModeCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        border: `1px solid ${selected ? 'rgba(139,92,246,0.4)' : 'rgba(148,163,184,0.22)'}`,
        background: selected ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          {mode.title}
        </h3>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            background: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
        >
          {mode.maturity}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: '#475569' }}>
        {mode.description}
      </p>

      <div style={{ marginTop: '0.25rem' }}>
        <p
          style={{
            margin: '0 0 0.35rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
          }}
        >
          Primary use cases
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
          {mode.primaryUseCases.map((useCase, i) => (
            <li key={i}>{useCase}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '0.25rem' }}>
        <p
          style={{
            margin: '0 0 0.35rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
          }}
        >
          Capabilities
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {mode.capabilities.map((cap) => (
            <div
              key={cap.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                background: cap.available ? 'rgba(220,252,231,0.5)' : 'rgba(241,245,249,0.6)',
                border: `1px solid ${cap.available ? 'rgba(134,239,172,0.4)' : 'rgba(226,232,240,0.6)'}`,
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px',
                  background: cap.available ? '#dcfce7' : '#f1f5f9',
                  color: cap.available ? '#166534' : '#64748b',
                  whiteSpace: 'nowrap',
                  marginTop: '0.05rem',
                }}
              >
                {cap.available ? 'Live' : 'Planned'}
              </span>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{cap.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                  {cap.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 0.65rem',
          borderRadius: '6px',
          background: 'rgba(254,252,232,0.6)',
          border: '1px solid rgba(253,224,71,0.3)',
          fontSize: '0.75rem',
          color: '#854d0e',
          lineHeight: 1.45,
        }}
      >
        <strong>Safety:</strong> {mode.safetyNote}
      </div>
    </div>
  );
}
