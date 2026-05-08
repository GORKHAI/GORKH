import {
  TRANSACTION_STUDIO_BLOCKED_CAPABILITIES,
  TRANSACTION_STUDIO_PHASE_1_SAFETY_NOTES,
} from '@gorkh/shared';

export function TransactionStudioSafetyPanel() {
  return (
    <div className="txs-subpanel" data-testid="transaction-studio-safety-panel">
      <div className="txs-subpanel-title">Safety Rails</div>
      <ul className="txs-compact-list">
        {TRANSACTION_STUDIO_PHASE_1_SAFETY_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <div className="txs-metrics">
        {TRANSACTION_STUDIO_BLOCKED_CAPABILITIES.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>
    </div>
  );
}
