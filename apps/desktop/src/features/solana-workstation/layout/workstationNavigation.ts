// ============================================================================
// GORKH Workstation Navigation Model (Phase 11)
// ============================================================================
// Typed module definitions for the desktop-grade workstation shell.
// No execution, signing, or blockchain interaction here.
// ============================================================================

export type WorkstationModuleId =
  | 'wallet'
  | 'markets'
  | 'agent'
  | 'builder'
  | 'shield'
  | 'transaction-studio'
  | 'context';
export type WorkstationViewId = WorkstationModuleId | 'assistant';

export type WorkstationModuleStatus =
  | 'live_local'
  | 'read_only'
  | 'planner_only'
  | 'preview_only'
  | 'blocked_execution';

export type WorkstationSafetyLevel =
  | 'safe_read_only'
  | 'local_only'
  | 'draft_only'
  | 'execution_disabled';

export interface WorkstationNavItem {
  id: WorkstationModuleId;
  label: string;
  shortLabel: string;
  description: string;
  status: WorkstationModuleStatus;
  safetyLevel: WorkstationSafetyLevel;
  primaryActionLabel?: string;
  badge?: string;
  keyboardHint?: string;
  iconColor: string;
}

export const WORKSTATION_NAV_ITEMS: WorkstationNavItem[] = [
  {
    id: 'wallet',
    label: 'Wallet',
    shortLabel: 'Wallet',
    description: 'Private send/receive shell and wallet context.',
    status: 'planner_only',
    safetyLevel: 'draft_only',
    primaryActionLabel: 'New Profile',
    badge: 'v0.1',
    keyboardHint: '⌘1',
    iconColor: '#8b5cf6',
  },
  {
    id: 'markets',
    label: 'Markets',
    shortLabel: 'Markets',
    description: 'Read-only watchlists and token/wallet intelligence.',
    status: 'read_only',
    safetyLevel: 'safe_read_only',
    primaryActionLabel: 'Add Item',
    badge: 'v0.1',
    keyboardHint: '⌘2',
    iconColor: '#10b981',
  },
  {
    id: 'agent',
    label: 'Agent',
    shortLabel: 'Agent',
    description: 'Policy-bound Solana agent control center.',
    status: 'preview_only',
    safetyLevel: 'local_only',
    primaryActionLabel: 'New Agent',
    badge: 'v0.1',
    keyboardHint: '⌘3',
    iconColor: '#0ea5e9',
  },
  {
    id: 'builder',
    label: 'Builder',
    shortLabel: 'Builder',
    description: 'Anchor/Solana workspace diagnostics.',
    status: 'live_local',
    safetyLevel: 'local_only',
    primaryActionLabel: 'Inspect',
    badge: 'v0.2',
    keyboardHint: '⌘4',
    iconColor: '#ec4899',
  },
  {
    id: 'shield',
    label: 'Shield',
    shortLabel: 'Shield',
    description: 'Decode, inspect, and simulate transactions.',
    status: 'read_only',
    safetyLevel: 'safe_read_only',
    primaryActionLabel: 'Inspect',
    badge: 'v0.2',
    keyboardHint: '⌘5',
    iconColor: '#ef4444',
  },
  {
    id: 'transaction-studio',
    label: 'Transaction Studio',
    shortLabel: 'Studio',
    description: 'Decode, simulate, and explain Solana transactions before approval.',
    status: 'read_only',
    safetyLevel: 'safe_read_only',
    primaryActionLabel: 'Review',
    badge: 'v0.1',
    keyboardHint: '⌘6',
    iconColor: '#14b8a6',
  },
  {
    id: 'context',
    label: 'Context',
    shortLabel: 'Context',
    description: 'Export sanitized workstation context.',
    status: 'live_local',
    safetyLevel: 'local_only',
    primaryActionLabel: 'Export',
    badge: 'v0.1',
    keyboardHint: '⌘7',
    iconColor: '#f59e0b',
  },
];

export const WORKSTATION_MODULE_STATUS_LABELS: Record<WorkstationModuleStatus, string> = {
  live_local: 'Live Local',
  read_only: 'Read-Only',
  planner_only: 'Planner Only',
  preview_only: 'Preview Only',
  blocked_execution: 'Execution Disabled',
};

export const WORKSTATION_SAFETY_LEVEL_LABELS: Record<WorkstationSafetyLevel, string> = {
  safe_read_only: 'Safe Read-Only',
  local_only: 'Local Only',
  draft_only: 'Draft Only',
  execution_disabled: 'Execution Disabled',
};

export const WORKSTATION_SAFETY_LEVEL_COLORS: Record<
  WorkstationSafetyLevel,
  { bg: string; text: string; border: string }
> = {
  safe_read_only: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  local_only: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  draft_only: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  execution_disabled: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
};

export function getNavItemById(id: WorkstationModuleId): WorkstationNavItem | undefined {
  return WORKSTATION_NAV_ITEMS.find((item) => item.id === id);
}

export function getModuleStatusLabel(status: WorkstationModuleStatus): string {
  return WORKSTATION_MODULE_STATUS_LABELS[status] ?? status;
}

export function getSafetyLevelLabel(level: WorkstationSafetyLevel): string {
  return WORKSTATION_SAFETY_LEVEL_LABELS[level] ?? level;
}

export function getSafetyLevelColors(level: WorkstationSafetyLevel) {
  return WORKSTATION_SAFETY_LEVEL_COLORS[level] ?? WORKSTATION_SAFETY_LEVEL_COLORS.execution_disabled;
}
