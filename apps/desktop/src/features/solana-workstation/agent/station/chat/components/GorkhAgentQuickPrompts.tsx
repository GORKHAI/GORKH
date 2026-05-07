const QUICK_PROMPTS = [
  'Check my wallet',
  'Summarize my portfolio',
  'Prepare Cloak private send',
  'Prepare Zerion DCA proposal',
  'Explain last Shield result',
  'Summarize Builder context',
  'Create context bundle',
];

export function GorkhAgentQuickPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div data-testid="gorkh-agent-quick-prompts" style={wrapStyle}>
      {QUICK_PROMPTS.map((prompt) => (
        <button key={prompt} type="button" onClick={() => onSelect(prompt)} style={promptStyle}>
          {prompt}
        </button>
      ))}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
};

const promptStyle: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(255,255,255,0.9)',
  color: '#334155',
  borderRadius: '6px',
  padding: '0.32rem 0.55rem',
  fontSize: '0.7rem',
  fontWeight: 650,
  cursor: 'pointer',
};
