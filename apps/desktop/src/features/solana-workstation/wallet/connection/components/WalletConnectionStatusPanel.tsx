import type { SolanaWalletConnectionState } from '@gorkh/shared';

export function WalletConnectionStatusPanel({
  state,
  onDisconnect,
}: {
  state: SolanaWalletConnectionState;
  onDisconnect: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
        Connection Status
      </div>

      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                state.status === 'connected_read_only'
                  ? '#22c55e'
                  : state.status === 'connecting'
                    ? '#f59e0b'
                    : state.status === 'error'
                      ? '#ef4444'
                      : '#94a3b8',
            }}
          />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
            {state.status === 'connected_read_only'
              ? 'Connected (Read-Only)'
              : state.status === 'connecting'
                ? 'Connecting…'
                : state.status === 'error'
                  ? 'Connection Error'
                  : state.status === 'unsupported'
                    ? 'Unsupported'
                    : 'Disconnected'}
          </span>
        </div>

        {state.provider && (
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            <strong>Provider:</strong> {state.provider}
          </div>
        )}

        {state.publicAddress && (
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
            <strong>Address:</strong> {state.publicAddress}
          </div>
        )}

        {state.network && (
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            <strong>Network:</strong> {state.network}
          </div>
        )}

        {state.error && (
          <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>{state.error}</div>
        )}

        {state.status === 'connected_read_only' && (
          <button
            onClick={onDisconnect}
            style={{
              alignSelf: 'flex-start',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#0f172a',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        )}
      </div>

      {state.capabilities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
            Capabilities
          </div>
          {state.capabilities.map((cap, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                color: '#64748b',
              }}
            >
              <span
                style={{
                  fontSize: '0.6rem',
                  color:
                    cap.status === 'enabled_read_only'
                      ? '#166534'
                      : cap.status === 'planned'
                        ? '#92400e'
                        : '#991b1b',
                }}
              >
                ●
              </span>
              <span>
                <strong>{cap.name}</strong> — {cap.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
