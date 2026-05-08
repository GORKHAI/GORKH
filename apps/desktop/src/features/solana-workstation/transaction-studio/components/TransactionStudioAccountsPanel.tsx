import type { TransactionStudioDecodedTransaction } from '@gorkh/shared';

export function TransactionStudioAccountsPanel({
  decoded,
}: {
  decoded: TransactionStudioDecodedTransaction | null;
}) {
  return (
    <div className="txs-subpanel" data-testid="transaction-studio-accounts-panel">
      <div className="txs-subpanel-title">Accounts</div>
      <div className="txs-account-list">
        {decoded ? (
          decoded.accounts.map((account) => (
            <div className="txs-account-row" key={`${account.index}-${account.address}`}>
              <span>{account.index}</span>
              <code>{account.address}</code>
              <em>{account.signer ? 'signer' : 'read'}</em>
              <em>{account.writable ? 'writable' : 'readonly'}</em>
            </div>
          ))
        ) : (
          <p className="txs-empty">No account list available.</p>
        )}
      </div>
    </div>
  );
}
