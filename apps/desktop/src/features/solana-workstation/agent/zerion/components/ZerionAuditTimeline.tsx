import type { ZerionAuditEvent } from '@gorkh/shared';

export function ZerionAuditTimeline({ events }: { events: ZerionAuditEvent[] }) {
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.55rem' }}>
      <strong style={{ color: '#0f172a' }}>Zerion Audit Log</strong>
      {events.length === 0 ? (
        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>No Zerion audit events yet.</span>
      ) : (
        events.slice().reverse().map((event) => (
          <div key={event.id} style={{ borderTop: '1px solid rgba(226,232,240,0.8)', paddingTop: '0.45rem' }}>
            <div style={{ color: '#0f172a', fontSize: '0.8rem', fontWeight: 700 }}>{event.title}</div>
            <div style={{ color: '#64748b', fontSize: '0.74rem', lineHeight: 1.45 }}>{event.description}</div>
          </div>
        ))
      )}
    </div>
  );
}

