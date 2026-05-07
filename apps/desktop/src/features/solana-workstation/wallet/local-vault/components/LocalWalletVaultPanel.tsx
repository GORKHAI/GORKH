import { useState } from 'react';
import type { LocalWalletProfile, SolanaRpcNetwork } from '@gorkh/shared';
import { createLocalWallet, forgetLocalWallet, importLocalWallet, lockLocalWallet, unlockLocalWallet } from '../localWalletVault.js';

export function LocalWalletVaultPanel({
  wallets,
  selectedWalletId,
  onWalletsChange,
  onSelectWallet,
}: {
  wallets: LocalWalletProfile[];
  selectedWalletId: string | null;
  onWalletsChange: (wallets: LocalWalletProfile[]) => void;
  onSelectWallet: (walletId: string | null) => void;
}) {
  const [label, setLabel] = useState('GORKH Local Wallet');
  const [network, setNetwork] = useState<SolanaRpcNetwork>('mainnet-beta');
  const [importSecret, setImportSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [ackBackup, setAckBackup] = useState(false);
  const [ackCustody, setAckCustody] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selected = wallets.find((wallet) => wallet.walletId === selectedWalletId) ?? null;
  const canCreate = ackBackup && ackCustody && label.trim().length > 0 && !busy;

  async function handleCreate() {
    if (!canCreate) return;
    setBusy(true);
    setStatus(null);
    try {
      const wallet = await createLocalWallet({ label, network });
      const next = [wallet, ...wallets];
      onWalletsChange(next);
      onSelectWallet(wallet.walletId);
      setStatus(`Created ${wallet.publicAddress}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!canCreate || !importSecret.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const wallet = await importLocalWallet({ label, network, secret: importSecret });
      setImportSecret('');
      const next = [wallet, ...wallets];
      onWalletsChange(next);
      onSelectWallet(wallet.walletId);
      setStatus(`Imported ${wallet.publicAddress}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setImportSecret('');
      setBusy(false);
    }
  }

  async function handleForget(walletId: string) {
    setBusy(true);
    setStatus(null);
    try {
      await forgetLocalWallet(walletId);
      const next = wallets.filter((wallet) => wallet.walletId !== walletId);
      onWalletsChange(next);
      onSelectWallet(selectedWalletId === walletId ? null : selectedWalletId);
      setStatus('Wallet forgotten locally.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(wallet: LocalWalletProfile) {
    setBusy(true);
    setStatus(null);
    try {
      const unlocked = await unlockLocalWallet(wallet);
      onWalletsChange(wallets.map((candidate) => candidate.walletId === wallet.walletId ? unlocked : candidate));
      onSelectWallet(wallet.walletId);
      setStatus('Wallet unlocked for this desktop session. No secret was returned to the UI.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function handleLock(wallet: LocalWalletProfile) {
    const locked = lockLocalWallet(wallet);
    onWalletsChange(wallets.map((candidate) => candidate.walletId === wallet.walletId ? locked : candidate));
    setStatus('Wallet locked for this desktop session.');
  }

  return (
    <section className="gorkh-assistant-panel" style={{ display: 'grid', gap: '0.85rem' }}>
      <div>
        <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.92)' }}>Local Wallet Vault</h4>
        <p style={{ margin: '0.35rem 0 0', color: 'rgba(255,255,255,0.62)', fontSize: '0.8rem' }}>
          Create or import a non-custodial Solana wallet. Secret material is stored by Rust in the OS keychain and is never persisted in browser storage.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 0.5fr)', gap: '0.65rem' }}>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
          Wallet label
          <input value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
          Network
          <select value={network} onChange={(event) => setNetwork(event.target.value as SolanaRpcNetwork)}>
            <option value="mainnet-beta">Mainnet</option>
            <option value="devnet">Devnet</option>
            <option value="localnet">Localnet</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.68)' }}>
        <label><input type="checkbox" checked={ackBackup} onChange={(event) => setAckBackup(event.target.checked)} /> I understand GORKH cannot recover this wallet if I lose access.</label>
        <label><input type="checkbox" checked={ackCustody} onChange={(event) => setAckCustody(event.target.checked)} /> I understand this is non-custodial and local signing requires explicit approval.</label>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="gorkh-workstation-icon-button" style={{ width: 'auto', padding: '0 0.8rem' }} disabled={!canCreate} onClick={handleCreate}>
          Create wallet
        </button>
      </div>

      <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
        Import Solana CLI JSON array or base58 secret
        <textarea
          value={importSecret}
          onChange={(event) => setImportSecret(event.target.value)}
          rows={4}
          placeholder="[12,34,...] or base58 secret. Cleared immediately after import."
        />
      </label>
      <button className="gorkh-workstation-icon-button" style={{ width: 'fit-content', padding: '0 0.8rem' }} disabled={!canCreate || !importSecret.trim()} onClick={handleImport}>
        Import wallet
      </button>

      {selected && (
        <div className="gorkh-inspector-card" style={{ padding: '0.75rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>{selected.label}</div>
          <div style={{ marginTop: '0.3rem', fontSize: '0.76rem', color: 'rgba(255,255,255,0.62)', wordBreak: 'break-all' }}>{selected.publicAddress}</div>
          <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span className="gorkh-workstation-mini-badge">{selected.source}</span>
            <span className="gorkh-workstation-mini-badge">{selected.securityStatus}</span>
            <span className="gorkh-workstation-mini-badge">keychain only</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.45rem' }}>
        {wallets.map((wallet) => (
          <div key={wallet.walletId} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', alignItems: 'center', fontSize: '0.78rem' }}>
            <button className="gorkh-workstation-nav-item" style={{ margin: 0, border: 'none', flex: 1 }} onClick={() => onSelectWallet(wallet.walletId)}>
              <span>{wallet.label}</span>
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.45)' }}>{wallet.publicAddress.slice(0, 4)}...{wallet.publicAddress.slice(-4)}</span>
            </button>
            <button
              className="gorkh-workstation-icon-button"
              disabled={busy}
              onClick={() => wallet.securityStatus === 'unlocked' ? handleLock(wallet) : void handleUnlock(wallet)}
            >
              {wallet.securityStatus === 'unlocked' ? 'Lock' : 'Unlock'}
            </button>
            <button className="gorkh-workstation-icon-button" disabled={busy} onClick={() => void handleForget(wallet.walletId)}>Forget</button>
          </div>
        ))}
      </div>

      {status && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.68)' }}>{status}</div>}
    </section>
  );
}
