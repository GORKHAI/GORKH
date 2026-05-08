import type { TransactionStudioInput } from '@gorkh/shared';

export function TransactionStudioInputPanel({ input }: { input: TransactionStudioInput | null }) {
  return (
    <div className="txs-subpanel" data-testid="transaction-studio-input-panel">
      <div className="txs-subpanel-title">Active Input</div>
      {input ? (
        <div className="txs-kv">
          <span>Kind</span>
          <strong>{input.kind}</strong>
          <span>Source</span>
          <strong>{input.source}</strong>
          <span>Local</span>
          <strong>{input.localOnly ? 'yes' : 'no'}</strong>
        </div>
      ) : (
        <p className="txs-empty">No active input.</p>
      )}
    </div>
  );
}
