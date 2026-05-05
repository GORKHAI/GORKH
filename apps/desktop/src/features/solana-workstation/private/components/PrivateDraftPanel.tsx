import { useState, useCallback } from 'react';
import {
  SolanaPrivateWorkflowKind,
  SolanaPrivateRouteKind,
  SolanaPrivateAssetKind,
  SOLANA_PRIVATE_WORKFLOW_LABELS,
  SOLANA_PRIVATE_ROUTE_LABELS,
  type SolanaPrivateWorkflowDraft,
} from '@gorkh/shared';
import { validatePrivateAssetSymbol, validatePrivateAmount, validateRecipientAddressIfPresent } from '../privateGuards.js';

export function PrivateDraftPanel({
  drafts,
  selectedDraftId,
  onCreate,
  onSelect,
  onRemove,
}: {
  drafts: SolanaPrivateWorkflowDraft[];
  selectedDraftId: string | null;
  onCreate: (input: {
    kind: SolanaPrivateWorkflowKind;
    route: SolanaPrivateRouteKind;
    title: string;
    network: 'localnet' | 'devnet' | 'mainnet-beta';
    assetSymbol: string;
    assetKind: SolanaPrivateAssetKind;
    amountUi?: string;
    recipientLabel?: string;
    recipientAddress?: string;
    purpose?: string;
    notes?: string;
  }) => void;
  onSelect: (draft: SolanaPrivateWorkflowDraft) => void;
  onRemove: (id: string) => void;
}) {
  const [kind, setKind] = useState<SolanaPrivateWorkflowKind>('private_payment_plan');
  const [route, setRoute] = useState<SolanaPrivateRouteKind>('manual_privacy_review_only');
  const [title, setTitle] = useState('');
  const [network, setNetwork] = useState<'localnet' | 'devnet' | 'mainnet-beta'>('devnet');
  const [assetSymbol, setAssetSymbol] = useState('SOL');
  const [assetKind, setAssetKind] = useState<SolanaPrivateAssetKind>('SOL');
  const [amountUi, setAmountUi] = useState('');
  const [recipientLabel, setRecipientLabel] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const symError = validatePrivateAssetSymbol(assetSymbol);
    if (symError) {
      setError(symError);
      return;
    }
    const amtError = validatePrivateAmount(amountUi);
    if (amtError) {
      setError(amtError);
      return;
    }
    const addrError = validateRecipientAddressIfPresent(recipientAddress);
    if (addrError) {
      setError(addrError);
      return;
    }
    onCreate({
      kind,
      route,
      title: title.trim(),
      network,
      assetSymbol: assetSymbol.trim(),
      assetKind,
      amountUi: amountUi.trim() || undefined,
      recipientLabel: recipientLabel.trim() || undefined,
      recipientAddress: recipientAddress.trim() || undefined,
      purpose: purpose.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setAmountUi('');
    setRecipientLabel('');
    setRecipientAddress('');
    setPurpose('');
    setNotes('');
  }, [kind, route, title, network, assetSymbol, assetKind, amountUi, recipientLabel, recipientAddress, purpose, notes, onCreate]);

  const activeDrafts = drafts.filter((d) => d.status !== 'archived_local');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>New Workflow Draft</span>

        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SolanaPrivateWorkflowKind)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        >
          {Object.entries(SOLANA_PRIVATE_WORKFLOW_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={route}
          onChange={(e) => setRoute(e.target.value as SolanaPrivateRouteKind)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        >
          {Object.entries(SOLANA_PRIVATE_ROUTE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        />

        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as typeof network)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        >
          <option value="devnet">Devnet</option>
          <option value="mainnet-beta">Mainnet Beta</option>
          <option value="localnet">Localnet</option>
        </select>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <input
            type="text"
            placeholder="Asset symbol"
            value={assetSymbol}
            onChange={(e) => setAssetSymbol(e.target.value)}
            style={{ flex: 1, padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
          />
          <select
            value={assetKind}
            onChange={(e) => setAssetKind(e.target.value as SolanaPrivateAssetKind)}
            style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
          >
            <option value="SOL">SOL</option>
            <option value="USDC">USDC</option>
            <option value="SPL_TOKEN">SPL Token</option>
            <option value="TOKEN_2022">Token-2022</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Amount (optional)"
          value={amountUi}
          onChange={(e) => setAmountUi(e.target.value)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        />

        <input
          type="text"
          placeholder="Recipient label (optional)"
          value={recipientLabel}
          onChange={(e) => setRecipientLabel(e.target.value)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        />

        <input
          type="text"
          placeholder="Recipient public address (optional)"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontFamily: 'monospace' }}
        />

        <input
          type="text"
          placeholder="Purpose (optional)"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        />

        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', resize: 'vertical' }}
        />

        <button
          onClick={handleCreate}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Create Draft
        </button>

        {error && <span style={{ fontSize: '0.7rem', color: '#991b1b' }}>{error}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
          Drafts ({activeDrafts.length})
        </span>
        {activeDrafts.map((draft) => (
          <div
            key={draft.id}
            onClick={() => onSelect(draft)}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '6px',
              background: selectedDraftId === draft.id ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${selectedDraftId === draft.id ? '#bfdbfe' : '#e2e8f0'}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                {draft.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(draft.id);
                }}
                style={{
                  fontSize: '0.6rem',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {draft.kind} — {draft.route} — {draft.riskLevel}
            </span>
            {draft.blockedReasons.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#92400e' }}>
                {draft.blockedReasons.length} blocked
              </span>
            )}
          </div>
        ))}
        {activeDrafts.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
            No drafts yet. Create one above.
          </span>
        )}
      </div>
    </div>
  );
}
