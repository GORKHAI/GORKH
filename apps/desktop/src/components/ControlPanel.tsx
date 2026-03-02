import { useState, useCallback } from 'react';
import type { WsClient } from '../lib/wsClient.js';

interface ControlPanelProps {
  wsClient: WsClient;
  deviceId: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ControlPanel({ wsClient, deviceId, enabled, onToggle }: ControlPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Log deviceId for debugging (marks it as used)
  console.debug('ControlPanel for device:', deviceId);

  const handleToggle = useCallback(() => {
    setIsLoading(true);
    const newEnabled = !enabled;
    
    // Send to server
    const sent = wsClient.sendControlState(newEnabled, 'local_user');
    
    if (sent) {
      onToggle(newEnabled);
    }
    
    setIsLoading(false);
  }, [wsClient, enabled, onToggle]);

  const handleStop = useCallback(() => {
    if (!enabled) return;
    
    setIsLoading(true);
    const sent = wsClient.sendControlState(false, 'local_user');
    
    if (sent) {
      onToggle(false);
    }
    
    setIsLoading(false);
  }, [wsClient, enabled, onToggle]);

  return (
    <div
      style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: enabled ? '#fef3c7' : 'white',
        borderRadius: '8px',
        border: enabled ? '2px solid #f59e0b' : '1px solid #e0e0e0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Remote Control</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
            {enabled 
              ? '⚠️ Remote control is ENABLED. Actions require your approval.' 
              : 'Remote control is disabled. Web cannot send input.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {enabled && (
            <button
              onClick={handleStop}
              disabled={isLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Stop Control
            </button>
          )}
          <button
            onClick={handleToggle}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: enabled ? '#6b7280' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {enabled ? 'Disable' : 'Allow Control'}
          </button>
        </div>
      </div>

      <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#666' }}>
        Safety: Every action (click, type, scroll) will show a confirmation modal before executing. 
        You can stop control at any time.
      </p>
    </div>
  );
}
