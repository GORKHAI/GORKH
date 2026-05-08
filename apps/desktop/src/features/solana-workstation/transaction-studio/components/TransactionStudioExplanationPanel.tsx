import type { TransactionStudioExplanation } from '@gorkh/shared';

export function TransactionStudioExplanationPanel({
  explanation,
}: {
  explanation: TransactionStudioExplanation | null;
}) {
  return (
    <div className="txs-bottom-pane" data-testid="transaction-studio-explanation-panel">
      <div className="txs-subpanel-title">Explanation</div>
      {explanation ? (
        <>
          <p>{explanation.summary}</p>
          <ul className="txs-compact-list">
            {explanation.plainEnglishSteps.slice(0, 5).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="txs-empty">Plain-English explanation is generated deterministically after decode.</p>
      )}
    </div>
  );
}
