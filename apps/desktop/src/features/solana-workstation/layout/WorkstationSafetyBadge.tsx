import { getSafetyLevelColors, type WorkstationSafetyLevel } from './workstationNavigation.js';

export function WorkstationSafetyBadge({ level, label }: { level: WorkstationSafetyLevel; label?: string }) {
  const colors = getSafetyLevelColors(level);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {label ?? level.replace(/_/g, ' ')}
    </span>
  );
}

export function WorkstationStatusBadge({ status, label }: { status: string; label?: string }) {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    live_local: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    read_only: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    planner_only: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    preview_only: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
    blocked_execution: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  };
  const colors = statusColors[status] ?? statusColors.blocked_execution;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}
