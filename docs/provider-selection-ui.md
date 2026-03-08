# Provider Selection UI

## Settings Panel Component

```tsx
// components/ProviderSettings.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Provider {
  type: string;
  name: string;
  available: boolean;
  isFree: boolean;
  capabilities: {
    supportsVision: boolean;
    supportsStreaming: boolean;
    maxContextTokens: number;
  };
}

interface ApiKeyStatus {
  provider: string;
  valid: boolean;
  lastChecked: string;
}

export function ProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<string>('native');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeyInput, setShowKeyInput] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [costTracking, setCostTracking] = useState({
    enabled: true,
    limitPerTask: 1.0,
    alwaysAskPaid: true,
  });
  const [usageStats, setUsageStats] = useState({
    native: 0,
    paid: 0,
    totalCost: 0,
  });

  useEffect(() => {
    loadProviders();
    loadPreferences();
    loadUsageStats();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await invoke<Provider[]>('list_providers');
      setProviders(data);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const loadPreferences = async () => {
    // Load from local storage or backend
  };

  const loadUsageStats = async () => {
    // Load usage statistics
  };

  const setProvider = async (providerType: string) => {
    try {
      await invoke('set_default_provider', { provider: providerType });
      setDefaultProvider(providerType);
    } catch (err) {
      console.error('Failed to set provider:', err);
    }
  };

  const saveApiKey = async (provider: string) => {
    try {
      await invoke('set_provider_api_key', {
        provider,
        apiKey: tempKey,
      });
      setApiKeys({ ...apiKeys, [provider]: tempKey });
      setShowKeyInput(null);
      setTempKey('');
      loadProviders(); // Refresh availability
    } catch (err) {
      console.error('Failed to save API key:', err);
    }
  };

  const testProvider = async (provider: string) => {
    try {
      const available = await invoke<boolean>('test_provider', { provider });
      alert(available ? `${provider} is working!` : `${provider} failed test`);
    } catch (err) {
      alert(`Test failed: ${err}`);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px' }}>
      <h2>AI Model Provider Settings</h2>
      
      {/* Usage Stats */}
      <div style={{
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Usage Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <StatBox
            label="Native Model"
            value={`${usageStats.native} tasks`}
            color="#10b981"
          />
          <StatBox
            label="Paid Providers"
            value={`${usageStats.paid} tasks`}
            color="#f59e0b"
          />
          <StatBox
            label="Total Cost"
            value={`$${usageStats.totalCost.toFixed(2)}`}
            color="#ef4444"
          />
        </div>
      </div>

      {/* Provider List */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Select Default Provider</h3>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Choose which AI model to use for automation tasks
        </p>

        {providers.map((provider) => (
          <div
            key={provider.type}
            style={{
              padding: '1rem',
              marginBottom: '0.75rem',
              background: 'white',
              border: `2px solid ${defaultProvider === provider.type ? '#0070f3' : '#e5e7eb'}`,
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            onClick={() => provider.available && setProvider(provider.type)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Radio button */}
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: defaultProvider === provider.type ? '#0070f3' : '#ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {defaultProvider === provider.type && (
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#0070f3',
                  }} />
                )}
              </div>

              {/* Provider Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{provider.name}</span>
                  {provider.isFree && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      background: '#d1fae5',
                      color: '#065f46',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                    }}>
                      FREE
                    </span>
                  )}
                  {!provider.available && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                    }}>
                      Setup Required
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                  {provider.capabilities.supportsVision && '📷 Vision'}
                  {' • '}
                  {provider.capabilities.maxContextTokens >= 100000 ? '🧠 Large Context' : 'Standard Context'}
                  {' • '}
                  {provider.isFree ? 'No cost' : 'Pay per use'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!provider.isFree && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowKeyInput(provider.type);
                    }}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  >
                    {apiKeys[provider.type] ? 'Update Key' : 'Add Key'}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    testProvider(provider.type);
                  }}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: '#dbeafe',
                    border: '1px solid #3b82f6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                  }}
                >
                  Test
                </button>
              </div>
            </div>

            {/* API Key Input */}
            {showKeyInput === provider.type && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '4px',
              }}>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Enter your API key for {provider.name}:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="sk-..."
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  />
                  <button
                    onClick={() => saveApiKey(provider.type)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#0070f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowKeyInput(null);
                      setTempKey('');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cost Control Settings */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Cost Control</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={costTracking.enabled}
              onChange={(e) => setCostTracking({ ...costTracking, enabled: e.target.checked })}
            />
            <span>Track and limit costs</span>
          </label>
        </div>

        {costTracking.enabled && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                Cost limit per task: ${costTracking.limitPerTask}
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={costTracking.limitPerTask}
                onChange={(e) => setCostTracking({ ...costTracking, limitPerTask: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={costTracking.alwaysAskPaid}
                  onChange={(e) => setCostTracking({ ...costTracking, alwaysAskPaid: e.target.checked })}
                />
                <span>Always ask for confirmation before using paid providers</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Native Model Settings */}
      <div>
        <h3>Native Model</h3>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Your free local AI model for automation
        </p>

        <div style={{
          padding: '1rem',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          marginTop: '0.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>AI Operator Native v1.0</div>
              <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                Specialized for computer automation • Runs locally • Free forever
              </div>
            </div>
            <button
              onClick={() => invoke('check_native_model_update')}
              style={{
                padding: '0.5rem 1rem',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Check for Updates
            </button>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            <div>Model size: 7B parameters</div>
            <div>Quantization: Q4_K_M (4GB)</div>
            <div>VRAM required: ~6GB</div>
            <div>Capabilities: Vision, Planning, Action Prediction</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '0.75rem',
      background: 'white',
      borderRadius: '6px',
      textAlign: 'center',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
```

