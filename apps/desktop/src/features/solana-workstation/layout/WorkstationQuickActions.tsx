import { type WorkstationModuleId } from './workstationNavigation.js';

export function WorkstationQuickActions({
  onNavigate,
}: {
  onNavigate: (id: WorkstationModuleId) => void;
}) {
  const actions: { label: string; module: WorkstationModuleId; hint?: string }[] = [
    { label: 'New Wallet Profile', module: 'wallet' },
    { label: 'Open Shield', module: 'shield' },
    { label: 'Open Markets', module: 'markets' },
    { label: 'Open Builder', module: 'builder' },
    { label: 'Export Context', module: 'context' },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onNavigate(action.module)}
          style={{
            padding: '0.35rem 0.7rem',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            background: '#111318',
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1e293b';
            e.currentTarget.style.color = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#111318';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
