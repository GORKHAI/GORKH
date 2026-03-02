import type { RunWithSteps, RunStep } from '@ai-operator/shared';

interface RunPanelProps {
  run: RunWithSteps | null;
  onCancel: () => void;
}

export function RunPanel({ run, onCancel }: RunPanelProps) {
  if (!run) {
    return (
      <div
        style={{
          padding: '1.5rem',
          background: 'white',
          borderRadius: '8px',
          border: '1px dashed #ddd',
          textAlign: 'center',
          color: '#666',
        }}
      >
        <p style={{ margin: 0 }}>No active run</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
          Start a run from the web dashboard to see it here
        </p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    queued: '#f59e0b',
    running: '#3b82f6',
    waiting_for_user: '#8b5cf6',
    done: '#10b981',
    failed: '#ef4444',
    canceled: '#6b7280',
  };

  // Step status icons map (for future use)
  void {
    pending: '○',
    running: '◐',
    done: '✓',
    failed: '✗',
    blocked: '!',
  };

  const canCancel = run.status === 'queued' || run.status === 'running' || run.status === 'waiting_for_user';

  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Active Run</h3>
          <p
            style={{
              margin: '0.5rem 0 0',
              color: '#333',
              fontSize: '0.9375rem',
              fontWeight: 500,
            }}
          >
            {run.goal}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: `${statusColors[run.status]}20`,
              color: statusColors[run.status],
            }}
          >
            {run.status}
          </span>
          {canCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '4px 12px',
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

      {/* Steps */}
      <div style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#666' }}>Steps</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {run.steps.map((step, index) => (
            <StepRow key={step.stepId} step={step} index={index} />
          ))}
        </div>
      </div>

      {/* Logs */}
      <div style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#666' }}>Live Logs</h4>
        <LogViewer steps={run.steps} />
      </div>

      {run.reason && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: run.status === 'canceled' ? '#f3f4f6' : '#fee2e2',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: run.status === 'canceled' ? '#374151' : '#dc2626',
          }}
        >
          <strong>{run.status === 'canceled' ? 'Canceled' : 'Failed'}:</strong> {run.reason}
        </div>
      )}
    </div>
  );
}

function StepRow({ step, index }: { step: RunStep; index: number }) {
  const statusColors: Record<string, string> = {
    pending: '#9ca3af',
    running: '#3b82f6',
    done: '#10b981',
    failed: '#ef4444',
    blocked: '#f59e0b',
  };

  const statusIcons: Record<string, string> = {
    pending: '○',
    running: '◐',
    done: '✓',
    failed: '✗',
    blocked: '!',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: step.status === 'running' ? '#eff6ff' : 'transparent',
        borderRadius: '6px',
      }}
    >
      <span
        style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          color: statusColors[step.status],
          fontWeight: step.status === 'running' ? 600 : 400,
        }}
      >
        {statusIcons[step.status]}
      </span>
      <span style={{ flex: 1, fontSize: '0.875rem' }}>
        {index + 1}. {step.title}
      </span>
      {step.status !== 'pending' && step.status !== 'running' && (
        <span style={{ fontSize: '0.75rem', color: '#666' }}>
          {step.endedAt && step.startedAt
            ? `${((step.endedAt - step.startedAt) / 1000).toFixed(1)}s`
            : ''}
        </span>
      )}
    </div>
  );
}

function LogViewer({ steps }: { steps: RunStep[] }) {
  // Collect all logs from all steps
  const allLogs: Array<{ stepId: string; stepTitle: string; log: { line: string; level: string; at: number } }> = [];
  
  for (const step of steps) {
    for (const log of step.logs) {
      allLogs.push({ stepId: step.stepId, stepTitle: step.title, log });
    }
  }
  
  // Sort by timestamp
  allLogs.sort((a, b) => a.log.at - b.log.at);
  
  // Keep only last 100
  const recentLogs = allLogs.slice(-100);

  if (recentLogs.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#9ca3af',
          fontFamily: 'monospace',
        }}
      >
        No logs yet...
      </div>
    );
  }

  const levelColors: Record<string, string> = {
    info: '#374151',
    warn: '#d97706',
    error: '#dc2626',
  };

  return (
    <div
      style={{
        maxHeight: '200px',
        overflow: 'auto',
        padding: '0.75rem',
        background: '#f9fafb',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
      }}
    >
      {recentLogs.map((entry, i) => (
        <div key={i} style={{ marginBottom: '0.25rem' }}>
          <span style={{ color: '#9ca3af' }}>
            [{new Date(entry.log.at).toLocaleTimeString()}]
          </span>{' '}
          <span style={{ color: '#6b7280' }}>[{entry.stepTitle}]</span>{' '}
          <span style={{ color: levelColors[entry.log.level] || '#374151' }}>
            {entry.log.line}
          </span>
        </div>
      ))}
    </div>
  );
}
