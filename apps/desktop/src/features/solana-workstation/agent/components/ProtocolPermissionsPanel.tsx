import {
  TRUSTED_SOLANA_PROTOCOLS,
  SolanaAgentProtocolPermissionLevel,
  type SolanaAgentProtocolPermission,
} from '@gorkh/shared';

export function ProtocolPermissionsPanel({
  permissions,
  onToggle,
  readOnly = false,
}: {
  permissions: SolanaAgentProtocolPermission[];
  onToggle?: (protocolId: string, enabled: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {TRUSTED_SOLANA_PROTOCOLS.map((protocol) => {
        const perm = permissions.find((p) => p.protocolId === protocol.id);
        const enabled = perm?.enabled ?? false;
        const level = perm?.permissionLevel ?? SolanaAgentProtocolPermissionLevel.READ_ONLY;

        const levelColors: Record<string, { bg: string; text: string; border: string }> = {
          read_only: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
          draft_only: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
          future_execute_blocked: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
        };
        const lc = levelColors[level] ?? levelColors.read_only;

        return (
          <div
            key={protocol.id}
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(226,232,240,0.6)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            {!readOnly && onToggle && (
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onToggle(protocol.id, e.target.checked)}
                style={{ marginTop: '0.15rem' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  {protocol.name}
                </span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: lc.bg,
                    color: lc.text,
                    border: `1px solid ${lc.border}`,
                  }}
                >
                  {level.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {protocol.category}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {perm?.safetyNote ?? protocol.safetyNote}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
