import { WorkstationSafetyBadge, WorkstationStatusBadge } from './WorkstationSafetyBadge.js';
import { getNavItemById, type WorkstationModuleId } from './workstationNavigation.js';

export function WorkstationModuleHeader({
  moduleId,
  extra,
}: {
  moduleId: WorkstationModuleId;
  extra?: React.ReactNode;
}) {
  const item = getNavItemById(moduleId);
  if (!item) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.75rem 1rem',
        marginBottom: '0.75rem',
        background: '#111318',
        border: '1px solid #1e293b',
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: item.iconColor,
            }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#f8fafc',
            }}
          >
            {item.label}
          </h2>
          <WorkstationStatusBadge status={item.status} />
          <WorkstationSafetyBadge level={item.safetyLevel} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            lineHeight: 1.45,
            color: '#94a3b8',
          }}
        >
          {item.description}
        </p>
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}
