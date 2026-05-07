import { getNavItemById, type WorkstationModuleId, type WorkstationViewId } from './workstationNavigation.js';
import { WorkstationSafetyBadge, WorkstationStatusBadge } from './WorkstationSafetyBadge.js';

export function WorkstationInspector({
  activeModule,
}: {
  activeModule: WorkstationViewId | null;
}) {
  const item =
    activeModule && activeModule !== 'assistant'
      ? getNavItemById(activeModule as WorkstationModuleId)
      : undefined;

  return (
    <aside
      className="gorkh-workstation-inspector"
      style={{
        width: '320px',
        minWidth: '320px',
        background: '#111318',
        borderLeft: '1px solid #1e293b',
        overflowY: 'auto',
        padding: '1rem',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#64748b',
          marginBottom: '0.75rem',
        }}
      >
        Inspector
      </div>

      {activeModule === 'assistant' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="gorkh-inspector-card">
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Assistant
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.5, color: '#94a3b8' }}>
              Secondary workspace for chat, planning, and approved desktop tasks.
            </p>
          </div>
          <div className="gorkh-inspector-card">
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Desktop Vision
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5, color: '#94a3b8' }}>
              Optional and disabled until explicitly enabled. Workstation modules do not require screen context.
            </p>
          </div>
        </div>
      ) : item ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.75rem',
              background: '#0b0d12',
              border: '1px solid #1e293b',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              {item.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <WorkstationStatusBadge status={item.status} />
              <WorkstationSafetyBadge level={item.safetyLevel} />
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.5, color: '#94a3b8' }}>
              {item.description}
            </p>
          </div>

          <div
            style={{
              padding: '0.75rem',
              background: '#0b0d12',
              border: '1px solid #1e293b',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Module Safety
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: '1rem',
                fontSize: '0.75rem',
                lineHeight: 1.6,
                color: '#94a3b8',
              }}
            >
              <li>No private keys stored</li>
              <li>No signing available</li>
              <li>No on-chain execution</li>
              <li>No trading or swaps</li>
            </ul>
          </div>

          <div
            style={{
              padding: '0.75rem',
              background: '#0b0d12',
              border: '1px solid #1e293b',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Recommended Action
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5, color: '#94a3b8' }}>
              Review module safety notes before any future on-chain action. All execution paths are
              disabled in this phase.
            </p>
          </div>

          <div
            style={{
              padding: '0.75rem',
              background: '#0b0d12',
              border: '1px solid #1e293b',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Blocked Capabilities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {['signing', 'execution', 'swap', 'trade', 'key import'].map((cap) => (
                <span
                  key={cap}
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#1e293b',
                    color: '#64748b',
                  }}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
          Select a module from the sidebar to view its safety summary and inspector details.
        </p>
      )}
    </aside>
  );
}
