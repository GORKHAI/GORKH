import { useState } from 'react';
import {
  SolanaAgentApprovalMode,
  SolanaNetwork,
  type SolanaAgentProfile,
  type SolanaAgentPolicy,
} from '@gorkh/shared';

export function AgentPolicyPanel({
  agent,
  onUpdatePolicy,
}: {
  agent?: SolanaAgentProfile;
  onUpdatePolicy: (policy: SolanaAgentPolicy) => void;
}) {
  if (!agent) {
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
        Select an agent to view and edit its policy.
      </div>
    );
  }

  const policy = agent.policy;
  const [allowMainnet, setAllowMainnet] = useState(policy.allowMainnet);
  const [requireShield, setRequireShield] = useState(policy.requireShieldSimulationPreview);
  const [requireHuman, setRequireHuman] = useState(policy.requireHumanApproval);
  const [maxInstr, setMaxInstr] = useState(policy.maxInstructionsPerDraft ?? 5);

  const save = () => {
    const updated: SolanaAgentPolicy = {
      ...policy,
      allowMainnet,
      requireShieldSimulationPreview: requireShield,
      requireHumanApproval: requireHuman,
      maxInstructionsPerDraft: maxInstr,
      updatedAt: Date.now(),
    };
    onUpdatePolicy(updated);
  };

  const networks = [
    { key: SolanaNetwork.DEVNET, label: 'Devnet' },
    { key: SolanaNetwork.LOCALNET, label: 'Localnet' },
    { key: SolanaNetwork.MAINNET_BETA, label: 'Mainnet-beta' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          padding: '0.6rem 0.75rem',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(226,232,240,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Policy Name</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{policy.name}</span>

        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Risk Tolerance</span>
        <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>
          {policy.riskTolerance}
        </span>

        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Approval Mode</span>
        <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>
          {policy.approvalMode === SolanaAgentApprovalMode.MANUAL_EVERY_ACTION
            ? 'Manual — Every Action (Live)'
            : policy.approvalMode}
        </span>
        {policy.approvalMode !== SolanaAgentApprovalMode.MANUAL_EVERY_ACTION && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
            Only manual_every_action is supported in Agent v0.1.
          </span>
        )}

        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Allowed Networks</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {networks.map((n) => {
            const allowed = policy.allowedNetworks.includes(n.key);
            return (
              <span
                key={n.key}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: allowed ? '#dcfce7' : '#f1f5f9',
                  color: allowed ? '#166534' : '#64748b',
                  border: `1px solid ${allowed ? '#bbf7d0' : '#e2e8f0'}`,
                }}
              >
                {n.label}
              </span>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: '0.6rem 0.75rem',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(226,232,240,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#0f172a', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allowMainnet}
            onChange={(e) => setAllowMainnet(e.target.checked)}
          />
          Allow mainnet previews
        </label>
        {allowMainnet && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
            Mainnet previews are not executed. This only enables mainnet-beta selection in drafts.
          </span>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#0f172a', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={requireShield}
            onChange={(e) => setRequireShield(e.target.checked)}
          />
          Require Shield simulation preview
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#0f172a', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={requireHuman}
            onChange={(e) => setRequireHuman(e.target.checked)}
          />
          Require human approval
        </label>

        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
          Max instructions per draft
        </label>
        <input
          type="number"
          min={1}
          max={50}
          value={maxInstr}
          onChange={(e) => setMaxInstr(Math.max(1, parseInt(e.target.value || '1', 10)))}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            width: '100px',
          }}
        />

        <button
          onClick={save}
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
            marginTop: '0.25rem',
          }}
        >
          Update Policy
        </button>
      </div>
    </div>
  );
}
