import { useState } from 'react';
import {
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
  type SolanaNetwork,
} from '@gorkh/shared';
import { createAttestationPreview } from '../createAttestationPreview.js';

export function AttestationPreviewPanel({
  agents,
  drafts,
  onGenerate,
}: {
  agents: SolanaAgentProfile[];
  drafts: SolanaAgentActionDraft[];
  onGenerate: (preview: SolanaAgentAttestationPreview) => void;
}) {
  const [agentId, setAgentId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [network, setNetwork] = useState<SolanaNetwork>('devnet');
  const [preview, setPreview] = useState<SolanaAgentAttestationPreview | null>(null);
  const [generating, setGenerating] = useState(false);

  const agent = agents.find((a) => a.id === agentId);
  const draft = drafts.find((d) => d.id === draftId);

  const filteredDrafts = agent ? drafts.filter((d) => d.agentId === agent.id) : drafts;

  const handleGenerate = async () => {
    if (!agent || !draft) return;
    setGenerating(true);
    try {
      const result = await createAttestationPreview({
        agent,
        policy: agent.policy,
        draft,
        network,
      });
      setPreview(result);
      onGenerate(result);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(preview.previewPayload, null, 2));
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Agent</label>
        <select
          value={agentId}
          onChange={(e) => {
            setAgentId(e.target.value);
            setDraftId('');
            setPreview(null);
          }}
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
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Draft</label>
        <select
          value={draftId}
          onChange={(e) => {
            setDraftId(e.target.value);
            setPreview(null);
          }}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            background: 'white',
          }}
        >
          <option value="">— Select a draft —</option>
          {filteredDrafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
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
      </div>

      <button
        onClick={() => void handleGenerate()}
        disabled={!agent || !draft || generating}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          border: 'none',
          background: !agent || !draft || generating ? '#e5e7eb' : '#0f172a',
          color: !agent || !draft || generating ? '#9ca3af' : 'white',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: !agent || !draft || generating ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {generating ? 'Generating…' : 'Generate Attestation Preview'}
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
              Attestation Preview
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
              }}
            >
              {preview.status}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Agent: {preview.agentName} • Network: {preview.network}
          </span>

          {preview.warnings.length > 0 && (
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                fontSize: '0.8rem',
                color: '#991b1b',
              }}
            >
              <strong>Warnings:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

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
            {JSON.stringify(preview.previewPayload, null, 2)}
          </div>

          <div
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontSize: '0.8rem',
              color: '#991b1b',
            }}
          >
            <strong>Safety Note:</strong> {preview.safetyNote}
          </div>

          <button
            onClick={() => void handleCopy()}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '9999px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              color: '#0f172a',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Copy JSON to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
