import { useEffect, useMemo, useState } from 'react';
import type {
  CloakDepositDraft,
  CloakNoteMetadata,
  GorkhAgentCloakDraftHandoff,
  LocalWalletProfile,
} from '@gorkh/shared';
import {
  GORKH_CLOAK_CIRCUITS_BASE_URL,
  GORKH_CLOAK_FIXED_FEE_LAMPORTS,
  GORKH_CLOAK_MERKLE_TREE_HEIGHT,
  GORKH_CLOAK_MIN_SOL_DEPOSIT_LAMPORTS,
  GORKH_CLOAK_PROGRAM_ID,
  GORKH_CLOAK_PROOF_BYTES,
  GORKH_CLOAK_PUBLIC_INPUT_BYTES,
  GORKH_CLOAK_RELAY_URL,
  GORKH_CLOAK_SUPPORTED_ASSETS,
} from '../cloakConfig.js';
import { getCloakSdkStatus, type CloakSdkStatus } from '../cloakClient.js';
import { createCloakPrivateSendDraft } from '../cloakGuards.js';
import {
  calculateCloakSolDepositFees,
  executeCloakDepositWithSignerBridge,
  listCloakNotes,
  prepareCloakDeposit,
  type CloakDepositProgressUpdate,
} from '../cloakDeposit.js';

