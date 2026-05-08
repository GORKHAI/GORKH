import {
  TransactionStudioInputKind,
  TransactionStudioSource,
  type TransactionStudioInput,
} from '@gorkh/shared';
import { TRANSACTION_STUDIO_LOCKED_COPY } from '../transactionStudioGuards.js';

export function TransactionStudioSourcePanel({
  input,
  value,
  onValueChange,
  onDecode,
  onFetchTransaction,
  onFetchAccount,
  onSimulate,
  onClear,
  busy,
}: {
  input: TransactionStudioInput | null;
  value: string;
  onValueChange: (value: string) => void;
  onDecode: () => void;
  onFetchTransaction: () => void;
  onFetchAccount: () => void;
  onSimulate: () => void;
  onClear: () => void;
  busy: boolean;
}) {
  const kind = input?.kind ?? TransactionStudioInputKind.UNKNOWN;
  return (
    <section className="txs-panel txs-source-panel" data-testid="transaction-studio-source-panel">
      <div className="txs-panel-header">
        <div>
          <div className="txs-eyebrow">Sources / Input</div>
          <h3>Review Source</h3>
        </div>
        <span className="txs-chip">{kind}</span>
      </div>

      <textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Paste a signature, serialized transaction base64/base58, address, Agent draft, Cloak draft, or Zerion proposal..."
        className="txs-input"
        data-testid="transaction-studio-input"
      />

      <div className="txs-button-grid">
        <button onClick={onDecode} className="txs-button txs-button-primary" disabled={busy}>
          Decode
        </button>
        <button onClick={onFetchTransaction} className="txs-button" disabled={busy || kind !== 'signature'}>
          Fetch Transaction
        </button>
        <button onClick={onFetchAccount} className="txs-button" disabled={busy || kind !== 'address'}>
          Lookup Account
        </button>
        <button
          onClick={onSimulate}
          className="txs-button"
          disabled={busy || kind !== 'serialized_transaction_base64'}
        >
          Simulate
        </button>
      </div>

      <div className="txs-source-list" aria-label="Transaction Studio handoff sources">
        {[
          ['Pasted', TransactionStudioSource.PASTED],
          ['Agent handoff', TransactionStudioSource.AGENT],
          ['Cloak draft', TransactionStudioSource.CLOAK],
          ['Zerion proposal', TransactionStudioSource.ZERION],
          ['Shield input', TransactionStudioSource.SHIELD],
          ['Builder draft', TransactionStudioSource.BUILDER],
          ['Recent Studio inputs', TransactionStudioSource.HISTORY],
        ].map(([label, source]) => (
          <div className="txs-source-row" key={source}>
            <span>{label}</span>
            <span>{input?.source === source ? 'active' : 'review-only'}</span>
          </div>
        ))}
      </div>

      <button onClick={onClear} className="txs-button txs-button-muted">
        Clear Workspace
      </button>

      <div className="txs-locked-note">{TRANSACTION_STUDIO_LOCKED_COPY}</div>
    </section>
  );
}
