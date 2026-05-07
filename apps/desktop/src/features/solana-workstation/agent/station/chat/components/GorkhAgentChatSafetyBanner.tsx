import type { GorkhAgentRuntimeState } from '@gorkh/shared';

export function GorkhAgentChatSafetyBanner({ runtime }: { runtime: GorkhAgentRuntimeState }) {
  return (
    <div data-testid="gorkh-agent-chat-safety-banner" style={bannerStyle}>
      <strong>GORKH Agent can draft and hand off actions.</strong>
      <span> It cannot sign or execute transactions from chat.</span>
      <span style={runtime.killSwitchEnabled ? dangerStyle : okStyle}>
        Kill switch: {runtime.killSwitchEnabled ? 'engaged' : 'off'}
      </span>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  background: '#f8fafc',
  border: '1px solid rgba(148,163,184,0.32)',
  color: '#334155',
  fontSize: '0.78rem',
  display: 'flex',
  gap: '0.35rem',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const okStyle: React.CSSProperties = {
  marginLeft: 'auto',
  color: '#166534',
  fontWeight: 700,
};

const dangerStyle: React.CSSProperties = {
  ...okStyle,
  color: '#991b1b',
};
