import { useState } from 'react';
import {
  SolanaAgentProfileStatus,
  type SolanaAgentProfile,
} from '@gorkh/shared';
import { validateAgentProfile, validateSolanaAddress } from '../agentValidation.js';

export function AgentProfilePanel({
  agents,
  selectedAgentId,
  onSelectAgent,
  onCreateDefault,
  onUpdateAgent,
}: {
  agents: SolanaAgentProfile[];
  selectedAgentId?: string;
  onSelectAgent: (id: string) => void;
  onCreateDefault: () => void;
  onUpdateAgent: (agent: SolanaAgentProfile) => void;
}) {
  const selected = agents.find((a) => a.id === selectedAgentId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const startEdit = () => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description);
    setAddress(selected.humanControllerAddress ?? '');
    setLabel(selected.humanControllerLabel ?? '');
    setErrors([]);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const updated: SolanaAgentProfile = {
      ...selected,
      name: name.trim() || selected.name,
      description: description.trim(),
      humanControllerAddress: address.trim() || undefined,
      humanControllerLabel: label.trim() || undefined,
      updatedAt: Date.now(),
    };
    const validation = validateAgentProfile(updated);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    onUpdateAgent(updated);
    setEditing(false);
    setErrors([]);
  };

  const toggleStatus = () => {
    if (!selected) return;
    const updated: SolanaAgentProfile = {
      ...selected,
      status:
        selected.status === SolanaAgentProfileStatus.DISABLED
          ? SolanaAgentProfileStatus.ACTIVE_LOCAL
          : SolanaAgentProfileStatus.DISABLED,
      updatedAt: Date.now(),
    };
    onUpdateAgent(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {agents.length === 0 && (
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
          No agents yet. Create a default agent to get started.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={onCreateDefault}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            background: '#0f172a',
            color: 'white',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Create Default Agent
        </button>
      </div>

      {agents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Select Agent</label>
          <select
            value={selectedAgentId ?? ''}
            onChange={(e) => onSelectAgent(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
              background: 'white',
            }}
          >
            <option value="">— Choose an agent —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && !editing && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(226,232,240,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              {selected.name}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: selected.status === 'active_local' ? '#dcfce7' : '#f1f5f9',
                color: selected.status === 'active_local' ? '#166534' : '#64748b',
                border: `1px solid ${selected.status === 'active_local' ? '#bbf7d0' : '#e2e8f0'}`,
              }}
            >
              {selected.status.replace(/_/g, ' ')}
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
              local only
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>{selected.description}</span>
          {selected.humanControllerAddress && (
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
              Controller: {selected.humanControllerAddress}
            </span>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              onClick={startEdit}
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
              Edit
            </button>
            <button
              onClick={toggleStatus}
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
              {selected.status === 'disabled' ? 'Enable' : 'Disable'}
            </button>
          </div>
        </div>
      )}

      {selected && editing && (
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
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
            }}
          />

          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            rows={3}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
              resize: 'vertical',
            }}
          />

          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            Human Controller Address (optional)
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana public key"
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
            }}
          />
          {address && !validateSolanaAddress(address) && (
            <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
              Does not look like a valid Solana address.
            </span>
          )}

          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            Controller Label (optional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
            }}
          />

          {errors.length > 0 && (
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
              {errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={saveEdit}
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
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
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
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
