import type { TransactionStudioSimulationResult } from '@gorkh/shared';

export function TransactionStudioBalanceDiffPanel({
  simulation,
}: {
  simulation: TransactionStudioSimulationResult | null;
}) {
  const changes = [
    ...(simulation?.balanceChanges ?? []),
    ...(simulation?.tokenBalanceChanges ?? []),
  ];
  return (
    <div className="txs-bottom-pane" data-testid="transaction-studio-balance-diffs-panel">
      <div className="txs-subpanel-title">Balance Diffs</div>
      {changes.length > 0 ? (
        changes.map((change) => (
          <div className="txs-account-row" key={`${change.account}-${change.mint ?? 'sol'}`}>
            <code>{change.account}</code>
            <span>{change.source}</span>
            <span>{change.delta ?? 'post-state snapshot'}</span>
          </div>
        ))
      ) : (
        <p className="txs-empty">No balance diff data available from this source.</p>
      )}
    </div>
  );
}
