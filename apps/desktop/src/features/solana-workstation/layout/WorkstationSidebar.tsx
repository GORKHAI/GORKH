import { WORKSTATION_NAV_ITEMS, type WorkstationViewId } from './workstationNavigation.js';

export function WorkstationSidebar({
  activeModule,
  onSelect,
}: {
  activeModule: WorkstationViewId | null;
  onSelect: (id: WorkstationViewId | null) => void;
}) {
  return (
    <nav
      className="gorkh-workstation-sidebar"
      aria-label="Workstation modules"
      style={{
        width: '256px',
        minWidth: '256px',
        background: '#111318',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '0.85rem 1rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#f59e0b',
          }}
        />
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.01em',
          }}
        >
          GORKH
        </span>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748b',
            marginLeft: 'auto',
          }}
        >
          Workstation
        </span>
      </div>

      <div style={{ padding: '0.5rem 0', flex: 1 }}>
        <button
          onClick={() => onSelect(null)}
          aria-label="Dashboard"
          aria-current={activeModule === null ? 'page' : undefined}
          className={activeModule === null ? 'gorkh-workstation-nav-item active' : 'gorkh-workstation-nav-item'}
          style={{
            width: 'calc(100% - 1rem)',
            textAlign: 'left',
            border: 'none',
          }}
        >
          <div className="gorkh-workstation-nav-dot" style={{ background: '#f8fafc' }} />
          <span style={{ flex: 1 }}>Dashboard</span>
        </button>
        {WORKSTATION_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-label={item.label}
            aria-current={activeModule === item.id ? 'page' : undefined}
            className={activeModule === item.id ? 'gorkh-workstation-nav-item active' : 'gorkh-workstation-nav-item'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.55rem 0.85rem',
              margin: '0.15rem 0.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: activeModule === item.id ? '#f8fafc' : '#94a3b8',
              background: activeModule === item.id ? '#1e293b' : 'transparent',
              border: 'none',
              width: 'calc(100% - 1rem)',
              textAlign: 'left',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
          >
            <div
              className="gorkh-workstation-nav-dot"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: item.iconColor,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: '#1e293b',
                  color: '#64748b',
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
        <div className="gorkh-workstation-sidebar-separator" />
        <button
          onClick={() => onSelect('assistant')}
          aria-label="Assistant"
          aria-current={activeModule === 'assistant' ? 'page' : undefined}
          className={activeModule === 'assistant' ? 'gorkh-workstation-nav-item active' : 'gorkh-workstation-nav-item'}
          style={{
            width: 'calc(100% - 1rem)',
            textAlign: 'left',
            border: 'none',
          }}
        >
          <div className="gorkh-workstation-nav-dot" style={{ background: '#64748b' }} />
          <span style={{ flex: 1 }}>Assistant</span>
          <span className="gorkh-workstation-nav-badge">utility</span>
        </button>
      </div>

      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #1e293b',
          fontSize: '0.72rem',
          color: '#475569',
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
          <span>Execution disabled</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
          <span>No signing</span>
        </div>
      </div>
    </nav>
  );
}
