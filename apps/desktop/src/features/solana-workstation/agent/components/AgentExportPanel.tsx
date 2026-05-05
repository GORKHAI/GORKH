import { useState, useMemo } from 'react';
import {
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
  type SolanaAgentAuditEvent,
} from '@gorkh/shared';
import { createAgentContextMarkdown } from '../../context-bridge/createAgentContextMarkdown.js';

export function AgentExportPanel({
  agents,
  drafts,
  attestationPreviews,
  auditEvents,
}: {
  agents: SolanaAgentProfile[];
  drafts: SolanaAgentActionDraft[];
  attestationPreviews: SolanaAgentAttestationPreview[];
  auditEvents: SolanaAgentAuditEvent[];
}) {
  const [copied, setCopied] = useState(false);
  const selectedAgent = agents[0] ?? null;

  const markdown = useMemo(() => {
    if (!selectedAgent) return '';
    return createAgentContextMarkdown({
      agent: selectedAgent,
      drafts,
      attestationPreviews,
      auditEvents,
    });
  }, [selectedAgent, drafts, attestationPreviews, auditEvents]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!selectedAgent) {
    return (
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '8px',
          background: 'rgba(241,245,249,0.5)',
          border: '1px dashed rgba(148,163,184,0.3)',
          fontSize: '0.85rem',
          color: '#94a3b8',
          textAlign: 'center',
        }}
      >
        Create an agent to export its context.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
          Agent Context Export
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0',
          }}
        >
          local only
        </span>
      </div>

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.75rem',
          color: '#475569',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          maxHeight: '240px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {markdown}
      </div>

      <button
        onClick={() => void handleCopy()}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '9999px',
          border: 'none',
          background: '#0f172a',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {copied ? 'Copied!' : 'Copy Agent Context'}
      </button>
    </div>
  );
}
