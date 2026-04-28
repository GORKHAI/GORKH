interface OverlayControllerMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
}

interface OverlayControllerProps {
  messages: OverlayControllerMessage[];
  statusLabel: string;
  goal?: string | null;
  providerLabel: string;
  isPaused: boolean;
  detailsOpen: boolean;
  onStop: () => void;
  onPauseToggle: () => void;
  onOpenDetails: () => void;
  onOpenSettings: () => void;
}

export function OverlayController({
  messages,
  statusLabel,
  goal,
  providerLabel,
  isPaused,
  detailsOpen,
  onStop,
  onPauseToggle,
  onOpenDetails,
  onOpenSettings,
}: OverlayControllerProps) {
  const messagePreview = messages.slice(-2);

  return (
    <div
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 140,
        width: 'min(272px, calc(100vw - 1.5rem))',
        borderRadius: '16px',
        background: 'rgba(15,23,42,0.72)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 14px 34px rgba(2,6,23,0.28)',
        color: '#f8fafc',
        overflow: 'hidden',
        // Intentionally no backdropFilter — avoids frosted-glass treatment per design test
      }}
    >
      <div
        style={{
          padding: '0.65rem 0.75rem 0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(2,6,23,0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '0.16rem',
              }}
            >
              GORKH
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ffffff' }}>{statusLabel}</div>
          </div>
          <div
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.6rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {providerLabel}
          </div>
        </div>

        {goal ? (
          <div style={{ marginTop: '0.32rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', lineHeight: 1.35 }}>
            {goal}
          </div>
        ) : null}
      </div>

      <div
        style={{
          padding: '0.5rem 0.75rem',
          display: 'grid',
          gap: '0.32rem',
          maxHeight: '110px',
          overflowY: 'auto',
        }}
      >
        {messagePreview.length === 0 ? (
          <div
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.74rem',
              fontStyle: 'italic',
            }}
          >
            Working on your task...
          </div>
        ) : (
          messagePreview.map((message) => (
            <div
              key={message.id}
              style={{
                alignSelf: message.role === 'user' ? 'end' : 'start',
                marginLeft: message.role === 'user' ? '1.5rem' : 0,
                marginRight: message.role === 'agent' ? '1.5rem' : 0,
                padding: '0.48rem 0.62rem',
                borderRadius: '10px',
                background: message.role === 'user'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: message.role === 'user' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
                fontSize: '0.74rem',
                lineHeight: 1.35,
              }}
            >
              {message.text}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          padding: '0 0.75rem 0.65rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
        }}
      >
        <button
          onClick={onStop}
          style={{
            padding: '0.42rem 0.68rem',
            borderRadius: '999px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(153,27,27,0.7)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.74rem',
          }}
        >
          Stop
        </button>
        <button
          onClick={onPauseToggle}
          style={{
            padding: '0.42rem 0.68rem',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.74rem',
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onOpenDetails}
          style={{
            padding: '0.42rem 0.68rem',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.74rem',
          }}
        >
          {detailsOpen ? 'Hide' : 'Details'}
        </button>
        <button
          onClick={onOpenSettings}
          style={{
            padding: '0.42rem 0.68rem',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.74rem',
          }}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
