import type { ZerionAgentWallet } from '@gorkh/shared';

export function ZerionWalletSelector({
  wallets,
  selectedWalletName,
  manualWalletName,
  onManualWalletNameChange,
  onSelectWallet,
  onRefreshWallets,
}: {
  wallets: ZerionAgentWallet[];
  selectedWalletName?: string;
  manualWalletName: string;
  onManualWalletNameChange: (value: string) => void;
  onSelectWallet: (value: string) => void;
  onRefreshWallets: () => void;
}) {
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: '#0f172a' }}>Agent Wallet</strong>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.78rem' }}>
            Create and fund the Zerion wallet manually in the CLI. GORKH does not import keys here.
          </p>
        </div>
        <button className="gorkh-workstation-icon-button" onClick={onRefreshWallets}>List Wallets</button>
      </div>
      <select value={selectedWalletName ?? ''} onChange={(event) => onSelectWallet(event.target.value)}>
        <option value="">Select Zerion agent wallet</option>
        {wallets.map((wallet) => (
          <option key={wallet.name} value={wallet.name}>
            {wallet.name}{wallet.address ? ` — ${wallet.address.slice(0, 8)}...` : ''}
          </option>
        ))}
      </select>
      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
        Manual wallet name
        <input
          value={manualWalletName}
          onChange={(event) => onManualWalletNameChange(event.target.value)}
          onBlur={() => manualWalletName && onSelectWallet(manualWalletName)}
          placeholder="gorkh-agent-demo"
        />
      </label>
    </div>
  );
}

