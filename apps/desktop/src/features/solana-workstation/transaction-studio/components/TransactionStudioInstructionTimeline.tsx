import type { TransactionStudioDecodedTransaction } from '@gorkh/shared';

export function TransactionStudioInstructionTimeline({
  decoded,
}: {
  decoded: TransactionStudioDecodedTransaction | null;
}) {
  return (
    <section className="txs-panel txs-center-panel" data-testid="transaction-studio-instruction-timeline">
      <div className="txs-panel-header">
        <div>
          <div className="txs-eyebrow">Instruction Timeline</div>
          <h3>Decode</h3>
        </div>
        <span className="txs-chip">{decoded ? `${decoded.instructionCount} ix` : 'idle'}</span>
      </div>

      <div className="txs-scroll">
        {decoded ? (
          decoded.instructions.map((ix) => (
            <div className="txs-timeline-row" key={ix.index}>
              <div className="txs-timeline-index">{ix.index + 1}</div>
              <div>
                <div className="txs-row-title">
                  {ix.programName ?? ix.programId}
                  <span className={ix.knownProgram ? 'txs-chip' : 'txs-chip txs-chip-warn'}>
                    {ix.knownProgram ? 'known' : 'unknown'}
                  </span>
                </div>
                <p>{ix.summary}</p>
                {ix.warnings.map((warning) => (
                  <div className="txs-warning" key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="txs-empty">
            Paste a base64 serialized transaction and click Decode. Base58 raw transaction decode is
            coming soon and will not be faked.
          </p>
        )}
      </div>
    </section>
  );
}
