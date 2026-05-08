import type {
  TransactionStudioDecodedTransaction,
  TransactionStudioRiskReport,
  TransactionStudioSimulationResult,
} from '@gorkh/shared';

export function TransactionStudioInspector({
  decoded,
  riskReport,
  simulation,
}: {
  decoded: TransactionStudioDecodedTransaction | null;
  riskReport: TransactionStudioRiskReport | null;
  simulation: TransactionStudioSimulationResult | null;
}) {
  return (
    <div className="txs-subpanel" data-testid="transaction-studio-context-panel">
      <div className="txs-subpanel-title">Audit Context</div>
      <div className="txs-kv">
        <span>Decode</span>
        <strong>{decoded ? `${decoded.instructionCount} instructions` : 'empty'}</strong>
        <span>Risk</span>
        <strong>{riskReport?.highestLevel ?? 'none'}</strong>
        <span>Simulation</span>
        <strong>{simulation?.status ?? 'not run'}</strong>
      </div>
    </div>
  );
}
