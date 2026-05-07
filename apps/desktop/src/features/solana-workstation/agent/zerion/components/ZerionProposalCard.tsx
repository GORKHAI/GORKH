import type { ZerionAgentProposal, ZerionPolicyCheckResult } from '@gorkh/shared';

export function ZerionProposalCard({
  proposal,
  amountSol,
  approvalChecked,
  policyCheck,
  onAmountChange,
  onCreateProposal,
  onApprovalChange,
  onExecute,
}: {
  proposal?: ZerionAgentProposal;
  amountSol: string;
  approvalChecked: boolean;
  policyCheck?: ZerionPolicyCheckResult;
  onAmountChange: (value: string) => void;
  onCreateProposal: () => void;
  onApprovalChange: (value: boolean) => void;
  onExecute: () => void;
}) {
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.7rem' }}>
      <strong style={{ color: '#0f172a' }}>Policy-Bound Tiny Swap Agent</strong>
      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', maxWidth: 220 }}>
        Amount SOL
        <input value={amountSol} onChange={(event) => onAmountChange(event.target.value)} />
      </label>
      <button className="gorkh-workstation-icon-button" onClick={onCreateProposal}>Create Proposal</button>
      {proposal && (
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <span style={{ color: '#475569', fontSize: '0.78rem' }}>
            Real transaction warning: this proposal can execute an onchain Solana swap through Zerion CLI.
          </span>
          <pre style={{ margin: 0, padding: '0.65rem', borderRadius: '6px', background: '#0f172a', color: '#e2e8f0', overflowX: 'auto', fontSize: '0.75rem' }}>
            {proposal.commandPreview.join(' ')}
          </pre>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: '#334155', fontSize: '0.78rem', lineHeight: 1.45 }}>
            <input type="checkbox" checked={approvalChecked} onChange={(event) => onApprovalChange(event.target.checked)} />
            <span>I understand this will execute a real onchain transaction using Zerion CLI and a tiny-funded Zerion agent wallet.</span>
          </label>
          {policyCheck && !policyCheck.allowed && (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#991b1b', fontSize: '0.75rem' }}>
              {policyCheck.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          )}
          <button
            className="gorkh-workstation-icon-button"
            disabled={!approvalChecked || !policyCheck?.allowed}
            onClick={onExecute}
          >
            Execute via Zerion CLI
          </button>
        </div>
      )}
    </div>
  );
}

