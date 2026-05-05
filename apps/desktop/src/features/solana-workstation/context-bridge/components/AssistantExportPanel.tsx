// Safety notes are embedded in the panel text below

export function AssistantExportPanel() {
  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(226,232,240,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
        Assistant Integration
      </span>
      <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
        Copy the Workstation Context Bundle above and paste it into the existing assistant chat
        manually for explanation or planning. The assistant cannot sign or execute Solana actions.
        Do not treat assistant output as approval to sign or execute.
      </span>
      <div
        style={{
          padding: '0.5rem',
          borderRadius: '6px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.8rem',
          color: '#991b1b',
        }}
      >
        <strong>Important:</strong> GORKH does not auto-send context to an LLM in Phase 7. All
        assistant interactions are manual and copy-based.
      </div>
    </div>
  );
}
