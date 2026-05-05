import { SOLANA_WALLET_ROUTE_LABELS, type SolanaWalletRouteKind } from '@gorkh/shared';

export function PrivacyRoutesPanel() {
  const routes = Object.entries(SOLANA_WALLET_ROUTE_LABELS) as [SolanaWalletRouteKind, string][];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(226,232,240,0.6)',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Privacy Routes</span>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          Planned private send/receive integrations. No SDK or protocol calls are active.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {routes.map(([route, label]) => {
          const descriptions: Record<SolanaWalletRouteKind, string> = {
            umbra_planned:
              'Umbra stealth payments for Ethereum-compatible chains. Planned for future Solana bridging or equivalent.',
            cloak_planned:
              'Cloak private payments with compliance hooks. Planned integration for private transfers.',
            token_2022_confidential_transfer_planned:
              'Solana Token-2022 Confidential Transfer extension. Hides amounts/balances; addresses remain public.',
            manual_privacy_review_only:
              'No automated privacy route. Manual review and checklist only.',
          };
          return (
            <div
              key={route}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{label}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                {descriptions[route]}
              </div>
              <div
                style={{
                  marginTop: '0.3rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  display: 'inline-block',
                }}
              >
                Planned
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          fontSize: '0.75rem',
          color: '#92400e',
        }}
      >
        No Umbra, Cloak, Token-2022, or Light Protocol SDK calls are made in this phase.
        Routes are for planning and labeling only.
      </div>
    </div>
  );
}
