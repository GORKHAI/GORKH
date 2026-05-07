import { ZERION_PHASE_SAFETY_NOTES } from '@gorkh/shared';

export function ZerionSafetyPanel() {
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.5rem' }}>
      <strong style={{ color: '#0f172a' }}>Zerion Executor Safety</strong>
      <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: 1.5 }}>
        Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet.
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#475569', fontSize: '0.78rem', lineHeight: 1.55 }}>
        {ZERION_PHASE_SAFETY_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
        <li>Bridge and send are disabled. Raw sign-message is disabled.</li>
      </ul>
    </div>
  );
}

