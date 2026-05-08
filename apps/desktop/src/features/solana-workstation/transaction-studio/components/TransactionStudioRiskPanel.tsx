import type { TransactionStudioRiskReport } from '@gorkh/shared';

export function TransactionStudioRiskPanel({ report }: { report: TransactionStudioRiskReport | null }) {
  return (
    <section className="txs-panel txs-risk-panel" data-testid="transaction-studio-risk-inspector">
      <div className="txs-panel-header">
        <div>
          <div className="txs-eyebrow">Risk Inspector</div>
          <h3>Review</h3>
        </div>
        <span className={`txs-chip txs-risk-${report?.highestLevel ?? 'info'}`}>
          {report?.highestLevel ?? 'info'}
        </span>
      </div>
      <div className="txs-scroll">
        {report ? (
          <>
            {report.findings.map((finding) => (
              <div className="txs-finding" key={finding.id}>
                <div className="txs-row-title">
                  {finding.title}
                  <span className={`txs-chip txs-risk-${finding.level}`}>{finding.level}</span>
                </div>
                <p>{finding.description}</p>
                <strong>{finding.recommendation}</strong>
              </div>
            ))}
            <div className="txs-subpanel txs-tight">
              <div className="txs-subpanel-title">Blocked Capabilities</div>
              <div className="txs-metrics">
                {['signing', 'transaction_broadcast', 'raw_broadcast', 'jito_bundle_submission'].map((cap) => (
                  <span key={cap}>{cap}</span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="txs-empty">Decode or classify input to generate the risk report.</p>
        )}
      </div>
    </section>
  );
}
