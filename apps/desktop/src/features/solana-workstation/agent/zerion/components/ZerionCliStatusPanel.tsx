import type { ZerionApiKeyStatus, ZerionCliStatus } from '@gorkh/shared';

export function ZerionCliStatusPanel({
  binary,
  status,
  apiKeyStatus,
  apiKeyDraft,
  onBinaryChange,
  onApiKeyDraftChange,
  onDetect,
  onSaveApiKey,
  onClearApiKey,
}: {
  binary: string;
  status?: ZerionCliStatus;
  apiKeyStatus?: ZerionApiKeyStatus;
  apiKeyDraft: string;
  onBinaryChange: (value: string) => void;
  onApiKeyDraftChange: (value: string) => void;
  onDetect: () => void;
  onSaveApiKey: () => void;
  onClearApiKey: () => void;
}) {
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: '#0f172a' }}>CLI Status</strong>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.78rem' }}>
            Install with npm install -g zerion-cli or npx -y zerion-cli init -y --browser.
          </p>
        </div>
        <button className="gorkh-workstation-icon-button" onClick={onDetect}>Detect CLI</button>
      </div>
      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
        Binary
        <select value={binary} onChange={(event) => onBinaryChange(event.target.value)}>
          <option value="zerion">zerion</option>
          <option value="gorkh-zerion">gorkh-zerion</option>
        </select>
      </label>
      <div style={{ color: status?.detected ? '#166534' : '#991b1b', fontSize: '0.78rem' }}>
        {status ? (status.detected ? `Detected ${status.binary}${status.version ? ` (${status.version})` : ''}` : status.error ?? 'Not detected') : 'Not checked'}
      </div>
      <div style={{ display: 'grid', gap: '0.45rem' }}>
        <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>API Key Status</strong>
        <span style={{ color: '#64748b', fontSize: '0.76rem' }}>
          {apiKeyStatus?.configured ? `Configured via ${apiKeyStatus.source}; value hidden.` : 'No GORKH keychain key detected. Existing Zerion CLI config may still work.'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="password"
            value={apiKeyDraft}
            onChange={(event) => onApiKeyDraftChange(event.target.value)}
            placeholder="zk_... stored in OS keychain only"
            style={{ flex: '1 1 260px' }}
          />
          <button className="gorkh-workstation-icon-button" onClick={onSaveApiKey}>Store Key</button>
          <button className="gorkh-workstation-icon-button" onClick={onClearApiKey}>Clear Key</button>
        </div>
      </div>
    </div>
  );
}

