import { getNavItemById, type WorkstationModuleId, type WorkstationViewId } from './workstationNavigation.js';

export function WorkstationStatusBar({
  activeModule,
}: {
  activeModule: WorkstationViewId | null;
}) {
  const activeItem =
    activeModule && activeModule !== 'assistant'
      ? getNavItemById(activeModule as WorkstationModuleId)
      : undefined;

  return (
    <footer
      className="gorkh-workstation-statusbar"
      style={{
        height: '32px',
        minHeight: '32px',
        background: '#0b0d12',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#64748b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontWeight: 600, color: '#94a3b8' }}>Module:</span>
        <span>{activeModule === 'assistant' ? 'Assistant' : activeItem?.label ?? 'Dashboard'}</span>
      </div>

      <div style={{ width: '1px', height: '14px', background: '#1e293b' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontWeight: 600, color: '#94a3b8' }}>Network:</span>
        <span>devnet</span>
      </div>

      <div style={{ width: '1px', height: '14px', background: '#1e293b' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
        <span>Execution disabled</span>
      </div>

      <div style={{ width: '1px', height: '14px', background: '#1e293b' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
        <span>Wallet disconnected</span>
      </div>

      <div style={{ width: '1px', height: '14px', background: '#1e293b' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
        <span>RPC read-only</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontWeight: 600, color: '#94a3b8' }}>Safety:</span>
        <span>{activeItem?.safetyLevel.replace(/_/g, ' ') ?? 'local only'}</span>
      </div>
    </footer>
  );
}
