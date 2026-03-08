# Frontend Integration for Qwen Agent

## React Components

### AgentTaskPanel.tsx

```tsx
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface AgentTask {
  taskId: string;
  goal: string;
  status: 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps?: number;
  currentAction?: string;
  screenshot?: string;
  message?: string;
}

interface ApprovalRequest {
  taskId: string;
  actionId: string;
  action: {
    type: string;
    params: Record<string, unknown>;
  };
  reason: string;
  screenshot: string;
}

export function AgentTaskPanel() {
  const [task, setTask] = useState<AgentTask | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [autonomy, setAutonomy] = useState<'strict' | 'balanced' | 'full'>('balanced');
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [history, setHistory] = useState<AgentTask[]>([]);

  useEffect(() => {
    // Listen for agent progress updates
    const unlistenProgress = listen<AgentTask>('agent:progress', (event) => {
      setTask(event.payload);
    });

    // Listen for approval requests
    const unlistenApproval = listen<ApprovalRequest>('agent:approval-request', (event) => {
      setPendingApproval(event.payload);
    });

    return () => {
      unlistenProgress.then(f => f());
      unlistenApproval.then(f => f());
    };
  }, []);

  const startTask = useCallback(async () => {
    if (!goalInput.trim()) return;
    
    try {
      const taskId = await invoke<string>('start_agent_task', {
        goal: goalInput,
        autonomy,
      });
      
      setTask({
        taskId,
        goal: goalInput,
        status: 'planning',
      });
      setGoalInput('');
    } catch (err) {
      console.error('Failed to start task:', err);
      alert('Failed to start task: ' + err);
    }
  }, [goalInput, autonomy]);

  const handleApproval = useCallback(async (approved: boolean) => {
    if (!pendingApproval) return;
    
    try {
      await invoke('approve_agent_action', { approved });
      setPendingApproval(null);
    } catch (err) {
      console.error('Failed to respond to approval:', err);
    }
  }, [pendingApproval]);

  const stopTask = useCallback(async () => {
    try {
      await invoke('stop_agent_task');
    } catch (err) {
      console.error('Failed to stop task:', err);
    }
  }, []);

  return (
    <div style={{ padding: '1rem', maxWidth: '800px' }}>
      <h2>AI Agent</h2>
      
      {/* Task Input */}
      {!task && (
        <div style={{ marginBottom: '1rem' }}>
          <textarea
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Describe what you want the AI to do...&#10;Example: Open Photoshop, create a new 1920x1080 document, add a gradient background, and save it as wallpaper.jpg"
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
          
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={autonomy}
              onChange={(e) => setAutonomy(e.target.value as any)}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="strict">Strict (approve every action)</option>
              <option value="balanced">Balanced (approve sensitive actions)</option>
              <option value="full">Full Autonomy</option>
            </select>
            
            <button
              onClick={startTask}
              disabled={!goalInput.trim()}
              style={{
                padding: '0.5rem 1.5rem',
                background: goalInput.trim() ? '#0070f3' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: goalInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Start Task
            </button>
          </div>
        </div>
      )}

      {/* Active Task */}
      {task && (
        <div style={{ 
          padding: '1rem', 
          background: '#f9fafb', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{task.goal}</h3>
            <button 
              onClick={stopTask}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Stop
            </button>
          </div>

          {/* Progress */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ 
              padding: '0.5rem 0.75rem',
              background: getStatusColor(task.status),
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: '0.875rem',
            }}>
              {task.status.toUpperCase()}
            </div>
            
            {task.currentStep && task.totalSteps && (
              <div style={{ marginTop: '0.5rem' }}>
                Step {task.currentStep} of {task.totalSteps}
                <div style={{ 
                  width: '100%', 
                  height: '4px', 
                  background: '#e5e7eb',
                  borderRadius: '2px',
                  marginTop: '0.25rem',
                }}>
                  <div style={{
                    width: `${(task.currentStep / task.totalSteps) * 100}%`,
                    height: '100%',
                    background: '#0070f3',
                    borderRadius: '2px',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )}

            {task.currentAction && (
              <p style={{ marginTop: '0.5rem', color: '#666' }}>
                Current action: {task.currentAction}
              </p>
            )}
          </div>

          {/* Live Screenshot */}
          {task.screenshot && (
            <div style={{ marginTop: '1rem' }}>
              <img 
                src={`data:image/png;base64,${task.screenshot}`}
                alt="Current screen"
                style={{
                  maxWidth: '100%',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Approval Modal */}
      {pendingApproval && (
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
            maxWidth: '600px',
            width: '90%',
          }}>
            <h3 style={{ marginTop: 0 }}>Action Approval Required</h3>
            
            <div style={{ 
              padding: '0.75rem',
              background: '#fef3c7',
              borderRadius: '6px',
              marginBottom: '1rem',
            }}>
              <strong>Action:</strong> {pendingApproval.action.type}
              <pre style={{ margin: '0.5rem 0 0', fontSize: '0.75rem' }}>
                {JSON.stringify(pendingApproval.action.params, null, 2)}
              </pre>
            </div>

            <p style={{ color: '#666' }}>{pendingApproval.reason}</p>

            {pendingApproval.screenshot && (
              <img 
                src={`data:image/png;base64,${pendingApproval.screenshot}`}
                alt="Screen before action"
                style={{
                  maxWidth: '100%',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleApproval(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                }}
              >
                Deny
              </button>
              <button
                onClick={() => handleApproval(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'planning': return '#dbeafe'; // blue
    case 'executing': return '#fef3c7'; // yellow
    case 'awaiting_approval': return '#fce7f3'; // pink
    case 'completed': return '#d1fae5'; // green
    case 'failed': return '#fee2e2'; // red
    default: return '#f3f4f6';
  }
}
```

