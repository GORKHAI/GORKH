//! Task monitoring component for Advanced Agent

import { useState, useEffect, useRef } from 'react';
import type { AgentEvent, TaskPlan, PlanStep, ProviderType } from '../../lib/advancedAgent.js';
import { onAgentEvent, formatCost } from '../../lib/advancedAgent.js';

interface AgentTaskMonitorProps {
  taskId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type TaskStatus =
  | { type: 'planning' }
  | { type: 'executing'; currentStep: number; totalSteps: number }
  | { type: 'awaitingApproval'; stepId: string }
  | { type: 'awaitingUserInput'; question: string }
  | { type: 'completed' }
  | { type: 'failed'; reason: string }
  | { type: 'cancelled' };

interface TaskState {
  status: TaskStatus;
  plan?: TaskPlan;
  steps: PlanStep[];
  currentCost: number;
  providerUsed?: ProviderType;
  events: AgentEvent[];
}

export function AgentTaskMonitor({ taskId, onComplete, onCancel }: AgentTaskMonitorProps) {
  const [state, setState] = useState<TaskState>({
    status: { type: 'planning' },
    steps: [],
    currentCost: 0,
    events: [],
  });
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to events
    const setupListener = async () => {
      const unlisten = await onAgentEvent((event: AgentEvent) => {
        setState((prev) => {
          const newState = { ...prev, events: [...prev.events, event] };

          switch (event.eventType) {
            case 'plan_created':
              newState.plan = event.plan;
              newState.steps = event.plan.steps;
              newState.status = { type: 'executing', currentStep: 0, totalSteps: event.plan.steps.length };
              break;

            case 'step_started':
              newState.status = {
                type: 'executing',
                currentStep: event.stepNumber,
                totalSteps: newState.plan?.steps.length || 1,
              };
              break;

            case 'action_proposed':
              newState.status = { type: 'awaitingApproval', stepId: event.stepId };
              break;

            case 'action_approved':
              newState.status = { 
                type: 'executing', 
                currentStep: newState.status.type === 'executing' ? newState.status.currentStep : 0, 
                totalSteps: newState.plan?.steps.length || 1 
              };
              break;

            case 'step_completed':
              newState.steps = newState.steps.map((s) =>
                s.id === event.stepId ? { ...s, status: 'completed' as const } : s
              );
              break;

            case 'step_failed':
              newState.steps = newState.steps.map((s) =>
                s.id === event.stepId ? { ...s, status: 'failed' as const } : s
              );
              break;

            case 'provider_switched':
              newState.providerUsed = event.to;
              break;

            case 'cost_updated':
              newState.currentCost = event.totalCost;
              break;

            case 'task_completed':
              newState.status = { type: 'completed' };
              break;

            case 'task_failed':
              newState.status = { type: 'failed', reason: 'Task execution failed' };
              break;
          }

          return newState;
        });
      });
      unlistenRef.current = unlisten;
    };

    void setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [taskId]);

