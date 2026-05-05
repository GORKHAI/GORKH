import { useState, useCallback } from 'react';
import {
  type SolanaRpcNetwork as SolanaRpcNetworkType,
  type SolanaRpcEndpointConfig,
} from '@gorkh/shared';
import { buildSafeRpcEndpoint, sanitizeRpcEndpointUrl } from '../../rpc/index.js';

const NETWORK_OPTIONS: { value: SolanaRpcNetworkType; label: string }[] = [
  { value: 'devnet', label: 'Devnet' },
  { value: 'mainnet-beta', label: 'Mainnet Beta' },
  { value: 'localnet', label: 'Localnet' },
];

export function WalletRpcSettingsPanel({
  endpoint,
  onChange,
}: {
  endpoint: SolanaRpcEndpointConfig;
  onChange: (config: SolanaRpcEndpointConfig) => void;
}) {
  const [customUrl, setCustomUrl] = useState(endpoint.isCustom ? endpoint.url : '');
  const [customError, setCustomError] = useState<string | null>(null);

  const handleNetworkChange = useCallback(
    (network: SolanaRpcNetworkType) => {
      const config = buildSafeRpcEndpoint(network, customUrl || undefined);
      onChange(config);
      setCustomError(null);
    },
    [customUrl, onChange]
  );

  const handleCustomUrlChange = useCallback(
    (url: string) => {
      setCustomUrl(url);
      if (!url.trim()) {
        const config = buildSafeRpcEndpoint(endpoint.network);
        onChange(config);
        setCustomError(null);
        return;
      }
      const sanitized = sanitizeRpcEndpointUrl(url);
      if (!sanitized.ok) {
        setCustomError(sanitized.error ?? 'Invalid endpoint URL');
        return;
      }
      setCustomError(null);
      const config = buildSafeRpcEndpoint(endpoint.network, url);
      onChange(config);
    },
    [endpoint.network, onChange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>RPC Settings</div>

      <select
        value={endpoint.network}
        onChange={(e) => handleNetworkChange(e.target.value as SolanaRpcNetworkType)}
        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
      >
        {NETWORK_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        placeholder="Custom endpoint (optional)"
        value={customUrl}
        onChange={(e) => handleCustomUrlChange(e.target.value)}
        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
      />

      {customError && (
        <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>{customError}</div>
      )}

      {!customError && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
          {endpoint.url}
        </div>
      )}

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          fontSize: '0.72rem',
          color: '#92400e',
        }}
      >
        Use trusted RPC endpoints only. RPC providers can observe address lookups.
      </div>
    </div>
  );
}
