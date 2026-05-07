export function GorkhAgentComposer({
  value,
  disabled,
  onChange,
  onSend,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div data-testid="gorkh-agent-chat-composer" style={wrapStyle}>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder={disabled ? 'Kill switch engaged. Ask for status, safety, or help.' : 'Ask GORKH Agent…'}
        rows={3}
        style={textareaStyle}
      />
      <button type="button" disabled={disabled || !value.trim()} onClick={onSend} style={sendStyle(disabled || !value.trim())}>
        Send
      </button>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '0.5rem',
  alignItems: 'end',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '76px',
  resize: 'vertical',
  borderRadius: '8px',
  border: '1px solid rgba(148,163,184,0.42)',
  background: 'rgba(255,255,255,0.95)',
  padding: '0.6rem',
  font: 'inherit',
  fontSize: '0.82rem',
};

function sendStyle(disabled: boolean): React.CSSProperties {
  return {
    border: 'none',
    borderRadius: '8px',
    padding: '0.55rem 0.85rem',
    background: disabled ? '#cbd5e1' : '#0f172a',
    color: 'white',
    fontWeight: 700,
    fontSize: '0.78rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