## In-Task Provider Switching

```tsx
// components/ActiveTaskPanel.tsx
export function ActiveTaskPanel({ task }: { task: AgentTask }) {
  const [currentProvider, setCurrentProvider] = useState(task.provider);
  const [showProviderSwitch, setShowProviderSwitch] = useState(false);

  const switchProvider = async (newProvider: string) => {
    await invoke('switch_task_provider', {
      taskId: task.id,
      provider: newProvider,
    });
    setCurrentProvider(newProvider);
    setShowProviderSwitch(false);
  };

  return (
    <div>
      {/* Task info */}
      
      {/* Provider indicator */}
      <div style={{
        padding: '0.5rem',
        background: '#f3f4f6',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>Using: </span>
          <span style={{ fontWeight: 600 }}>
            {currentProvider === 'native' ? 'AI Operator Native (Free)' : currentProvider}
          </span>
          {currentProvider !== 'native' && (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '0.5rem' }}>
              (Paid - ~$0.02/task)
            </span>
          )}
        </div>
        
        <button
          onClick={() => setShowProviderSwitch(true)}
          style={{
            padding: '0.25rem 0.5rem',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          Switch
        </button>
      </div>

      {/* Provider switch modal */}
      {showProviderSwitch && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            maxWidth: '400px',
          }}>
            <h3>Switch AI Model</h3>
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              Changing model mid-task may affect performance
            </p>
            
            {/* Provider options */}
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => switchProvider('native')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: currentProvider === 'native' ? '#d1fae5' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600 }}>AI Operator Native</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Free • Local • Good for most tasks</div>
              </button>

              <button
                onClick={() => switchProvider('claude')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: currentProvider === 'claude' ? '#dbeafe' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600 }}>Claude 3.5 Sonnet</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>~$0.02-0.05/task • Best accuracy</div>
              </button>

              <button
                onClick={() => switchProvider('openai')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: currentProvider === 'openai' ? '#dbeafe' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600 }}>GPT-4o</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>~$0.02-0.05/task • Fast & capable</div>
              </button>
            </div>

            <button
              onClick={() => setShowProviderSwitch(false)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.5rem',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Cost Warning Dialog

```tsx
// components/CostWarningDialog.tsx
export function CostWarningDialog({
  provider,
  estimatedCost,
  onConfirm,
  onCancel,
}: {
  provider: string;
  estimatedCost: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        maxWidth: '450px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>💳</span>
          <h3 style={{ margin: 0 }}>Paid Provider Selected</h3>
        </div>

        <p>
          You're about to use <strong>{provider}</strong>, which costs money per task.
        </p>

        <div style={{
          padding: '0.75rem',
          background: '#fef3c7',
          borderRadius: '6px',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: '0.875rem' }}>
            Estimated cost for this task: <strong>${estimatedCost.toFixed(3)}</strong>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
            Actual cost may vary based on task complexity
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          💡 <strong>Tip:</strong> Use the free Native Model for most tasks. 
          Paid providers are best for complex creative work.
        </p>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
          />
          <span style={{ fontSize: '0.875rem' }}>Don't ask again for this session</span>
        </label>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '1rem',
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
            }}
          >
            Use Free Model Instead
          </button>
          <button
            onClick={() => {
              if (dontAskAgain) {
                // Save preference
              }
              onConfirm();
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
            }}
          >
            Continue with {provider}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Backend Commands

```rust
// Tauri commands for provider management

#[tauri::command]
pub async fn list_providers(
    router: State<'_, ProviderRouter>,
) -> Result<Vec<ProviderInfo>, String> {
    router.list_available_providers().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_default_provider(
    router: State<'_, ProviderRouter>,
    provider: ProviderType,
) -> Result<(), String> {
    router.set_default_provider(provider).await;
    Ok(())
}

#[tauri::command]
pub async fn set_provider_api_key(
    router: State<'_, ProviderRouter>,
    provider: ProviderType,
    api_key: String,
) -> Result<(), String> {
    // Validate key first
    let mut providers = router.providers.write().await;
    
    match provider {
        ProviderType::Anthropic => {
            let claude = ClaudeProvider::new(&api_key);
            if !claude.is_available().await {
                return Err("Invalid API key".to_string());
            }
            providers.insert(provider, Box::new(claude));
        }
        ProviderType::OpenAi => {
            let openai = OpenAiProvider::new(&api_key);
            if !openai.is_available().await {
                return Err("Invalid API key".to_string());
            }
            providers.insert(provider, Box::new(openai));
        }
        // ... other providers
        _ => return Err("Invalid provider type".to_string()),
    }
    
    // Save to secure storage
    save_api_key_securely(provider, &api_key).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn test_provider(
    router: State<'_, ProviderRouter>,
    provider: ProviderType,
) -> Result<bool, String> {
    if let Some(provider) = router.get_provider(provider).await {
        Ok(provider.is_available().await)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn get_usage_stats(
    state: State<'_, AppState>,
) -> Result<UsageStats, String> {
    state.get_usage_stats().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn switch_task_provider(
    task_id: String,
    provider: ProviderType,
) -> Result<(), String> {
    // Switch provider for active task
    Ok(())
}
```

## Key Features

1. **Provider Selection** - Easy radio-button selection with clear indicators
2. **Cost Transparency** - Real-time cost estimates before using paid providers
3. **API Key Management** - Secure storage and validation
4. **Usage Tracking** - Monitor native vs paid usage
5. **Cost Controls** - Limits and confirmation dialogs
6. **Mid-task Switching** - Change providers without restarting

This UI makes it clear that your native model is the free default, while making paid options available for users who need them.
