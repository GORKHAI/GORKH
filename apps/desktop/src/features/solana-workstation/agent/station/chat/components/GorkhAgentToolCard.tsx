import type { GorkhAgentChatToolCard } from '@gorkh/shared';

export function GorkhAgentToolCard({
  card,
  onAction,
}: {
  card: GorkhAgentChatToolCard;
  onAction?: (card: GorkhAgentChatToolCard) => void;
}) {
  return (
    <article data-testid={`gorkh-agent-tool-card-${card.kind}`} style={cardStyle(card.status)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <strong style={{ color: '#0f172a', fontSize: '0.78rem' }}>{card.title}</strong>
        <span style={badgeStyle}>{card.status}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#475569' }}>{card.summary}</div>
      {card.actionLabel && onAction && (
        <button type="button" onClick={() => onAction(card)} style={buttonStyle}>
          {card.actionLabel}
        </button>
      )}
    </article>
  );
}

function cardStyle(status: GorkhAgentChatToolCard['status']): React.CSSProperties {
  const blocked = status === 'blocked' || status === 'failed';
  return {
    borderRadius: '8px',
    border: blocked ? '1px solid #fecaca' : '1px solid rgba(203,213,225,0.8)',
    background: blocked ? '#fef2f2' : 'rgba(255,255,255,0.85)',
    padding: '0.55rem 0.65rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.32rem',
  };
}

const badgeStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  color: '#475569',
  background: '#f1f5f9',
  borderRadius: '4px',
  padding: '0.08rem 0.3rem',
  textTransform: 'uppercase',
  fontWeight: 800,
};

const buttonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  border: 'none',
  borderRadius: '6px',
  background: '#0f172a',
  color: 'white',
  fontSize: '0.72rem',
  fontWeight: 700,
  padding: '0.36rem 0.6rem',
  cursor: 'pointer',
};
