import type { GorkhAgentChatMessage, GorkhAgentChatToolCard } from '@gorkh/shared';
import { GorkhAgentToolCard } from './GorkhAgentToolCard.js';

export function GorkhAgentMessageBubble({
  message,
  toolCards,
  onToolAction,
}: {
  message: GorkhAgentChatMessage;
  toolCards: GorkhAgentChatToolCard[];
  onToolAction?: (card: GorkhAgentChatToolCard) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div data-testid={`gorkh-agent-message-${message.role}`} style={rowStyle(isUser)}>
      <div style={bubbleStyle(isUser, message.status)}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{message.content}</div>
        {message.redactionsApplied.length > 0 && (
          <div style={noteStyle}>Redactions: {message.redactionsApplied.join(', ')}</div>
        )}
        {message.safetyNotes.length > 0 && !isUser && (
          <div style={noteStyle}>Local only · policy-gated · no chat execution</div>
        )}
      </div>
      {toolCards.length > 0 && (
        <div style={cardsStyle}>
          {toolCards.map((card) => (
            <GorkhAgentToolCard key={card.id} card={card} onAction={onToolAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function rowStyle(isUser: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
    gap: '0.4rem',
  };
}

function bubbleStyle(isUser: boolean, status: string): React.CSSProperties {
  const blocked = status === 'blocked';
  return {
    maxWidth: 'min(760px, 88%)',
    borderRadius: '8px',
    padding: '0.65rem 0.75rem',
    background: isUser ? '#0f172a' : blocked ? '#fef2f2' : 'rgba(255,255,255,0.92)',
    color: isUser ? 'white' : blocked ? '#7f1d1d' : '#0f172a',
    border: isUser ? '1px solid #0f172a' : blocked ? '1px solid #fecaca' : '1px solid rgba(203,213,225,0.72)',
    fontSize: '0.82rem',
  };
}

const noteStyle: React.CSSProperties = {
  marginTop: '0.4rem',
  fontSize: '0.66rem',
  color: '#64748b',
};

const cardsStyle: React.CSSProperties = {
  width: 'min(760px, 88%)',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0.45rem',
};