### AgentWorkflow.tsx (Updated)

```tsx
import { useState } from 'react';
import { AgentTaskPanel } from './AgentTaskPanel';

export function AgentWorkflow() {
  const [activeTab, setActiveTab] = useState<'manual' | 'agent'>('agent');

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'manual' ? '#0070f3' : 'transparent',
            color: activeTab === 'manual' ? 'white' : '#333',
            border: '1px solid #0070f3',
            borderRadius: '4px',
          }}
        >
          Manual Control
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'agent' ? '#0070f3' : 'transparent',
            color: activeTab === 'agent' ? 'white' : '#333',
            border: '1px solid #0070f3',
            borderRadius: '4px',
          }}
        >
          AI Agent
        </button>
      </div>

      {activeTab === 'manual' ? <ManualControlPanel /> : <AgentTaskPanel />}
    </div>
  );
}
```

## WebSocket Integration

Update the WsClient to handle agent messages:

```typescript
// lib/wsClient.ts (additions)

interface AgentCallbacks {
  onAgentProgress?: (progress: AgentProgress) => void;
  onAgentApprovalRequest?: (request: ApprovalRequest) => void;
  onAgentComplete?: (result: TaskResult) => void;
}

export class WsClient {
  // ... existing code ...
  private agentCallbacks: AgentCallbacks;

  constructor(config: WsClientConfig & { agentCallbacks?: AgentCallbacks }) {
    // ... existing ...
    this.agentCallbacks = config.agentCallbacks || {};
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      // ... existing cases ...
      
      case 'server.agent.progress':
        this.agentCallbacks.onAgentProgress?.(message.payload);
        break;
        
      case 'server.agent.approval_request':
        this.agentCallbacks.onAgentApprovalRequest?.(message.payload);
        break;
        
      case 'server.agent.complete':
        this.agentCallbacks.onAgentComplete?.(message.payload);
        break;
    }
  }

  // Send agent approval response
  sendAgentApproval(taskId: string, actionId: string, approved: boolean) {
    this.send({
      type: 'device.agent.approval_response',
      payload: { taskId, actionId, approved },
    });
  }
}
```

## Dashboard Integration

Add agent task creation to the web dashboard:

```tsx
// In dashboard page, add to Create Run section:

const [selectedMode, setSelectedMode] = useState<'manual' | 'ai_assist' | 'agent'>('manual');

// In the mode selector:
<select
  value={selectedMode}
  onChange={(e) => setSelectedMode(e.target.value as any)}
>
  <option value="manual">Manual</option>
  <option value="ai_assist">AI Assist (Step by Step)</option>
  <option value="agent">AI Agent (Autonomous)</option>
</select>

// When creating run:
const handleCreateRun = async () => {
  if (selectedMode === 'agent') {
    // Use new agent protocol
    const res = await apiFetch('/runs/agent', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: selectedDeviceId, 
        goal: newRunGoal,
        autonomy: 'balanced',
      }),
    });
  } else {
    // Existing run creation
  }
};
```

## CSS Styles

```css
/* Agent panel styles */
.agent-panel {
  font-family: system-ui, -apple-system, sans-serif;
}

.agent-task-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.2s;
}

.agent-task-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.agent-screenshot {
  border-radius: 8px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.agent-approval-modal {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

This frontend integration provides a complete UI for the autonomous agent with real-time updates, approval workflows, and visual feedback.
