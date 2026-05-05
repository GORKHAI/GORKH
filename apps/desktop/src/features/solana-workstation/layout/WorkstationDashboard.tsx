import { WORKSTATION_NAV_ITEMS, type WorkstationModuleId } from './workstationNavigation.js';
import { WorkstationQuickActions } from './WorkstationQuickActions.js';

export function WorkstationDashboard({
  onSelectModule,
}: {
  onSelectModule: (id: WorkstationModuleId) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '900px' }}>
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: '#111318',
          border: '1px solid #1e293b',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.02em',
              }}
            >
              GORKH Workstation
            </h1>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', lineHeight: 1.5, color: '#94a3b8' }}>
              AI-native desktop workstation for Solana agents, builders, private wallets, and power traders.
            </p>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: '#0b0d12',
              border: '1px solid #1e293b',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#f59e0b',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            Foundation — no signing or execution
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <WorkstationQuickActions onNavigate={onSelectModule} />
        </div>
      </div>

      {/* Global Safety State */}
      <div
        style={{
          padding: '0.75rem 1rem',
          background: '#0b0d12',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
          Safety State
        </span>
        {[
          { color: '#22c55e', label: 'No signing' },
          { color: '#22c55e', label: 'No private keys' },
          { color: '#22c55e', label: 'No execution' },
          { color: '#22c55e', label: 'No trading' },
        ].map((badge) => (
          <span
            key={badge.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              background: '#111318',
              color: '#94a3b8',
              border: '1px solid #1e293b',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badge.color }} />
            {badge.label}
          </span>
        ))}
      </div>

      {/* Module Grid */}
      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            marginBottom: '0.6rem',
          }}
        >
          Modules
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {WORKSTATION_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              style={{
                padding: '1rem',
                background: '#111318',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.background = '#161b26';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.background = '#111318';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.iconColor }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>{item.label}</span>
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
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45, color: '#94a3b8' }}>
                {item.description}
              </p>
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: 'auto' }}>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#0b0d12',
                    color: '#64748b',
                    border: '1px solid #1e293b',
                  }}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#0b0d12',
                    color: '#64748b',
                    border: '1px solid #1e293b',
                  }}
                >
                  {item.safetyLevel.replace(/_/g, ' ')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Protocol Roadmap Strip */}
      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            marginBottom: '0.6rem',
          }}
        >
          Trusted Protocol Roadmap
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
          }}
        >
          {[
            'Solflare',
            'Umbra',
            'Cloak',
            'Token-2022 CT',
            'QuickNode',
            'Birdeye',
            'Kamino',
            'Jupiter',
            'Squads',
            'Blowfish',
          ].map((name) => (
            <span
              key={name}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                background: '#111318',
                color: '#94a3b8',
                border: '1px solid #1e293b',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
