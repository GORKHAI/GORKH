interface ActiveOverlayShellProps {
  statusLabel: string;
  goal?: string | null;
  overlaySupported: boolean;
}

export function ActiveOverlayShell({
  statusLabel,
  goal,
  overlaySupported,
}: ActiveOverlayShellProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      {/* GORKH branding - minimal top-left status pill */}
      <div
        style={{
          position: 'absolute',
          left: '1.25rem',
          top: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '999px',
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          color: '#ffffff',
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            animation: 'pulse 2s infinite',
          }}
        />
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
          {statusLabel}
        </div>
        {goal && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginLeft: '0.25rem' }}>
            • {goal.length > 40 ? goal.slice(0, 40) + '...' : goal}
          </div>
        )}
      </div>

      {/* Optional: subtle corner hint */}
      {!overlaySupported && (
        <div
          style={{
            position: 'absolute',
            left: '1.25rem',
            top: '3.5rem',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.5)',
            padding: '0.3rem 0.6rem',
            borderRadius: '6px',
          }}
        >
          Focus mode (overlay not available)
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
