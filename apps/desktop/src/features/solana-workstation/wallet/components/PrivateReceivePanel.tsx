import { useState, useCallback } from 'react';
import {
  SolanaWalletRouteKind,
  type SolanaWalletProfile,
  type SolanaWalletReceiveRequest,
} from '@gorkh/shared';

export function PrivateReceivePanel({
  selectedProfile,
  receiveRequests,
  onCreate,
}: {
  selectedProfile: SolanaWalletProfile | null;
  receiveRequests: SolanaWalletReceiveRequest[];
  onCreate: (input: {
    route: SolanaWalletRouteKind;
    requestedAssetSymbol: string;
    requestedAmountUi?: string;
    label?: string;
    purpose?: string;
  }) => void;
}) {
  const [form, setForm] = useState<{
    asset: string;
    amount: string;
    label: string;
    purpose: string;
    route: SolanaWalletRouteKind;
  }>({
    asset: 'USDC',
    amount: '',
    label: '',
    purpose: '',
    route: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
  });

  const handleSubmit = useCallback(() => {
    if (!selectedProfile) return;
    if (!form.asset.trim()) return;
    onCreate({
      route: form.route,
      requestedAssetSymbol: form.asset,
      requestedAmountUi: form.amount || undefined,
      label: form.label || undefined,
      purpose: form.purpose || undefined,
    });
    setForm({
      asset: 'USDC',
      amount: '',
      label: '',
      purpose: '',
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

      {selectedProfile && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(226,232,240,0.6)',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            Receive to: {selectedProfile.label}
          </span>
          {selectedProfile.publicAddress && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.2rem' }}>
              {selectedProfile.publicAddress}
            </div>
          )}
        </div>
      )}

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
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>New Receive Request</span>
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
        <input
          placeholder="Asset symbol (e.g. USDC)"
          value={form.asset}
          onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <input
          placeholder="Amount (optional)"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <input
          placeholder="Label (optional)"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <input
          placeholder="Purpose (optional)"
          value={form.purpose}
          onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!selectedProfile || !form.asset.trim()}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            border: 'none',
            background: selectedProfile && form.asset.trim() ? '#0f172a' : '#cbd5e1',
            color: selectedProfile && form.asset.trim() ? '#fff' : '#64748b',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: selectedProfile && form.asset.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Create Receive Request
        </button>
      </div>

      {receiveRequests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Receive Requests</span>
          {receiveRequests.map((req) => (
            <div
              key={req.id}
              style={{
                padding: '0.6rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                color: '#475569',
              }}
            >
              <div style={{ fontWeight: 600 }}>{req.label}</div>
              <div>
                {req.requestedAssetSymbol} {req.requestedAmountUi ?? ''} — {req.route}
              </div>
              {req.recipientPublicAddress && (
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {req.recipientPublicAddress}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
