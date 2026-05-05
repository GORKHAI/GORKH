import { useState, useCallback } from 'react';
import {
  SolanaMarketDataProviderStatus,
  type SolanaMarketProviderConfig,
} from '@gorkh/shared';
import {
  getAllMarketDataProviderDefinitions,
  getProviderLabel,
  getProviderStatusLabel,
} from '../marketDataProviderRegistry.js';
import {
  getOrCreateProviderConfigs,
  saveMarketProviderConfigs,
} from '../marketProviderConfigStorage.js';
import { sanitizeProviderApiKeyInput } from '../marketDataGuards.js';

export function MarketDataProviderPanel() {
  const [configs, setConfigs] = useState<SolanaMarketProviderConfig[]>(() =>
    getOrCreateProviderConfigs()
  );
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const definitions = getAllMarketDataProviderDefinitions();

  const handleToggle = useCallback((providerId: string) => {
    setConfigs((prev) => {
      const updated = prev.map((c) =>
        c.provider === providerId ? { ...c, enabled: !c.enabled } : c
      );
      saveMarketProviderConfigs(updated);
      return updated;
    });
  }, []);

  const handleApiKeyChange = useCallback((providerId: string, value: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [providerId]: value }));
  }, []);

  const handleSetApiKeyPresent = useCallback((providerId: string) => {
    const raw = apiKeyInputs[providerId] ?? '';
    if (!raw.trim()) {
      setFeedback('Please enter an API key before confirming.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    try {
      sanitizeProviderApiKeyInput(raw);
    } catch (e: any) {
      setFeedback(e.message ?? 'Invalid API key input.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    // Do NOT store the actual key. Only mark apiKeyPresent = true.
    setConfigs((prev) => {
      const updated = prev.map((c) =>
        c.provider === providerId ? { ...c, apiKeyPresent: true } : c
      );
      saveMarketProviderConfigs(updated);
      return updated;
    });
    setApiKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
    setFeedback('API key acknowledged (not stored).');
    setTimeout(() => setFeedback(null), 3000);
  }, [apiKeyInputs]);

  const handleClearApiKey = useCallback((providerId: string) => {
    setConfigs((prev) => {
      const updated = prev.map((c) =>
        c.provider === providerId ? { ...c, apiKeyPresent: false } : c
      );
      saveMarketProviderConfigs(updated);
      return updated;
    });
    setFeedback('API key presence cleared.');
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {feedback && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            fontSize: '0.78rem',
            color: '#065f46',
          }}
        >
          {feedback}
        </div>
      )}

      <div
        style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.78rem',
          color: '#991b1b',
        }}
      >
        GORKH never stores API keys. Keys are kept in memory only for manual-fetch sessions.
      </div>

      {definitions.map((def) => {
        const config = configs.find((c) => c.provider === def.id);
        const isEnabled = config?.enabled ?? false;
        const statusColor =
          def.status === SolanaMarketDataProviderStatus.AVAILABLE_READ_ONLY
            ? '#166534'
            : def.status === SolanaMarketDataProviderStatus.REQUIRES_USER_API_KEY
              ? '#92400e'
              : '#64748b';
        const statusBg =
          def.status === SolanaMarketDataProviderStatus.AVAILABLE_READ_ONLY
            ? '#dcfce7'
            : def.status === SolanaMarketDataProviderStatus.REQUIRES_USER_API_KEY
              ? '#fef9c3'
              : '#f1f5f9';

        return (
          <div
            key={def.id}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggle(def.id)}
                  disabled={def.status === SolanaMarketDataProviderStatus.PLANNED}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  {getProviderLabel(def.id)}
                </span>
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: statusBg,
                  color: statusColor,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {getProviderStatusLabel(def.id)}
              </span>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Capabilities: {def.capabilities.join(', ')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{def.roadmapNote}</div>

            {def.requiresApiKey && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.2rem' }}>
                {!config?.apiKeyPresent ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="password"
                        placeholder="API key (not stored)"
                        value={apiKeyInputs[def.id] ?? ''}
                        onChange={(e) => handleApiKeyChange(def.id, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.3rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                        }}
                      />
                      <button
                        onClick={() => handleSetApiKeyPresent(def.id)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#0f172a',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Key is acknowledged in memory only. GORKH does not persist API keys.
                    </span>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      API key present (not stored)
                    </span>
                    <button
                      onClick={() => handleClearApiKey(def.id)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        color: '#64748b',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