  // Auto-complete when task is done
  useEffect(() => {
    if (state.status.type === 'completed' || state.status.type === 'failed') {
      const timer = setTimeout(() => {
        if (state.status.type === 'completed') {
          onComplete();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.status, onComplete]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getStepIcon = (step: PlanStep) => {
    switch (step.stepType) {
      case 'ui_action':
        return '🖱️';
      case 'tool_call':
        return '🔧';
      case 'ask_user':
        return '👤';
      case 'verification':
        return '🔍';
      default:
        return '✨';
    }
  };

  const getStatusBadge = () => {
    const badgeStyles: Record<string, React.CSSProperties> = {
      base: {
        fontSize: '0.75rem',
        padding: '4px 8px',
        borderRadius: '9999px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      },
      planning: { backgroundColor: '#f3f4f6', color: '#374151' },
      executing: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
      awaiting: { backgroundColor: '#fef3c7', color: '#92400e' },
      completed: { backgroundColor: '#dcfce7', color: '#166534' },
      failed: { backgroundColor: '#fecaca', color: '#991b1b' },
    };

    switch (state.status.type) {
      case 'planning':
        return <span style={{ ...badgeStyles.base, ...badgeStyles.planning }}>⏳ Planning...</span>;
      case 'executing':
        return (
          <span style={{ ...badgeStyles.base, ...badgeStyles.executing }}>
            ▶ Step {state.status.currentStep + 1} of {state.status.totalSteps}
          </span>
        );
      case 'awaitingApproval':
        return (
          <span style={{ ...badgeStyles.base, ...badgeStyles.awaiting }}>
            ⏸️ Awaiting Approval
          </span>
        );
      case 'completed':
        return (
          <span style={{ ...badgeStyles.base, ...badgeStyles.completed }}>
            ✅ Completed
          </span>
        );
      case 'failed':
        return (
          <span style={{ ...badgeStyles.base, ...badgeStyles.failed }}>
            ❌ Failed
          </span>
        );
      default:
        return null;
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    title: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    closeButton: {
      padding: '4px 8px',
      fontSize: '0.875rem',
      backgroundColor: 'transparent',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    costBadge: {
      fontSize: '0.75rem',
      padding: '4px 8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '9999px',
      color: '#374151',
    },
    progressBar: {
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '9999px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3b82f6',
      transition: 'width 0.3s ease',
    },
    stepsContainer: {
      maxHeight: '300px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    stepCard: {
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
    stepCardRunning: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff',
    },
    stepCardCompleted: {
      borderColor: '#22c55e',
      backgroundColor: '#f0fdf4',
    },
    stepCardFailed: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
    },
    stepHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    stepIcon: {
      fontSize: '1rem',
    },
    stepTitle: {
      fontWeight: 500,
      fontSize: '0.875rem',
      flex: 1,
    },
    stepDescription: {
      fontSize: '0.75rem',
      color: '#6b7280',
      marginTop: '4px',
      marginLeft: '28px',
    },
    logContainer: {
      maxHeight: '120px',
      overflowY: 'auto',
      backgroundColor: '#f3f4f6',
      borderRadius: '6px',
      padding: '8px',
    },
    logItem: {
      fontSize: '0.75rem',
      color: '#6b7280',
      fontFamily: 'monospace',
    },
    logEvent: {
      color: '#3b82f6',
    },
    approvalBox: {
      padding: '16px',
      backgroundColor: '#fffbeb',
      border: '1px solid #fcd34d',
      borderRadius: '8px',
    },
    approvalTitle: {
      fontWeight: 600,
      color: '#92400e',
      marginBottom: '8px',
    },
    approvalText: {
      fontSize: '0.875rem',
      color: '#78350f',
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
      marginTop: '8px',
    },
    button: {
      padding: '8px 16px',
      fontSize: '0.875rem',
      borderRadius: '6px',
      border: '1px solid #d1d5db',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
  };

  const getStepCardStyle = (step: PlanStep) => {
    if (step.status === 'running') return { ...styles.stepCard, ...styles.stepCardRunning };
    if (step.status === 'completed') return { ...styles.stepCard, ...styles.stepCardCompleted };
    if (step.status === 'failed') return { ...styles.stepCard, ...styles.stepCardFailed };
    return styles.stepCard;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>Task Progress</span>
          {getStatusBadge()}
        </div>
        <div style={styles.headerRight}>
          {state.currentCost > 0 && (
            <span style={styles.costBadge}>💰 {formatCost(state.currentCost)}</span>
          )}
          <button style={styles.closeButton} onClick={onCancel}>
            ✕
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {state.plan && (
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${
                (state.steps.filter((s) => s.status === 'completed').length /
                  state.steps.length) *
                100
              }%`,
            }}
          />
        </div>
      )}

      {/* Steps */}
      <div style={styles.stepsContainer}>
        {state.steps.map((step) => (
          <div
            key={step.id}
            style={getStepCardStyle(step)}
            onClick={() => toggleStep(step.id)}
          >
            <div style={styles.stepHeader}>
              <span style={styles.stepIcon}>{getStepIcon(step)}</span>
              <span style={styles.stepTitle}>{step.title}</span>
              {step.status === 'completed' && <span>✅</span>}
              {step.status === 'failed' && <span>❌</span>}
              {expandedSteps.has(step.id) ? <span>▲</span> : <span>▼</span>}
            </div>
            <p style={styles.stepDescription}>{step.description}</p>
          </div>
        ))}

        {state.steps.length === 0 && state.status.type === 'planning' && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
            <p style={{ fontSize: '0.875rem' }}>Creating task plan...</p>
          </div>
        )}
      </div>

      {/* Event Log */}
      {state.events.length > 0 && (
        <div>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
            Activity Log
          </label>
          <div style={styles.logContainer}>
            {state.events.slice(-20).map((event, i) => (
              <div key={i} style={styles.logItem}>
                <span style={styles.logEvent}>{event.eventType}</span>
                {event.eventType === 'step_started' && 'step' in event && event.step && (
                  <span style={{ marginLeft: '8px' }}>{event.step.title}</span>
                )}
                {event.eventType === 'action_proposed' && 'actionType' in event && (
                  <span style={{ marginLeft: '8px' }}>{event.actionType}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awaiting Approval State */}
      {state.status.type === 'awaitingApproval' && (
        <div style={styles.approvalBox}>
          <div style={styles.approvalTitle}>⏸️ Action Pending Approval</div>
          <p style={styles.approvalText}>
            The AI is proposing an action. Please review and approve or deny in the main approval panel.
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <button style={styles.button} onClick={onCancel}>
          {state.status.type === 'completed' || state.status.type === 'failed'
            ? 'Close'
            : 'Cancel Task'}
        </button>
      </div>
    </div>
  );
}
