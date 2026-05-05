interface ShieldCapability {
  id: string;
  title: string;
  description: string;
  available: boolean;
}

const SHIELD_CAPABILITIES: ShieldCapability[] = [
  {
    id: 'decode',
    title: 'Decode',
    description: 'Decode transactions into human-readable instructions before approval.',
    available: false,
  },
  {
    id: 'simulate',
    title: 'Simulate',
    description: 'Simulate transaction outcomes and state changes locally.',
    available: false,
  },
  {
    id: 'explain',
    title: 'Explain',
    description: 'Get plain-language explanations of what a transaction does.',
    available: false,
  },
  {
    id: 'approve',
    title: 'Approve',
    description: 'Explicit human approval with risk classification before execution.',
    available: true,
  },
  {
    id: 'attest',
    title: 'Attest',
    description: 'Future local agent accountability preview for verified agent behavior.',
    available: false,
  },
];

export function TrustLayerPanel() {
  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid rgba(52,211,153,0.22)',
        background: 'rgba(16,185,129,0.04)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#10b981',
          }}
        />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          GORKH Shield
        </h3>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            background: '#ecfdf5',
            color: '#166534',
            border: '1px solid #bbf7d0',
          }}
        >
          Trust Layer
        </span>
      </div>

      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.5, color: '#475569' }}>
        Transaction decoding, simulation, risk explanation, and approval preview.
        In Phase 1, Shield is represented as a UI foundation. Real Solana transaction
        decoding and simulation are not yet implemented.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {SHIELD_CAPABILITIES.map((cap) => (
          <div
            key={cap.id}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: `1px solid ${cap.available ? 'rgba(52,211,153,0.25)' : 'rgba(226,232,240,0.6)'}`,
              background: cap.available ? 'rgba(220,252,231,0.35)' : 'rgba(248,250,252,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: cap.available ? '#166534' : '#64748b',
                }}
              >
                {cap.title}
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: cap.available ? '#dcfce7' : '#f1f5f9',
                  color: cap.available ? '#166534' : '#94a3b8',
                }}
              >
                {cap.available ? 'Active' : 'Planned'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', lineHeight: 1.45, color: '#64748b' }}>
              {cap.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
