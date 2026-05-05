import type { SolanaBuilderCommandDraft } from '@gorkh/shared';
import { SolanaBuilderCommandSafety } from '@gorkh/shared';

interface CommandDraftsPanelProps {
  drafts: SolanaBuilderCommandDraft[];
}

export function CommandDraftsPanel({ drafts }: CommandDraftsPanelProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const safetyBadge = (safety: SolanaBuilderCommandDraft['safety']) => {
    if (safety === SolanaBuilderCommandSafety.ALLOWED_TO_RUN) {
      return { label: 'Allowed', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
    }
    if (safety === SolanaBuilderCommandSafety.DRAFT_ONLY) {
      return { label: 'Draft Only', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    }
    return { label: 'Blocked', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          fontSize: '0.8rem',
          color: '#64748b',
          lineHeight: 1.5,
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          background: 'rgba(254,252,232,0.4)',
          border: '1px solid rgba(253,224,71,0.2)',
        }}
      >
        Draft commands are shown for reference only. GORKH Builder v0.2 does not execute build, test, or deploy commands.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {drafts.map((draft) => {
          const badge = safetyBadge(draft.safety);
          const commandText = draft.command.join(' ');

          return (
            <div
              key={draft.id}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(148,163,184,0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{draft.title}</strong>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                {draft.canCopy && (
                  <button
                    onClick={() => void copyToClipboard(commandText)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(148,163,184,0.24)',
                      background: 'rgba(255,255,255,0.8)',
                      color: '#0f172a',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                )}
              </div>

              <code
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '4px',
                  background: 'rgba(241,245,249,0.6)',
                  fontSize: '0.78rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: '#475569',
                  wordBreak: 'break-all',
                }}
              >
                {commandText}
              </code>

              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {draft.reason}
              </div>

              {draft.warning && (
                <div
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    fontSize: '0.75rem',
                    color: badge.text,
                  }}
                >
                  ⚠️ {draft.warning}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {draft.expectedWrites && (
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Writes files</span>
                )}
                {draft.requiresWalletOrKeypair && (
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Requires keypair</span>
                )}
                {draft.requiresNetwork && (
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Requires network</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
