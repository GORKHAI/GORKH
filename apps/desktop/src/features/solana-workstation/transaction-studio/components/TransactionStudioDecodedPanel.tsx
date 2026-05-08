import type { TransactionStudioDecodedTransaction } from '@gorkh/shared';

export function TransactionStudioDecodedPanel({
  decoded,
}: {
  decoded: TransactionStudioDecodedTransaction | null;
}) {
  return (
    <div className="txs-subpanel" data-testid="transaction-studio-decoded-panel">
      <div className="txs-subpanel-title">Decoded Summary</div>
      {decoded ? (
        <div className="txs-metrics">
          <span>{decoded.format}</span>
          <span>{decoded.signatureCount}/{decoded.requiredSignatureCount} sig</span>
          <span>{decoded.accountCount} accounts</span>
          <span>{decoded.writableAccountCount} writable</span>
          <span>{decoded.knownProgramCount} known</span>
          <span>{decoded.unknownProgramCount} unknown</span>
        </div>
      ) : (
        <p className="txs-empty">No decoded transaction.</p>
      )}
    </div>
  );
}
