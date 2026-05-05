import type { SolanaPrivateRoutePlanPreview } from '@gorkh/shared';

export function PrivateRoutePlanPanel({ plan }: { plan?: SolanaPrivateRoutePlanPreview }) {
  if (!plan) {
    return (
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '6px',
          background: 'rgba(241,245,249,0.5)',
          border: '1px dashed rgba(148,163,184,0.3)',
          fontSize: '0.8rem',
          color: '#94a3b8',
        }}
      >
        Select a draft and generate a route plan preview.
      </div>
    );
  }

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
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
        Route Plan: {plan.route}
      </span>

      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
        Status: <span style={{ fontWeight: 700, color: '#0f172a' }}>{plan.status}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Planned Steps</span>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.72rem', color: '#475569' }}>
          {plan.plannedSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {plan.unavailableCapabilities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            Unavailable Capabilities
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {plan.unavailableCapabilities.map((cap) => (
              <span
                key={cap}
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {plan.warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Warnings</span>
          {plan.warnings.map((w, i) => (
            <span key={i} style={{ fontSize: '0.72rem', color: '#92400e' }}>
              {w}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '0.3rem',
          padding: '0.4rem 0.5rem',
          borderRadius: '4px',
          background: '#fef3c7',
          fontSize: '0.72rem',
          color: '#92400e',
        }}
      >
        {plan.safetyNote}
      </div>
    </div>
  );
}
