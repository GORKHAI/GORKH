import {
  SolanaWorkstationContextSource,
  type SolanaWorkstationLastTransactionStudioContext,
  type TransactionStudioWorkspaceState,
} from '@gorkh/shared';

function countBalanceDiffs(state: TransactionStudioWorkspaceState): number {
  return (
    (state.activeSimulation?.balanceChanges.length ?? 0) +
    (state.activeSimulation?.tokenBalanceChanges.length ?? 0)
  );
}

export function createTransactionStudioContextSnapshot(
  state: TransactionStudioWorkspaceState
): SolanaWorkstationLastTransactionStudioContext {
  const decoded = state.activeDecodedTransaction;
  const risk = state.activeRiskReport;
  const simulation = state.activeSimulation;
  const explanation = state.activeExplanation;

  return {
    source: SolanaWorkstationContextSource.TRANSACTION_STUDIO,
    inputKind: state.activeInput?.kind ?? 'unknown',
    decodedSummary: decoded
      ? `${decoded.format} transaction, ${decoded.instructionCount} instruction(s), ${decoded.accountCount} account(s), ${decoded.signatureCount}/${decoded.requiredSignatureCount} signatures.`
      : 'No decoded transaction available.',
    riskSummary: risk
      ? `${risk.highestLevel} risk, ${risk.findings.length} finding(s).`
      : 'No risk report available.',
    simulationSummary: simulation
      ? `${simulation.status} simulation, ${simulation.logs.length} log line(s), ${simulation.computeUnitsConsumed ?? 'unknown'} CU.`
      : 'Simulation not run.',
    balanceDiffSummary:
      countBalanceDiffs(state) > 0
        ? `${countBalanceDiffs(state)} balance diff item(s).`
        : 'No balance diff data available from this source.',
    explanationSummary: explanation?.summary ?? 'No explanation generated.',
    redactionsApplied: [
      ...(state.activeInput?.redactionsApplied ?? []),
      'transactionStudio.rawInput.excluded',
      'transactionStudio.secretMaterial.redacted',
    ],
    updatedAt: Date.now(),
    localOnly: true,
  };
}
