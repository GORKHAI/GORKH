import { useState, useRef, useEffect } from 'react';
import type { ConnectionStatus } from '../lib/wsClient.js';

interface ChatItem {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

interface ChatOverlayProps {
  messages: ChatItem[];
  status: ConnectionStatus;
  onSendMessage: (content: string) => void;
}

export function ChatOverlay({ messages, status, onSendMessage }: ChatOverlayProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };

  const statusColors: Record<ConnectionStatus, string> = {
    connecting: '#f59e0b',
    connected: '#10b981',
    disconnected: '#6b7280',
    error: '#ef4444',
  };

  const canSend = status === 'connected' && input.trim();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        height: '500px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fafafa',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '14px' }}>AI Operator</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: statusColors[status],
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusColors[status],
            }}
          />
          {statusLabels[status]}
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#999' }}>
            <p>No messages yet</p>
            <p style={{ fontSize: '12px' }}>
              {status === 'connected'
                ? 'Type a message to start'
                : 'Connect to server to chat'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={status === 'connected' ? 'Type a message...' : 'Connect to send...'}
          disabled={status !== 'connected'}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: status === 'connected' ? 'white' : '#f5f5f5',
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          style={{
            padding: '10px 16px',
            backgroundColor: canSend ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: canSend ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatItem }) {
  const isUser = message.role === 'user';
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: '12px',
        backgroundColor: isUser ? '#0070f3' : '#f0f0f0',
        color: isUser ? 'white' : '#333',
        fontSize: '14px',
        wordBreak: 'break-word',
      }}
    >
      {message.text}
    </div>
  );
}
