'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

interface Device {
  deviceId: string;
  deviceName?: string;
  platform: string;
  connected: boolean;
  paired: boolean;
  pairingCode?: string;
  pairingExpiresAt?: number;
  lastSeenAt: number;
  screenStreamState?: {
    enabled: boolean;
    fps: 1 | 2;
    displayId?: string;
  };
  controlState?: {
    enabled: boolean;
    updatedAt: number;
    requestedBy?: string;
  };
}

interface LogLine {
  line: string;
  level: 'info' | 'warn' | 'error';
  at: number;
}

interface RunStep {
  stepId: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'blocked';
  startedAt?: number;
  endedAt?: number;
  logs: LogLine[];
}

interface Run {
  runId: string;
  deviceId: string;
  goal: string;
  status: 'queued' | 'running' | 'waiting_for_user' | 'done' | 'failed' | 'canceled';
  createdAt: number;
  updatedAt: number;
  reason?: string;
  steps: RunStep[];
}

interface ScreenFrameMeta {
  frameId: string;
  width: number;
  height: number;
  mime: 'image/png';
  at: number;
  byteLength: number;
}

interface DeviceAction {
  actionId: string;
  deviceId: string;
  action: {
    kind: 'click' | 'double_click' | 'scroll' | 'type' | 'hotkey';
    [key: string]: unknown;
  };
  status: 'requested' | 'awaiting_user' | 'approved' | 'denied' | 'executed' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: { code: string; message: string };
}

interface SSEEvent {
  type: 'connected' | 'device_update' | 'run_update' | 'step_update' | 'log_line' | 'screen_update' | 'action_update';
  run?: Run;
  step?: RunStep;
  runId?: string;
  stepId?: string;
  log?: LogLine;
  clientId?: string;
  deviceId?: string;
  meta?: ScreenFrameMeta;
  action?: DeviceAction;
}

const hotkeyBtnStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  background: '#f9fafb',
  cursor: 'pointer',
  fontSize: '0.75rem',
};

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [pairingInputs, setPairingInputs] = useState<Record<string, string>>({});
  const [pairingLoading, setPairingLoading] = useState<Record<string, boolean>>({});
  const [newRunGoal, setNewRunGoal] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Screen preview state
  const [previewDeviceId, setPreviewDeviceId] = useState<string | null>(null);
  const [screenMeta, setScreenMeta] = useState<ScreenFrameMeta | null>(null);
  const [screenTimestamp, setScreenTimestamp] = useState<number>(0);
  
  // Control state
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [typeText, setTypeText] = useState('');

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setError(null);
      
      const devicesRes = await fetch(`${API_BASE}/devices`);
      if (!devicesRes.ok) throw new Error('Failed to fetch devices');
      const devicesData = await devicesRes.json();
      setDevices(devicesData.devices || []);

      const runsRes = await fetch(`${API_BASE}/runs`);
      if (!runsRes.ok) throw new Error('Failed to fetch runs');
      const runsData = await runsRes.json();
      setRuns(runsData.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup SSE connection
  useEffect(() => {
    fetchInitialData();

    const setupSSE = () => {
      const es = new EventSource(`${API_BASE}/events`);

      es.onopen = () => {
        console.log('[SSE] Connected');
        setSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          console.log('[SSE] Received:', data.type);

          switch (data.type) {
            case 'run_update':
              if (data.run) {
                const updatedRun = data.run;
                setRuns((prev) => {
                  const existing = prev.find((r) => r.runId === updatedRun.runId);
                  if (existing) {
                    return prev.map((r) => (r.runId === updatedRun.runId ? updatedRun : r));
                  }
                  return [...prev, updatedRun];
                });
              }
              break;

            case 'step_update':
              if (data.runId && data.step) {
                setRuns((prev) =>
                  prev.map((r) => {
                    if (r.runId === data.runId) {
                      return {
                        ...r,
                        steps: r.steps.map((s) =>
                          s.stepId === data.step!.stepId ? data.step! : s
                        ),
                      };
                    }
                    return r;
                  })
                );
              }
              break;

            case 'screen_update':
              if (data.deviceId && data.meta) {
                setScreenMeta(data.meta);
                setScreenTimestamp(Date.now());
              }
              break;

            case 'action_update':
              if (data.action) {
                const updatedAction = data.action;
                setActions((prev) => {
                  const existing = prev.find((a) => a.actionId === updatedAction.actionId);
                  if (existing) {
                    return prev.map((a) => (a.actionId === updatedAction.actionId ? updatedAction : a));
                  }
                  return [updatedAction, ...prev].slice(0, 20);
                });
              }
              break;
          }
        } catch (err) {
          console.error('[SSE] Failed to parse message:', err);
        }
      };

      es.onerror = (err) => {
        console.error('[SSE] Error:', err);
        setSseConnected(false);
        setTimeout(() => {
          if (es.readyState === EventSource.CLOSED) {
            setupSSE();
          }
        }, 3000);
      };

      return es;
    };

    const es = setupSSE();

    // Poll devices every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/devices`);
        if (res.ok) {
          const data = await res.json();
          setDevices(data.devices || []);
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, [fetchInitialData]);

  const handlePairSubmit = async (deviceId: string) => {
    const code = pairingInputs[deviceId]?.trim().toUpperCase();
    if (!code) return;

    setPairingLoading((prev) => ({ ...prev, [deviceId]: true }));
    
    try {
      const res = await fetch(`${API_BASE}/devices/${deviceId}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Pairing failed');
      }

      setPairingInputs((prev) => ({ ...prev, [deviceId]: '' }));
      
      const devicesRes = await fetch(`${API_BASE}/devices`);
      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setPairingLoading((prev) => ({ ...prev, [deviceId]: false }));
    }
  };

  const handleCreateRun = async () => {
    if (!selectedDeviceId || !newRunGoal.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId, goal: newRunGoal }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create run');
      }

      setNewRunGoal('');
      
      const runsRes = await fetch(`${API_BASE}/runs`);
      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create run');
    }
  };

  const handleCancelRun = async (runId: string) => {
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Canceled from dashboard' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel run');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel run');
    }
  };

  // Send control action
  const sendAction = async (action: DeviceAction['action']) => {
    if (!previewDeviceId) return;
    
    try {
      const res = await fetch(`${API_BASE}/devices/${previewDeviceId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send action');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send action');
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    sendAction({ kind: 'click', x, y, button: 'left' });
  };

  const handleTypeSubmit = () => {
    if (!typeText.trim()) return;
    sendAction({ kind: 'type', text: typeText });
    setTypeText('');
  };

  const handleHotkey = (key: string, modifiers?: string[]) => {
    sendAction({ kind: 'hotkey', key, modifiers });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    sendAction({ kind: 'scroll', dx: e.deltaX, dy: e.deltaY });
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTimeRemaining = (expiresAt: number): string => {
    const remaining = Math.max(0, expiresAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const pairedDevices = devices.filter((d) => d.paired);
  const previewDevice = previewDeviceId ? devices.find((d) => d.deviceId === previewDeviceId) : null;

  const getCompletedStepsCount = (run: Run): number => {
    return run.steps.filter((s) => s.status === 'done').length;
  };

  if (loading) {
    return (
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to Home
        </Link>
        <p style={{ marginTop: '2rem' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
        ← Back to Home
      </Link>

      <h1 style={{ marginTop: '1rem' }}>Dashboard</h1>

      {/* Connection Status */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <StatusBadge
          label={sseConnected ? 'Live Updates' : 'Reconnecting...'}
          color={sseConnected ? '#10b981' : '#f59e0b'}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '1rem',
          }}
        >
          Error: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: previewDeviceId ? '1fr 400px' : '1fr', gap: '2rem' }}>
        <div>
          {/* Devices Section */}
          <section style={{ marginTop: '2rem' }}>
            <h2>Devices</h2>
            
            {devices.length === 0 ? (
              <p style={{ color: '#666' }}>No devices connected.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {devices.map((device) => (
                  <div
                    key={device.deviceId}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>
                          {device.deviceName || `Device-${device.deviceId.slice(0, 8)}`}
                        </h3>
                        <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.875rem' }}>
                          ID: <code>{device.deviceId}</code>
                        </p>
                        <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.875rem' }}>
                          Platform: {device.platform} • Last seen: {formatTime(device.lastSeenAt)}
                        </p>
                        {device.screenStreamState?.enabled && (
                          <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: '#10b981' }}>
                            📹 Screen sharing active ({device.screenStreamState.fps} FPS)
                          </p>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <StatusBadge
                            label={device.connected ? 'Connected' : 'Offline'}
                            color={device.connected ? '#10b981' : '#6b7280'}
                          />
                          <StatusBadge
                            label={device.paired ? 'Paired' : 'Unpaired'}
                            color={device.paired ? '#3b82f6' : '#f59e0b'}
                          />
                        </div>
                        {device.paired && device.screenStreamState?.enabled && (
                          <button
                            onClick={() => setPreviewDeviceId(device.deviceId)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: previewDeviceId === device.deviceId ? '#10b981' : '#f3f4f6',
                              color: previewDeviceId === device.deviceId ? 'white' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {previewDeviceId === device.deviceId ? 'Viewing' : 'View Screen'}
                          </button>
                        )}
                      </div>
                    </div>

                    {!device.paired && device.pairingCode && device.pairingExpiresAt && (
                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '0.75rem',
                          background: '#fef3c7',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <strong>Pairing Code:</strong> {device.pairingCode}
                        <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                          (expires in {getTimeRemaining(device.pairingExpiresAt)})
                        </span>
                      </div>
                    )}

                    {!device.paired && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Enter pairing code"
                          value={pairingInputs[device.deviceId] || ''}
                          onChange={(e) =>
                            setPairingInputs((prev) => ({
                              ...prev,
                              [device.deviceId]: e.target.value,
                            }))
                          }
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '0.875rem',
                            textTransform: 'uppercase',
                          }}
                        />
                        <button
                          onClick={() => handlePairSubmit(device.deviceId)}
                          disabled={pairingLoading[device.deviceId] || !pairingInputs[device.deviceId]?.trim()}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {pairingLoading[device.deviceId] ? 'Pairing...' : 'Pair'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Create Run Section */}
          {pairedDevices.length > 0 && (
            <section style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <h2 style={{ marginTop: 0 }}>Create Run</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Device
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">Select device</option>
                    {pairedDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.deviceName || d.deviceId.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Goal
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Open Chrome and search for..."
                    value={newRunGoal}
                    onChange={(e) => setNewRunGoal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <button
                  onClick={handleCreateRun}
                  disabled={!selectedDeviceId || !newRunGoal.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedDeviceId && newRunGoal.trim() ? '#10b981' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedDeviceId && newRunGoal.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem',
                  }}
                >
                  Create Run
                </button>
              </div>
            </section>
          )}

          {/* Runs Section */}
          <section style={{ marginTop: '2rem' }}>
            <h2>Runs ({runs.length})</h2>
            
            {runs.length === 0 ? (
              <p style={{ color: '#666' }}>No runs yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {runs.slice().reverse().map((run) => (
                  <div
                    key={run.runId}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 500 }}>{run.goal}</p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                          ID: {run.runId.slice(0, 8)}... • Device: {run.deviceId.slice(0, 8)}... • 
                          Created: {formatTime(run.createdAt)}
                        </p>
                        {run.steps.length > 0 && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                            Progress: {getCompletedStepsCount(run)}/{run.steps.length} steps
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <StatusBadge
                          label={run.status}
                          color={
                            run.status === 'done'
                              ? '#10b981'
                              : run.status === 'failed'
                              ? '#ef4444'
                              : run.status === 'canceled'
                              ? '#6b7280'
                              : run.status === 'running'
                              ? '#3b82f6'
                              : run.status === 'waiting_for_user'
                              ? '#8b5cf6'
                              : '#f59e0b'
                          }
                        />
                        {(run.status === 'queued' || run.status === 'running' || run.status === 'waiting_for_user') && (
                          <button
                            onClick={() => handleCancelRun(run.runId)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {run.steps.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div
                          style={{
                            height: '4px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              backgroundColor:
                                run.status === 'done'
                                  ? '#10b981'
                                  : run.status === 'failed' || run.status === 'canceled'
                                  ? '#ef4444'
                                  : '#3b82f6',
                              width: `${(getCompletedStepsCount(run) / run.steps.length) * 100}%`,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {run.reason && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem',
                          backgroundColor: run.status === 'canceled' ? '#f3f4f6' : '#fee2e2',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: run.status === 'canceled' ? '#374151' : '#dc2626',
                        }}
                      >
                        {run.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Screen Preview Panel */}
        {previewDeviceId && (
          <div
            style={{
              position: 'sticky',
              top: '2rem',
              height: 'fit-content',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Live Preview</h3>
              <button
                onClick={() => setPreviewDeviceId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>

            {previewDevice?.screenStreamState?.enabled ? (
              <div>
                <img
                  src={`${API_BASE}/devices/${previewDeviceId}/screen.png?ts=${screenTimestamp}`}
                  alt="Screen preview"
                  onClick={handleImageClick}
                  onWheel={handleWheel}
                  title="Click to send action, scroll to scroll"
                  style={{
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0',
                    cursor: previewDevice?.controlState?.enabled ? 'crosshair' : 'not-allowed',
                  }}
                />
                
                {/* Control Panel */}
                {previewDevice?.controlState?.enabled ? (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #86efac' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', marginBottom: '0.75rem' }}>
                      🎮 Remote Control Active
                    </div>
                    
                    {/* Type Input */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        value={typeText}
                        onChange={(e) => setTypeText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTypeSubmit();
                          }
                        }}
                        placeholder="Type text..."
                        maxLength={500}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                        }}
                      />
                      <button
                        onClick={handleTypeSubmit}
                        disabled={!typeText.trim()}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: typeText.trim() ? '#16a34a' : '#9ca3af',
                          color: 'white',
                          cursor: typeText.trim() ? 'pointer' : 'not-allowed',
                          fontSize: '0.875rem',
                        }}
                      >
                        Type
                      </button>
                    </div>

                    {/* Hotkey Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button onClick={() => handleHotkey('return')} style={hotkeyBtnStyle}>Enter</button>
                      <button onClick={() => handleHotkey('tab')} style={hotkeyBtnStyle}>Tab</button>
                      <button onClick={() => handleHotkey('escape')} style={hotkeyBtnStyle}>Esc</button>
                      <button onClick={() => handleHotkey('up')} style={hotkeyBtnStyle}>↑</button>
                      <button onClick={() => handleHotkey('down')} style={hotkeyBtnStyle}>↓</button>
                      <button onClick={() => handleHotkey('left')} style={hotkeyBtnStyle}>←</button>
                      <button onClick={() => handleHotkey('right')} style={hotkeyBtnStyle}>→</button>
                    </div>

                    {/* Actions Log */}
                    {actions.length > 0 && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                        <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>Recent Actions:</div>
                        <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                          {actions.slice(-5).map((a) => (
                            <div key={a.actionId} style={{ display: 'flex', gap: '0.5rem', color: '#374151' }}>
                              <span style={{ textTransform: 'capitalize' }}>{a.action.kind}</span>
                              <span style={{ color: '#9ca3af' }}>→</span>
                              <span style={{ 
                                color: a.status === 'executed' ? '#16a34a' : 
                                       a.status === 'failed' ? '#dc2626' : 
                                       a.status === 'denied' ? '#7f1d1d' : '#d97706'
                              }}>
                                {a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '4px', border: '1px solid #fcd34d', fontSize: '0.875rem', color: '#92400e' }}>
                    🔒 Remote control is disabled. Ask user to enable &quot;Allow Control&quot; on the desktop app.
                  </div>
                )}
                
                {screenMeta && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#666' }}>
                    <div>Resolution: {screenMeta.width}×{screenMeta.height}</div>
                    <div>Size: {(screenMeta.byteLength / 1024).toFixed(1)} KB</div>
                    <div>Updated: {formatTime(screenMeta.at)}</div>
                  </div>
                )}

                <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                  Updates in real-time via SSE
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f9fafb',
                  borderRadius: '4px',
                  color: '#6b7280',
                }}
              >
                <p>Screen preview is not enabled.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Ask the user to enable "Share Screen Preview" in the desktop overlay.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: `${color}20`,
        color,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}
