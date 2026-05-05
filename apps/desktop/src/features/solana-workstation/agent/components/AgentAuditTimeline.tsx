import { type SolanaAgentAuditEvent } from '@gorkh/shared';

export function AgentAuditTimeline({ events }: { events: SolanaAgentAuditEvent[] }) {
  if (events.length === 0) {
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
        No audit events yet. Create an agent or draft an action to see the local timeline.
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map((event) => (
        <div
          key={event.id}
          style={{
            padding: '0.6rem 0.75rem',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(226,232,240,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
              {event.title}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              {event.kind.replace(/_/g, ' ')}
            </span>
            {event.localOnly && (
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
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{event.description}</span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {new Date(event.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
