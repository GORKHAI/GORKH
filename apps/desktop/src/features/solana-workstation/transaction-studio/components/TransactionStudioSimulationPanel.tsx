import type { TransactionStudioSimulationResult } from '@gorkh/shared';
import {
  TRANSACTION_STUDIO_CURRENT_STATE_REPLAY_LABEL,
  TRANSACTION_STUDIO_REPLAY_LOCKED_COPY,
  TRANSACTION_STUDIO_SIMULATION_DISCLAIMER,
} from '../transactionStudioCopy.js';

export function TransactionStudioSimulationPanel({
  simulation,
}: {
  simulation: TransactionStudioSimulationResult | null;
}) {
  return (
    <div className="txs-bottom-pane" data-testid="transaction-studio-simulation-panel">
      <div className="txs-subpanel-title">Simulation</div>
      <span className="txs-chip">{TRANSACTION_STUDIO_CURRENT_STATE_REPLAY_LABEL}</span>
      <p className="txs-empty">{TRANSACTION_STUDIO_SIMULATION_DISCLAIMER}</p>
      <p className="txs-empty">{TRANSACTION_STUDIO_REPLAY_LOCKED_COPY}</p>
      {simulation ? (
        <div className="txs-metrics">
          <span>{simulation.status}</span>
          <span>{simulation.computeUnitsConsumed ?? 'unknown'} CU</span>
          <span>{simulation.replacementBlockhash ? 'replacement blockhash' : 'no blockhash'}</span>
          <span>{simulation.warnings.includes('Signature verification disabled for preview.') ? 'sigVerify false' : 'manual'}</span>
          {simulation.status === 'running' && <span>loading</span>}
          {simulation.status === 'failed' && <span>rpc error</span>}
        </div>
      ) : (
        <p className="txs-empty">Simulation has not been run. It only runs after an explicit click.</p>
      )}
    </div>
  );
}
