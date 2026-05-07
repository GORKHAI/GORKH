import type { GorkhAgentChatSettings } from '@gorkh/shared';

export function GorkhAgentChatSettingsPanel({
  settings,
  onChange,
}: {
  settings: GorkhAgentChatSettings;
  onChange: (settings: GorkhAgentChatSettings) => void;
}) {
  return (
    <details data-testid="gorkh-agent-chat-settings" style={detailsStyle}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.76rem', color: '#334155' }}>
        Chat settings
      </summary>
      <div style={gridStyle}>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={settings.includeWalletContext}
            onChange={(event) => onChange({ ...settings, includeWalletContext: event.target.checked })}
          />
          Wallet context
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={settings.includeMarketsContext}
            onChange={(event) => onChange({ ...settings, includeMarketsContext: event.target.checked })}
          />
          Markets context
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={settings.includeShieldContext}
            onChange={(event) => onChange({ ...settings, includeShieldContext: event.target.checked })}
          />
          Shield context
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={settings.includeBuilderContext}
            onChange={(event) => onChange({ ...settings, includeBuilderContext: event.target.checked })}
          />
          Builder context
        </label>
        <div style={disabledNoteStyle}>LLM planning: disabled by default. Deterministic policy routing is active.</div>
      </div>
    </details>
  );
}

const detailsStyle: React.CSSProperties = {
  border: '1px solid rgba(203,213,225,0.72)',
  background: 'rgba(255,255,255,0.72)',
  borderRadius: '8px',
  padding: '0.5rem 0.65rem',
};

const gridStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.65rem',
  flexWrap: 'wrap',
  marginTop: '0.45rem',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.3rem',
  fontSize: '0.74rem',
  color: '#475569',
};

const disabledNoteStyle: React.CSSProperties = {
  width: '100%',
  fontSize: '0.72rem',
  color: '#64748b',
};
