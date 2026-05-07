import { type WorkstationModuleId } from './workstationNavigation.js';

const DASHBOARD_PANELS: Array<{
  id: WorkstationModuleId;
  title: string;
  metric: string;
  detail: string;
  action: string;
}> = [
  {
    id: 'wallet',
    title: 'Wallet Snapshot',
    metric: 'Read-only',
    detail: 'Profile, ownership proof, balance snapshot, and portfolio context.',
    action: 'Open Wallet',
  },
  {
    id: 'markets',
    title: 'Markets',
    metric: 'Manual fetch',
    detail: 'Watchlist, Birdeye status, and latest market context.',
    action: 'Open Markets',
  },
  {
    id: 'shield',
    title: 'Shield',
    metric: 'Decode ready',
    detail: 'Paste a transaction, address, or signature for inspection.',
    action: 'Open Shield',
  },
  {
    id: 'builder',
    title: 'Builder',
    metric: 'Local workspace',
    detail: 'Anchor IDLs, diagnostics, file preview, and log analyzer.',
    action: 'Open Builder',
  },
  {
    id: 'agent',
    title: 'Agent',
    metric: 'Draft only',
    detail: 'Policy state, action drafts, audit timeline, and attestations.',
    action: 'Open Agent',
  },
  {
    id: 'context',
    title: 'Context',
    metric: 'Sanitized export',
    detail: 'Latest bundle, copy state, and safe assistant handoff context.',
    action: 'Open Context',
  },
];

export function WorkstationDashboard({
  onSelectModule,
}: {
  onSelectModule: (id: WorkstationModuleId) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.65rem 0.75rem',
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: '8px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.92)' }}>
            Operational Dashboard
          </h1>
          <p style={{ margin: '0.22rem 0 0', fontSize: '0.76rem', color: 'rgba(255,255,255,0.56)' }}>
            Fixed-shell overview for Wallet, Markets, Shield, Builder, Agent, and Context.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {['No private keys', 'No signing', 'No execution', 'No trading'].map((label) => (
            <span className="gorkh-workstation-mini-badge" key={label}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="gorkh-workstation-dashboard-grid">
        {DASHBOARD_PANELS.map((panel) => (
          <button
            key={panel.id}
            onClick={() => onSelectModule(panel.id)}
            className="gorkh-workstation-dashboard-card"
            style={{ textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 750, fontSize: '0.86rem' }}>
                {panel.title}
              </span>
              <span className="gorkh-workstation-mini-badge">{panel.metric}</span>
            </div>
            <p style={{ margin: '0.55rem 0 0', minHeight: '2.45rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.76rem', lineHeight: 1.45 }}>
              {panel.detail}
            </p>
            <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.82)', fontSize: '0.74rem', fontWeight: 700 }}>
              {panel.action}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
