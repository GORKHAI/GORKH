import { useState, useEffect, useCallback } from 'react';
import type { ServerMessage, ServerPairingCode, ServerChatMessage, RunWithSteps, ApprovalRequest, InputAction } from '@ai-operator/shared';
import { WsClient, type ConnectionStatus } from './lib/wsClient.js';
import { executeAction } from './lib/actionExecutor.js';
import { ChatOverlay } from './components/ChatOverlay.js';
import { RunPanel } from './components/RunPanel.js';
import { ApprovalModal } from './components/ApprovalModal.js';
import { ScreenPanel } from './components/ScreenPanel.js';
import { ControlPanel } from './components/ControlPanel.js';
import { ActionApprovalModal } from './components/ActionApprovalModal.js';

// Get or create a stable device ID
function getOrCreateDeviceId(): string {
  const key = 'ai-operator-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// Detect platform
function detectPlatform(): 'macos' | 'windows' | 'linux' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

// Get WebSocket URL from env or default
const WS_URL = import.meta.env.VITE_API_WS_URL || 'ws://localhost:3001/ws';

interface ChatItem {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

function App() {
  const [client, setClient] = useState<WsClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Run state
  const [activeRun, setActiveRun] = useState<RunWithSteps | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{ runId: string; approval: ApprovalRequest } | null>(null);
  
  // Control state
  const [controlEnabled, setControlEnabled] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ actionId: string; action: InputAction } | null>(null);
  const [inputPermissionError, setInputPermissionError] = useState<string | null>(null);

  // Initialize client on mount
  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    const wsClient = new WsClient({
      deviceId: id,
      deviceName: `Desktop-${id.slice(0, 8)}`,
      platform: detectPlatform(),
      appVersion: '0.0.4',
      onStatusChange: (newStatus) => {
        console.log('[App] Connection status:', newStatus);
        setStatus(newStatus);
      },
      onMessage: (message: ServerMessage) => {
        handleServerMessage(message);
      },
      onError: (error) => {
        console.error('[App] Server error:', error);
      },
      // Run callbacks
      onRunDetails: (run) => {
        console.log('[App] Run details received:', run.runId);
        setActiveRun(run);
      },
      onStepUpdate: (runId, step) => {
        console.log('[App] Step update:', runId, step.stepId, step.status);
        setActiveRun((prev) => {
          if (!prev || prev.runId !== runId) return prev;
          const updatedSteps = prev.steps.map((s) =>
            s.stepId === step.stepId ? step : s
          );
          return { ...prev, steps: updatedSteps, status: step.status === 'blocked' ? 'waiting_for_user' : prev.status };
        });
      },
      onRunLog: (runId, stepId, log) => {
        setActiveRun((prev) => {
          if (!prev || prev.runId !== runId) return prev;
          const updatedSteps = prev.steps.map((s) => {
            if (s.stepId === stepId) {
              const newLogs = [...s.logs, log];
              // Keep last 1000 logs
              if (newLogs.length > 1000) newLogs.shift();
              return { ...s, logs: newLogs };
            }
            return s;
          });
          return { ...prev, steps: updatedSteps };
        });
      },
      onApprovalRequest: (runId, approval) => {
        console.log('[App] Approval request:', runId, approval.approvalId);
        setPendingApproval({ runId, approval });
        setActiveRun((prev) => {
          if (!prev || prev.runId !== runId) return prev;
          return { ...prev, pendingApproval: approval, status: 'waiting_for_user' };
        });
      },
      onRunCanceled: (runId) => {
        console.log('[App] Run canceled:', runId);
        setActiveRun((prev) => {
          if (!prev || prev.runId !== runId) return prev;
          return { ...prev, status: 'canceled' };
        });
      },
      // Control callbacks
      onActionRequest: (actionId, action) => {
        console.log('[App] Action request:', actionId, action.kind);
        // Only show if control is enabled
        if (controlEnabled) {
          setPendingAction({ actionId, action });
          // Send ack that we're showing the modal
          wsClient.sendActionAck(actionId, 'awaiting_user');
        }
      },
    });

    setClient(wsClient);
    wsClient.connect(WS_URL);

    return () => {
      wsClient.disconnect();
    };
  }, []);

  // Handle server messages
  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'server.pairing.code': {
        const payload = (message as ServerPairingCode).payload;
        setPairingCode(payload.pairingCode);
        setPairingExpiresAt(payload.expiresAt);
        break;
      }

      case 'server.chat.message': {
        const payload = (message as ServerChatMessage).payload;
        const msg = payload.message;
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            role: msg.role,
            text: msg.text,
            timestamp: msg.createdAt,
          },
        ]);
        break;
      }

      case 'server.run.status': {
        setActiveRun((prev) => {
          if (!prev || prev.runId !== message.payload.runId) return prev;
          return { ...prev, status: message.payload.status };
        });
        break;
      }
    }
  }, []);

  // Handle sending a chat message
  const handleSendMessage = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: 'user',
          text,
          timestamp: Date.now(),
        },
      ]);
      client?.sendChat(text, activeRun?.runId);
    },
    [client, activeRun]
  );

  // Handle requesting a pairing code
  const handleRequestPairingCode = useCallback(() => {
    client?.requestPairingCode();
  }, [client]);

  // Handle approval decision
  const handleApprovalDecision = useCallback((decision: 'approved' | 'denied', comment?: string) => {
    if (!pendingApproval || !activeRun) return;
    client?.sendApprovalDecision(activeRun.runId, pendingApproval.approval.approvalId, decision, comment);
    setPendingApproval(null);
  }, [client, pendingApproval, activeRun]);

  // Handle cancel run
  const handleCancelRun = useCallback(() => {
    if (!activeRun) return;
    client?.sendRunCancel(activeRun.runId);
  }, [client, activeRun]);

  // Handle action approval
  const handleActionApprove = useCallback(async () => {
    if (!pendingAction || !client) return;
    
    const { actionId, action } = pendingAction;
    
    // Send approved ack
    client.sendActionAck(actionId, 'approved');
    
    // Execute the action
    const result = await executeAction(action);
    
    if (!result.ok) {
      setInputPermissionError(result.error?.message || 'Input injection failed');
    }
    
    // Send result
    client.sendActionResult(actionId, result.ok, result.error);
    
    setPendingAction(null);
  }, [pendingAction, client]);

  const handleActionDeny = useCallback(() => {
    if (!pendingAction || !client) return;
    
    const { actionId } = pendingAction;
    
    client.sendActionAck(actionId, 'denied');
    client.sendActionResult(actionId, false, { code: 'DENIED_BY_USER', message: 'User denied the action' });
    
    setPendingAction(null);
  }, [pendingAction, client]);

  const handleControlToggle = useCallback((enabled: boolean) => {
    setControlEnabled(enabled);
    if (!enabled) {
      setInputPermissionError(null);
    }
  }, []);

  // Format time remaining for pairing code
  const getTimeRemaining = (): string => {
    if (!pairingExpiresAt) return '';
    const remaining = Math.max(0, pairingExpiresAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', display: 'flex' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        <h1>AI Operator Desktop</h1>
        <p>Device ID: <code>{deviceId}</code></p>
        
        {/* Connection Status */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <StatusBadge status={status} />
          
          {status === 'disconnected' && (
            <button onClick={() => client?.connect(WS_URL)}>
              Reconnect
            </button>
          )}
        </div>

        {/* Pairing Section */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', maxWidth: '400px' }}>
          <h3 style={{ marginTop: 0 }}>Device Pairing</h3>
          
          {!pairingCode ? (
            <button
              onClick={handleRequestPairingCode}
              disabled={status !== 'connected'}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: status === 'connected' ? '#0070f3' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: status === 'connected' ? 'pointer' : 'not-allowed',
              }}
            >
              Request Pairing Code
            </button>
          ) : (
            <div>
              <div
                style={{
                  padding: '1rem',
                  background: '#f0f0f0',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                {pairingCode}
              </div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>
                Expires in: {getTimeRemaining()}
              </p>
              <button
                onClick={() => {
                  setPairingCode(null);
                  setPairingExpiresAt(null);
                }}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          
          {status !== 'connected' && (
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Connect to server to request pairing code
            </p>
          )}
        </div>

        {/* Screen Panel */}
        {client && <ScreenPanel wsClient={client} deviceId={deviceId} />}

        {/* Control Panel */}
        {client && (
          <ControlPanel 
            wsClient={client} 
            deviceId={deviceId} 
            enabled={controlEnabled}
            onToggle={handleControlToggle}
          />
        )}

        {/* Input Permission Error */}
        {inputPermissionError && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#92400e',
            }}
          >
            <strong>Permission Required:</strong> {inputPermissionError.includes('Accessibility') 
              ? 'Accessibility permission is needed for remote control. Enable it in System Settings > Privacy & Security > Accessibility for this app.'
              : inputPermissionError}
          </div>
        )}

        {/* Run Panel */}
        <div style={{ marginTop: '1.5rem' }}>
          <RunPanel 
            run={activeRun} 
            onCancel={handleCancelRun}
          />
        </div>

        <p style={{ marginTop: '2rem', color: '#666', maxWidth: '600px' }}>
          This window shows the AI Operator desktop interface. When a run is started from the web dashboard,
          it will appear above with live steps, logs, and approval requests.
        </p>
      </div>

      {/* Chat Overlay */}
      <ChatOverlay
        messages={messages}
        status={status}
        onSendMessage={handleSendMessage}
      />

      {/* Approval Modal */}
      {pendingApproval && (
        <ApprovalModal
          approval={pendingApproval.approval}
          onDecision={handleApprovalDecision}
        />
      )}

      {/* Action Approval Modal */}
      {pendingAction && (
        <ActionApprovalModal
          actionId={pendingAction.actionId}
          action={pendingAction.action}
          onApprove={handleActionApprove}
          onDeny={handleActionDeny}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connecting: '#f59e0b',
    connected: '#10b981',
    disconnected: '#6b7280',
    error: '#ef4444',
  };

  const labels: Record<ConnectionStatus, string> = {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        fontWeight: 500,
        color: colors[status],
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: colors[status],
          animation: status === 'connecting' ? 'pulse 1s infinite' : undefined,
        }}
      />
      {labels[status]}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
}

export default App;
