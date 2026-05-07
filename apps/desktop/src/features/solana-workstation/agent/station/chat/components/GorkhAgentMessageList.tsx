import { useEffect, useRef } from 'react';
import type {
  GorkhAgentChatMessage,
  GorkhAgentChatToolCard,
} from '@gorkh/shared';
import { GorkhAgentMessageBubble } from './GorkhAgentMessageBubble.js';
import { GorkhAgentThinkingState } from './GorkhAgentThinkingState.js';

export function GorkhAgentMessageList({
  messages,
  toolCardsByMessageId,
  thinking,
  onToolAction,
}: {
  messages: GorkhAgentChatMessage[];
  toolCardsByMessageId: Record<string, GorkhAgentChatToolCard[]>;
  thinking: boolean;
  onToolAction?: (card: GorkhAgentChatToolCard) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, thinking]);

  return (
    <div data-testid="gorkh-agent-message-list" style={listStyle}>
      {messages.length === 0 ? (
        <div style={emptyStyle}>Ask what GORKH Agent can do safely, or start with a wallet, Cloak, Zerion, Shield, Builder, or context request.</div>
      ) : (
        messages.map((message) => (
          <GorkhAgentMessageBubble
            key={message.id}
            message={message}
            toolCards={toolCardsByMessageId[message.id] ?? []}
            onToolAction={onToolAction}
          />
        ))
      )}
      {thinking && <GorkhAgentThinkingState />}
      <div ref={endRef} />
    </div>
  );
}

const listStyle: React.CSSProperties = {
  minHeight: '360px',
  maxHeight: '62vh',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.7rem',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(203,213,225,0.7)',
  background: 'linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.78))',
};

const emptyStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.82rem',
  padding: '1rem',
};
