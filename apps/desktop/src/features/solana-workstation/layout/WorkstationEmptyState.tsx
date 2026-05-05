export function WorkstationEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '3rem 1rem',
        color: '#64748b',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
        }}
      >
        ∅
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>{title}</div>
      <div style={{ fontSize: '0.8rem', maxWidth: '320px', lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}
