import { useState } from 'react';
import {
  SolanaAgentActionKind,
  SolanaNetwork,
  getAgentActionKindLabel,
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaTrustedProtocolId,
} from '@gorkh/shared';
import { TRUSTED_SOLANA_PROTOCOLS } from '@gorkh/shared';
import { createActionDraft } from '../createActionDraft.js';

export function ActionDraftPanel({
  agents,
  selectedAgentId,
  onCreateDraft,
}: {
  agents: SolanaAgentProfile[];
  selectedAgentId?: string;
  onCreateDraft: (draft: SolanaAgentActionDraft) => void;
}) {
  const [agentId, setAgentId] = useState(selectedAgentId ?? '');
  const [kind, setKind] = useState<SolanaAgentActionKind>(SolanaAgentActionKind.ANALYZE_TRANSACTION);
  const [title, setTitle] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [network, setNetwork] = useState<SolanaNetwork>('devnet');
  const [relatedInput, setRelatedInput] = useState('');
  const [selectedProtocols, setSelectedProtocols] = useState<SolanaTrustedProtocolId[]>([]);
  const [preview, setPreview] = useState<SolanaAgentActionDraft | null>(null);

  const agent = agents.find((a) => a.id === agentId);

  const toggleProtocol = (id: SolanaTrustedProtocolId) => {
    setSelectedProtocols((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handlePreview = () => {
    if (!agent) return;
    const draft = createActionDraft({
      agent,
      kind,
      title: title.trim() || getAgentActionKindLabel(kind),
      userIntent,
      network,
      relatedInput,
      protocolIds: selectedProtocols,
    });
    setPreview(draft);
  };

  const handleConfirm = () => {
    if (!preview) return;
    onCreateDraft(preview);
    setPreview(null);
    setTitle('');
    setUserIntent('');
    setRelatedInput('');
    setSelectedProtocols([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Agent</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            background: 'white',
          }}
        >
          <option value="">— Select an agent —</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Action Kind</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SolanaAgentActionKind)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            background: 'white',
          }}
        >
          {Object.values(SolanaAgentActionKind).map((k) => (
            <option key={k} value={k}>
              {getAgentActionKindLabel(k)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={getAgentActionKindLabel(kind)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>User Intent</label>
        <textarea
          value={userIntent}
          onChange={(e) => setUserIntent(e.target.value)}
          placeholder="Describe what you want the agent to evaluate or prepare..."
          rows={3}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Network</label>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as SolanaNetwork)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            background: 'white',
          }}
        >
          <option value="devnet">Devnet</option>
          <option value="localnet">Localnet</option>
          {agent?.policy.allowMainnet && <option value="mainnet-beta">Mainnet-beta</option>}
        </select>
        {network === 'mainnet-beta' && !agent?.policy.allowMainnet && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
            Mainnet is not allowed by this agent&apos;s policy.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
          Related Input (optional)
        </label>
        <textarea
          value={relatedInput}
          onChange={(e) => setRelatedInput(e.target.value)}
          placeholder="Paste a transaction signature, serialized tx, or Builder context ID..."
          rows={2}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
          Protocols Involved
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {TRUSTED_SOLANA_PROTOCOLS.map((p) => (
            <label
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedProtocols.includes(p.id)}
                onChange={() => toggleProtocol(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handlePreview}
        disabled={!agent || !userIntent.trim()}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          border: 'none',
          background: !agent || !userIntent.trim() ? '#e5e7eb' : '#0f172a',
          color: !agent || !userIntent.trim() ? '#9ca3af' : 'white',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: !agent || !userIntent.trim() ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        Create Draft
      </button>

      {preview && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(226,232,240,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              {preview.title}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              {preview.status}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background:
                  preview.riskLevel === 'high'
                    ? '#fef2f2'
                    : preview.riskLevel === 'medium'
                      ? '#fef3c7'
                      : '#dcfce7',
                color:
                  preview.riskLevel === 'high'
                    ? '#991b1b'
                    : preview.riskLevel === 'medium'
                      ? '#92400e'
                      : '#166534',
                border:
                  preview.riskLevel === 'high'
                    ? '1px solid #fecaca'
                    : preview.riskLevel === 'medium'
                      ? '1px solid #fde68a'
                      : '1px solid #bbf7d0',
              }}
            >
              {preview.riskLevel} risk
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            Proposed Steps
          </span>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#475569' }}>
            {preview.proposedSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          {preview.blockedReasons.length > 0 && (
            <>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                Blocked Reasons
              </span>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.25rem',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                }}
              >
                {preview.blockedReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            Required Approvals
          </span>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#475569' }}>
            {preview.requiredApprovals.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              onClick={handleConfirm}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '9999px',
                border: 'none',
                background: '#0f172a',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save Draft
            </button>
            <button
              onClick={() => setPreview(null)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '9999px',
                border: '1px solid rgba(148,163,184,0.24)',
                background: 'rgba(255,255,255,0.8)',
                color: '#0f172a',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
