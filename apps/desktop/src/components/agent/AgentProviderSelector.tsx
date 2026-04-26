//! Provider selector for Advanced Agent

import { useState, useEffect } from 'react';
import type { ProviderType, ProviderInfo } from '../../lib/advancedAgent.js';
import {
  listProviders,
  testProvider,
  setProviderApiKey,
} from '../../lib/advancedAgent.js';

interface AgentProviderSelectorProps {
  value: ProviderType | null;
  onChange: (provider: ProviderType | null) => void;
}

const providerDetails: Record<ProviderType, { name: string; description: string }> = {
  native_qwen_ollama: {
    name: 'Free AI',
    description: 'Free, runs locally on your Mac. No internet required.',
  },
  local_openai_compat: {
    name: 'Local OpenAI-compatible',
    description: 'Your own local server (vLLM, llama.cpp, etc.)',
  },
  openai: {
    name: 'OpenAI GPT-4o',
    description: 'Powerful vision model. Pay per use.',
  },
  claude: {
    name: 'Claude 3.5 Sonnet',
    description: 'Advanced reasoning. Pay per use.',
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'Cost-efficient reasoning. Pay per use.',
  },
  kimi: {
    name: 'Moonshot (Kimi)',
    description: 'Long-context reasoning. Pay per use.',
  },
};

export function AgentProviderSelector({ value, onChange }: AgentProviderSelectorProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<ProviderType | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState<ProviderType | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const list = await listProviders();
      setProviders(list);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (provider: ProviderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(provider);
    try {
      const available = await testProvider(provider);
      setProviders(prev =>
        prev.map(p => (p.providerType === provider ? { ...p, available } : p))
      );
    } finally {
      setTesting(null);
    }
  };

  const handleSetApiKey = async () => {
    if (!apiKeyDialogOpen || !apiKey.trim()) return;
    try {
      await setProviderApiKey(apiKeyDialogOpen, apiKey.trim());
      setApiKey('');
      setApiKeyDialogOpen(null);
      await loadProviders();
    } catch (err) {
      console.error('Failed to set API key:', err);
    }
  };

  const isPaidProvider = (provider: ProviderType) =>
    provider === 'openai' || provider === 'claude' || provider === 'deepseek' || provider === 'kimi';

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    providerCard: {
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    providerCardSelected: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff',
    },
    providerHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '4px',
    },
    providerName: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    badge: {
      fontSize: '0.65rem',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontWeight: 600,
    },
    badgeFree: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    badgeVision: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    badgeAvailable: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#22c55e',
    },
    badgeUnavailable: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#f59e0b',
    },
    description: {
      fontSize: '0.75rem',
      color: '#6b7280',
      marginBottom: '8px',
    },
    actions: {
      display: 'flex',
      gap: '8px',
    },
    button: {
      padding: '4px 12px',
      fontSize: '0.75rem',
      borderRadius: '4px',
      border: '1px solid #d1d5db',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white',
      borderColor: '#3b82f6',
    },
    radioWrapper: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    },
    radio: {
      marginTop: '2px',
    },
    dialogOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    dialog: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      width: '100%',
      maxWidth: '400px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    dialogTitle: {
      fontSize: '1.125rem',
      fontWeight: 600,
      marginBottom: '8px',
    },
    dialogDescription: {
      fontSize: '0.875rem',
      color: '#6b7280',
      marginBottom: '16px',
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem',
      marginBottom: '16px',
    },
    dialogActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
    },
  };

  return (
    <div style={styles.container}>
      {loading && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loading providers...</div>}
      
      {providers.map((provider) => {
        const details = providerDetails[provider.providerType];
        const isSelected = value === provider.providerType;

        return (
          <div
            key={provider.providerType}
            style={{
              ...styles.providerCard,
              ...(isSelected ? styles.providerCardSelected : {}),
            }}
            onClick={() => onChange(provider.providerType)}
          >
            <div style={styles.radioWrapper}>
              <input
                type="radio"
                name="provider"
                checked={isSelected}
                onChange={() => onChange(provider.providerType)}
                style={styles.radio}
              />
              <div style={{ flex: 1 }}>
                <div style={styles.providerHeader}>
                  <span style={styles.providerName}>{details.name}</span>
                  {provider.isFree && (
                    <span style={{ ...styles.badge, ...styles.badgeFree }}>FREE</span>
                  )}
                  {provider.supportsVision && (
                    <span style={{ ...styles.badge, ...styles.badgeVision }}>Vision</span>
                  )}
                  {provider.available ? (
                    <span style={styles.badgeAvailable} title="Available" />
                  ) : (
                    <span style={styles.badgeUnavailable} title="Unavailable" />
                  )}
                </div>
                <p style={styles.description}>{details.description}</p>

                <div style={styles.actions}>
                  <button
                    style={styles.button}
                    onClick={(e) => handleTest(provider.providerType, e)}
                    disabled={testing === provider.providerType}
                  >
                    {testing === provider.providerType ? 'Testing...' : 'Test'}
                  </button>

                  {isPaidProvider(provider.providerType) && (
                    <button
                      style={styles.button}
                      onClick={(e) => {
                        e.stopPropagation();
                        setApiKeyDialogOpen(provider.providerType);
                      }}
                    >
                      Set API Key
                    </button>
                  )}
                </div>

                {!provider.available && provider.isFree && (
                  <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '8px' }}>
                    Not available. Use "Set Up Free AI" in the main assistant view to install and start the local AI engine.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* API Key Dialog */}
      {apiKeyDialogOpen && (
        <div style={styles.dialogOverlay} onClick={() => setApiKeyDialogOpen(null)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Set API Key</h3>
            <p style={styles.dialogDescription}>
              Enter your API key for {apiKeyDialogOpen && providerDetails[apiKeyDialogOpen].name}.
              It will be securely stored in your system&apos;s keychain.
            </p>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={styles.input}
            />
            <div style={styles.dialogActions}>
              <button style={styles.button} onClick={() => setApiKeyDialogOpen(null)}>
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleSetApiKey}
                disabled={!apiKey.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
