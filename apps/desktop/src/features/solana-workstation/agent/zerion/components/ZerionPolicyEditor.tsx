import type { ZerionAgentPolicy } from '@gorkh/shared';

export function ZerionPolicyEditor({
  policy,
  onPolicyChange,
  onCreatePolicy,
  onCreateToken,
  tokenName,
  onTokenNameChange,
}: {
  policy: ZerionAgentPolicy;
  onPolicyChange: (policy: ZerionAgentPolicy) => void;
  onCreatePolicy: () => void;
  onCreateToken: () => void;
  tokenName: string;
  onTokenNameChange: (value: string) => void;
}) {
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.7rem' }}>
      <strong style={{ color: '#0f172a' }}>Policy Setup</strong>
      <div style={{ display: 'grid', gap: '0.55rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
          Policy name
          <input value={policy.name} onChange={(event) => onPolicyChange({ ...policy, name: event.target.value })} />
        </label>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
          Max SOL
          <input value={policy.maxSolAmount} onChange={(event) => onPolicyChange({ ...policy, maxSolAmount: event.target.value })} />
        </label>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
          Agent token name
          <input value={tokenName} onChange={(event) => onTokenNameChange(event.target.value)} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.75rem' }}>
        <span>Chain: solana</span>
        <span>Pair: SOL to USDC</span>
        <span>Max executions: 1</span>
        <span>Bridge disabled</span>
        <span>Send disabled</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="gorkh-workstation-icon-button" onClick={onCreatePolicy}>Create Zerion Policy</button>
        <button className="gorkh-workstation-icon-button" onClick={onCreateToken}>Create Agent Token</button>
      </div>
    </div>
  );
}

