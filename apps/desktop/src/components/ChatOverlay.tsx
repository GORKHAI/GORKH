import { useState, useRef, useEffect } from 'react';
import type { ConnectionStatus } from '../lib/wsClient.js';
import { getEmptyStateMessage, FREE_AI_ENABLED, isLlmProvider } from '../lib/llmConfig.js';
import { BrandWordmark } from './BrandWordmark.js';

interface ChatItem {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

interface PendingTaskConfirmation {
  goal: string;
  summary: string;
  prompt: string;
}

interface FreeTierUsage {
  remaining_today: number;
  used_today: number;
  reset_at: string;
  daily_limit: number;
}

interface ChatOverlayProps {
  messages: ChatItem[];
  status: ConnectionStatus;
  onSendMessage: (content: string) => void;
  busy?: boolean;
  assistantStatusLabel?: string | null;
  pendingTaskConfirmation?: PendingTaskConfirmation | null;
  pendingTaskConfirmationBusy?: boolean;
  onConfirmPendingTask?: () => void;
  onCancelPendingTask?: () => void;
  freeTierUsage?: FreeTierUsage | null;
  provider?: string;
  providerConfigured?: boolean;
  onOpenSettings?: () => void;
}

export function ChatOverlay({
  messages,
  status,
  onSendMessage,
  busy = false,
  assistantStatusLabel = null,
  pendingTaskConfirmation = null,
  pendingTaskConfirmationBusy = false,
  onConfirmPendingTask,
  onCancelPendingTask,
  freeTierUsage = null,
  provider = '',
  providerConfigured = false,
  onOpenSettings,
}: ChatOverlayProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingTaskConfirmation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isOnline = status === 'connected';
  const emptyMessage = providerConfigured
    ? undefined
    : getEmptyStateMessage(isLlmProvider(provider) ? provider : 'gorkh_free', FREE_AI_ENABLED);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: 'rgba(255,255,255,0.72)',
        borderRadius: '22px',
        border: '1px solid rgba(148,163,184,0.22)',
        overflow: 'hidden',
      }}
    >
      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <BrandWordmark width={160} />
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', maxWidth: '320px', lineHeight: 1.5 }}>
              {emptyMessage || 'Ask me to automate tasks, control apps, or help with files.'}
            </p>
            {!providerConfigured && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#334155',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Open Settings
              </button>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '0.75rem 1rem',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? '#0f172a' : '#f1f5f9',
                color: msg.role === 'user' ? 'white' : '#0f172a',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '18px 18px 18px 4px',
                background: '#f1f5f9',
                fontSize: '0.875rem',
                color: '#64748b',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#94a3b8',
                    animation: 'pulse 1.4s infinite',
                  }}
                />
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#94a3b8',
                    animation: 'pulse 1.4s infinite 0.2s',
                  }}
                />
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#94a3b8',
                    animation: 'pulse 1.4s infinite 0.4s',
                  }}
                />
              </span>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 0.4; transform: scale(0.8); }
                  50% { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: '0.5rem 1.25rem',
          borderTop: '1px solid rgba(148,163,184,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#ef4444',
            }}
          />
          {isOnline ? 'Connected' : 'Disconnected'}
        </div>
        {assistantStatusLabel && (
          <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>{assistantStatusLabel}</div>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '0.75rem 1.25rem 1.25rem',
          borderTop: '1px solid rgba(148,163,184,0.15)',
        }}
      >
        {/* Inline banners */}
        <div style={{ marginBottom: '0.75rem' }}>
          {provider === 'gorkh_free' && freeTierUsage && freeTierUsage.remaining_today === 0 && (
            <div
              style={{
                width: '100%',
                marginBottom: '0.9rem',
                padding: '0.95rem 1rem',
                borderRadius: '14px',
                background: '#fff1f2',
                border: '1px solid #fda4af',
                color: '#9f1239',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Daily limit reached</div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                You have used all {freeTierUsage.daily_limit} free tasks for today. Your limit resets at{' '}
                {new Date(freeTierUsage.reset_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#be123c' }}>
                Want more? Open Settings and add your own API key for unlimited tasks.
              </div>
            </div>
          )}
          {pendingTaskConfirmation && (
            <div
              style={{
                width: '100%',
                marginBottom: '0.9rem',
                padding: '0.95rem 1rem',
                borderRadius: '14px',
                background: '#fff7ed',
                border: '1px solid #fdba74',
                color: '#9a3412',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Confirm task</div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {pendingTaskConfirmation.summary}
              </div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {pendingTaskConfirmation.prompt}
              </div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#b45309' }}>
                GORKH will wait for your explicit confirmation before starting. You can also send a new message if I misunderstood.
              </div>
              <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onCancelPendingTask}
                  disabled={pendingTaskConfirmationBusy}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #bfdbfe',
                    background: 'white',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmPendingTask}
                  disabled={pendingTaskConfirmationBusy}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #0f172a',
                    background: '#0f172a',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {pendingTaskConfirmationBusy ? 'Starting…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? 'Type a message…' : 'Waiting for connection…'}
            disabled={!isOnline || busy}
            rows={1}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '14px',
              border: '1px solid rgba(148,163,184,0.3)',
              background: 'rgba(255,255,255,0.85)',
              fontSize: '0.875rem',
              resize: 'none',
              outline: 'none',
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />
          <button
            type="submit"
            disabled={!isOnline || busy || !input.trim()}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '14px',
              border: 'none',
              background: !isOnline || busy || !input.trim() ? '#cbd5e1' : '#0f172a',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: !isOnline || busy || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
