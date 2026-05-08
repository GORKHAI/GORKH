import type { TransactionStudioSimulationResult } from '@gorkh/shared';

export function TransactionStudioLogsPanel({ simulation }: { simulation: TransactionStudioSimulationResult | null }) {
  return (
    <div className="txs-bottom-pane" data-testid="transaction-studio-logs-panel">
      <div className="txs-subpanel-title">Logs</div>
      <div className="txs-log-list">
        {simulation?.logs.length ? (
          simulation.logs.map((line, index) => <code key={`${index}-${line}`}>{line}</code>)
        ) : (
          <p className="txs-empty">No simulation logs available.</p>
        )}
      </div>
    </div>
  );
}
