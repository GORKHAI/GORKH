import { useState, useCallback } from 'react';
import {
  SolanaWalletRouteKind,
  SolanaWalletAssetKind,
  type SolanaWalletProfile,
  type SolanaWalletSendDraft,
} from '@gorkh/shared';

export function PrivateSendPanel({
  selectedProfile,
  sendDrafts,
  onCreate,
}: {
  selectedProfile: SolanaWalletProfile | null;
  sendDrafts: SolanaWalletSendDraft[];
  onCreate: (input: {
    route: SolanaWalletRouteKind;
    assetSymbol: string;
    assetKind: SolanaWalletAssetKind;
    amountUi: string;
    recipientAddressOrLabel: string;
    memoPolicy?: 'no_memo' | 'local_note_only';
  }) => void;
}) {
  const [form, setForm] = useState<{
    assetSymbol: string;
    assetKind: SolanaWalletAssetKind;
    amount: string;
    recipient: string;
    memoPolicy: 'no_memo' | 'local_note_only';
    route: SolanaWalletRouteKind;
  }>({
    assetSymbol: 'USDC',
    assetKind: SolanaWalletAssetKind.USDC,
    amount: '',
    recipient: '',
    memoPolicy: 'no_memo',
    route: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
  });

  const handleSubmit = useCallback(() => {
    if (!selectedProfile) return;
    if (!form.assetSymbol.trim() || !form.amount.trim() || !form.recipient.trim()) return;
    onCreate({
      route: form.route,
      assetSymbol: form.assetSymbol,
      assetKind: form.assetKind,
      amountUi: form.amount,
      recipientAddressOrLabel: form.recipient,
      memoPolicy: form.memoPolicy,
    });
    setForm({
      assetSymbol: 'USDC',
      assetKind: SolanaWalletAssetKind.USDC,
      amount: '',
      recipient: '',
      memoPolicy: 'no_memo',
      route: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    });
  }, [selectedProfile, form, onCreate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!selectedProfile && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            fontSize: '0.85rem',
            color: '#92400e',
          }}
        >
          Select or create a wallet profile in the Wallet tab first.
        </div>
      )}

      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.8rem',
          color: '#991b1b',
        }}
      >
        <strong>Send is blocked.</strong> Wallet connection, signing, and execution are disabled in
        GORKH Wallet v0.1. Drafts are for planning only.
      </div>

      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>New Send Draft</span>
        <select
          value={form.route}
          onChange={(e) => setForm((f) => ({ ...f, route: e.target.value as SolanaWalletRouteKind }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        >
          <option value={SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY}>Manual Privacy Review Only</option>
          <option value={SolanaWalletRouteKind.UMBRA_PLANNED}>Umbra Planned</option>
          <option value={SolanaWalletRouteKind.CLOAK_PLANNED}>Cloak Planned</option>
          <option value={SolanaWalletRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED}>
            Token-2022 Confidential Transfers Planned
          </option>
        </select>
        <select
          value={form.assetKind}
          onChange={(e) => {
            const kind = e.target.value as SolanaWalletAssetKind;
            setForm((f) => ({ ...f, assetKind: kind, assetSymbol: kind === 'SOL' ? 'SOL' : kind === 'USDC' ? 'USDC' : f.assetSymbol }));
          }}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        >
          <option value={SolanaWalletAssetKind.SOL}>SOL</option>
          <option value={SolanaWalletAssetKind.USDC}>USDC</option>
          <option value={SolanaWalletAssetKind.SPL_TOKEN}>SPL Token</option>
          <option value={SolanaWalletAssetKind.TOKEN_2022}>Token-2022</option>
        </select>
        <input
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <input
          placeholder="Recipient address or label"
          value={form.recipient}
          onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <select
          value={form.memoPolicy}
          onChange={(e) => setForm((f) => ({ ...f, memoPolicy: e.target.value as 'no_memo' | 'local_note_only' }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        >
          <option value="no_memo">No memo</option>
          <option value="local_note_only">Local note only (not on-chain)</option>
        </select>
        <button
          onClick={handleSubmit}
          disabled={!selectedProfile || !form.amount.trim() || !form.recipient.trim()}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            border: 'none',
            background: selectedProfile && form.amount.trim() && form.recipient.trim() ? '#0f172a' : '#cbd5e1',
            color: selectedProfile && form.amount.trim() && form.recipient.trim() ? '#fff' : '#64748b',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: selectedProfile && form.amount.trim() && form.recipient.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Create Send Draft
        </button>
      </div>

      {sendDrafts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Send Drafts</span>
          {sendDrafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                padding: '0.6rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                color: '#475569',
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {draft.assetSymbol} {draft.amountUi} → {draft.recipientAddressOrLabel}
              </div>
              <div>
                {draft.route} — Risk: {draft.riskLevel}
              </div>
              {draft.blockedReasons.length > 0 && (
                <div style={{ color: '#92400e', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                  Blocked: {draft.blockedReasons.length} reason(s)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