export function CloakWalletPanel({
  selectedWallet,
  pendingHandoff,
}: {
  selectedWallet: LocalWalletProfile | null;
  pendingHandoff?: GorkhAgentCloakDraftHandoff | null;
}) {
  const [sdkStatus, setSdkStatus] = useState<CloakSdkStatus | null>(null);
  const [asset, setAsset] = useState('SOL');
  const [recipient, setRecipient] = useState('');
  const [amountBaseUnits, setAmountBaseUnits] = useState('');
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [depositLamports, setDepositLamports] = useState('');
  const [depositApprovalConfirmed, setDepositApprovalConfirmed] = useState(false);
  const [depositDraft, setDepositDraft] = useState<CloakDepositDraft | null>(null);
  const [depositStatus, setDepositStatus] = useState<'idle' | 'preparing' | 'ready' | 'submitting' | 'confirmed' | 'failed'>('idle');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositProgress, setDepositProgress] = useState<CloakDepositProgressUpdate[]>([]);
  const [notes, setNotes] = useState<CloakNoteMetadata[]>([]);

  useEffect(() => {
    void getCloakSdkStatus().then(setSdkStatus);
  }, []);

  useEffect(() => {
    if (!selectedWallet) {
      setNotes([]);
      return;
    }
    void listCloakNotes(selectedWallet.walletId).then(setNotes).catch(() => setNotes([]));
  }, [selectedWallet]);

  useEffect(() => {
    if (!pendingHandoff) return;
    if (pendingHandoff.asset) setAsset(pendingHandoff.asset);
    if (pendingHandoff.recipient) setRecipient(pendingHandoff.recipient);
    if (pendingHandoff.amountLamports) {
      if (pendingHandoff.draftKind === 'cloak_deposit') {
        setDepositLamports(pendingHandoff.amountLamports);
      } else {
        setAmountBaseUnits(pendingHandoff.amountLamports);
      }
    }
    setApprovalConfirmed(false);
    setDepositApprovalConfirmed(false);
  }, [pendingHandoff]);

  const draft = useMemo(
    () =>
      createCloakPrivateSendDraft({
        asset,
        recipient,
        amountBaseUnits,
        approvalConfirmed,
        walletUnlocked: selectedWallet?.securityStatus === 'unlocked',
      }),
    [approvalConfirmed, amountBaseUnits, asset, recipient, selectedWallet?.securityStatus]
  );

  const depositFeePreview = useMemo(() => {
    if (!/^[0-9]+$/.test(depositLamports.trim())) return null;
    return calculateCloakSolDepositFees(depositLamports.trim());
  }, [depositLamports]);

  const depositBlockedReasons = useMemo(() => {
    const reasons: string[] = [];
    const trimmed = depositLamports.trim();
    if (!selectedWallet) reasons.push('Select a local wallet before preparing a Cloak deposit.');
    if (selectedWallet && selectedWallet.securityStatus !== 'unlocked') reasons.push('Unlock the selected local wallet first.');
    if (!/^[0-9]+$/.test(trimmed)) reasons.push('Amount must be an integer lamport string.');
    if (/^[0-9]+$/.test(trimmed) && BigInt(trimmed) < BigInt(GORKH_CLOAK_MIN_SOL_DEPOSIT_LAMPORTS)) {
      reasons.push(`Minimum SOL deposit is ${GORKH_CLOAK_MIN_SOL_DEPOSIT_LAMPORTS} lamports.`);
    }
    if (!depositApprovalConfirmed) reasons.push('Confirm the one-time local approval checklist.');
    return reasons;
  }, [depositApprovalConfirmed, depositLamports, selectedWallet]);

  async function handlePrepareDeposit(): Promise<void> {
    if (!selectedWallet || depositBlockedReasons.length > 0) return;
    setDepositStatus('preparing');
    setDepositError(null);
    setDepositProgress([{ stage: 'creating_utxo', label: 'Preparing approval-bound deposit draft' }]);
    try {
      const prepared = await prepareCloakDeposit({
        walletId: selectedWallet.walletId,
        amountLamports: depositLamports.trim(),
        asset: 'SOL',
        network: 'mainnet',
      });
      setDepositDraft(prepared);
      setDepositStatus('ready');
    } catch (error) {
      setDepositDraft(null);
      setDepositStatus('failed');
      setDepositError(error instanceof Error ? error.message : 'Failed to prepare Cloak deposit.');
    }
  }

  async function handleExecuteDeposit(): Promise<void> {
    if (!depositDraft || !depositApprovalConfirmed) return;
    setDepositStatus('submitting');
    setDepositError(null);
    setDepositProgress([{ stage: 'submitting', label: 'Starting approved Cloak deposit session' }]);
    try {
      const note = await executeCloakDepositWithSignerBridge(depositDraft, (update) => {
        setDepositProgress((existing) => [...existing.slice(-7), update]);
      });
      setNotes((existing) => [note, ...existing.filter((item) => item.noteId !== note.noteId)]);
      setDepositStatus('confirmed');
    } catch (error) {
      setDepositStatus('failed');
      setDepositError(error instanceof Error ? error.message : 'Cloak deposit failed.');
    }
  }

  return (
    <section className="gorkh-assistant-panel" style={{ display: 'grid', gap: '0.85rem' }}>
      <div>
        <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.92)' }}>Cloak Private Wallet</h4>
        <p style={{ margin: '0.35rem 0 0', color: 'rgba(255,255,255,0.62)', fontSize: '0.8rem' }}>
          Deposit-first private wallet track. Local wallet keys stay in Rust keychain storage; the webview receives only public metadata and approval-bound drafts.
        </p>
      </div>

      {pendingHandoff && (
        <div
          data-testid="cloak-agent-handoff-prefill"
          className="gorkh-inspector-card"
          style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem' }}
        >
          GORKH Agent prefilled a {pendingHandoff.draftKind} draft. Review every field here;
          no Cloak proof, signer bridge, or transaction runs until you approve inside Wallet.
        </div>
      )}

      <div className="gorkh-inspector-card" style={{ padding: '0.75rem', display: 'grid', gap: '0.35rem', fontSize: '0.76rem', color: 'rgba(255,255,255,0.62)' }}>
        <div><strong>Program:</strong> {GORKH_CLOAK_PROGRAM_ID}</div>
        <div><strong>Relay:</strong> {GORKH_CLOAK_RELAY_URL}</div>
        <div><strong>Circuits:</strong> {GORKH_CLOAK_CIRCUITS_BASE_URL}</div>
        <div><strong>Tree:</strong> height {GORKH_CLOAK_MERKLE_TREE_HEIGHT}; proof {GORKH_CLOAK_PROOF_BYTES} bytes; public inputs {GORKH_CLOAK_PUBLIC_INPUT_BYTES} bytes</div>
        <div><strong>SDK:</strong> {sdkStatus?.installed ? 'installed' : 'checking/unavailable'}; {sdkStatus?.executionMode ?? 'prepared_actions_only'}</div>
      </div>

      <div className="gorkh-inspector-card" style={{ padding: '0.8rem', display: 'grid', gap: '0.7rem' }}>
        <div>
          <h5 style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>Deposit SOL</h5>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.62)', fontSize: '0.78rem' }}>
            Cloak currently uses mainnet defaults. Use tiny test amounts first. Proof generation can take several minutes.
          </p>
        </div>

        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
          Amount lamports
          <input
            value={depositLamports}
            onChange={(event) => {
              setDepositLamports(event.target.value);
              setDepositDraft(null);
            }}
            placeholder={`Minimum ${GORKH_CLOAK_MIN_SOL_DEPOSIT_LAMPORTS}`}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.64)' }}>
          <div className="gorkh-inspector-card" style={{ padding: '0.55rem' }}>Fixed fee<br /><strong>{GORKH_CLOAK_FIXED_FEE_LAMPORTS}</strong></div>
          <div className="gorkh-inspector-card" style={{ padding: '0.55rem' }}>Variable fee<br /><strong>{depositFeePreview?.variableFeeLamports ?? '-'}</strong></div>
          <div className="gorkh-inspector-card" style={{ padding: '0.55rem' }}>Total fee<br /><strong>{depositFeePreview?.totalFeeLamports ?? '-'}</strong></div>
          <div className="gorkh-inspector-card" style={{ padding: '0.55rem' }}>Est. private<br /><strong>{depositFeePreview?.estimatedPrivateAmountLamports ?? '-'}</strong></div>
        </div>

        <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.68)' }}>
          <input
            type="checkbox"
            checked={depositApprovalConfirmed}
            onChange={(event) => setDepositApprovalConfirmed(event.target.checked)}
          /> I approve this exact Wallet UI deposit draft. Agent, Assistant, and Markets cannot execute it.
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="gorkh-workstation-icon-button"
            style={{ width: 'fit-content', padding: '0 0.8rem' }}
            disabled={depositBlockedReasons.length > 0 || depositStatus === 'preparing' || depositStatus === 'submitting'}
            onClick={handlePrepareDeposit}
          >
            {depositStatus === 'preparing' ? 'Preparing...' : 'Prepare Deposit'}
          </button>
          <button
            className="gorkh-workstation-icon-button"
            style={{ width: 'fit-content', padding: '0 0.8rem' }}
            disabled={!depositDraft || !depositApprovalConfirmed || depositStatus === 'submitting'}
            onClick={handleExecuteDeposit}
          >
            {depositStatus === 'submitting' ? 'Running...' : 'Approve & Deposit'}
          </button>
        </div>

        {depositProgress.length > 0 && (
          <div className="gorkh-inspector-card" style={{ padding: '0.7rem', fontSize: '0.74rem', color: 'rgba(255,255,255,0.64)' }}>
            <strong>Progress</strong>
            <ul style={{ margin: '0.45rem 0 0', paddingLeft: '1rem' }}>
              {depositProgress.map((update, index) => (
                <li key={`${update.stage}-${index}`}>
                  {update.label}{typeof update.proofPercent === 'number' ? ` (${Math.round(update.proofPercent)}%)` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {depositStatus === 'confirmed' && (
          <div className="gorkh-inspector-card" style={{ padding: '0.7rem', fontSize: '0.74rem', color: 'rgba(160,255,205,0.82)' }}>
            Deposit confirmed. Secure note metadata was saved to keychain storage.
          </div>
        )}

        {depositDraft && (
          <div className="gorkh-inspector-card" style={{ padding: '0.7rem', fontSize: '0.74rem', color: 'rgba(255,255,255,0.64)' }}>
            Draft: {depositDraft.id}<br />
            Digest: {depositDraft.approvalDigest.slice(0, 12)}...{depositDraft.approvalDigest.slice(-8)}<br />
            Expires: {new Date(depositDraft.expiresAt).toLocaleTimeString()}
          </div>
        )}

        {(depositBlockedReasons.length > 0 || depositError) && (
          <div className="gorkh-inspector-card" style={{ padding: '0.7rem', color: 'rgba(255,255,255,0.68)', fontSize: '0.76rem' }}>
            {depositError && <div>{depositError}</div>}
            {depositBlockedReasons.length > 0 && (
              <ul style={{ margin: depositError ? '0.45rem 0 0' : 0, paddingLeft: '1rem' }}>
                {depositBlockedReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="gorkh-inspector-card" style={{ padding: '0.8rem', display: 'grid', gap: '0.45rem' }}>
        <h5 style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>Private Notes</h5>
        {notes.length === 0 ? (
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.58)', fontSize: '0.78rem' }}>
            No secure Cloak note metadata stored. Raw notes and viewing keys are never shown here.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.noteId} style={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.76rem' }}>
              {note.asset} {note.amountLamports} lamports · {note.status}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.65rem' }}>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
          Asset
          <select value={asset} onChange={(event) => setAsset(event.target.value)}>
            {GORKH_CLOAK_SUPPORTED_ASSETS.map((supported) => (
              <option key={supported} value={supported}>{supported}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
          Recipient
          <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Solana public key" />
        </label>
      </div>

      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.62)' }}>
        Amount in base units
        <input value={amountBaseUnits} onChange={(event) => setAmountBaseUnits(event.target.value)} placeholder="Lamports/base units, integer only" />
      </label>

      <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.68)' }}>
        <input type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} /> I approve preparing this Cloak action locally.
      </label>

      <div className="gorkh-inspector-card" style={{ padding: '0.75rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.64)' }}>
        {selectedWallet ? (
          <div>Selected wallet: {selectedWallet.label} ({selectedWallet.publicAddress.slice(0, 4)}...{selectedWallet.publicAddress.slice(-4)})</div>
        ) : (
          <div>No local wallet selected.</div>
        )}
        <div style={{ marginTop: '0.35rem' }}>Execution status: {draft.canSubmit ? 'ready for future execution command' : 'blocked'}</div>
        {draft.blockedReasons.length > 0 && (
          <ul style={{ margin: '0.45rem 0 0', paddingLeft: '1.1rem' }}>
            {draft.blockedReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}
      </div>

      <button className="gorkh-workstation-icon-button" style={{ width: 'fit-content', padding: '0 0.8rem' }} disabled>
        Private Send deferred until secure note spending is implemented
      </button>
    </section>
  );
}
