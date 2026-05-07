export function GorkhAgentThinkingState() {
  return (
    <div data-testid="gorkh-agent-thinking" style={style}>
      Planning with deterministic local policy…
    </div>
  );
}

const style: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  padding: '0.4rem 0.2rem',
};
