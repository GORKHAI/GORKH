import { SOLANA_AGENT_PHASE_6_SAFETY_NOTES } from '@gorkh/shared';

export function AgentSafetyPanel() {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        background: 'rgba(254,252,232,0.6)',
        border: '1px solid rgba(253,224,71,0.3)',
        fontSize: '0.8rem',
        lineHeight: 1.5,
        color: '#854d0e',
      }}
    >
      <strong>Agent v0.1 is local preview only.</strong>
      <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>
        {SOLANA_AGENT_PHASE_6_SAFETY_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
