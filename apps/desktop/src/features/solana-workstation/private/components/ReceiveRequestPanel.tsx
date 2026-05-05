import { useState, useCallback } from 'react';
import type { SolanaPrivateReceiveRequest } from '@gorkh/shared';

export function ReceiveRequestPanel({
  requests,
  onCreate,
}: {
  requests: SolanaPrivateReceiveRequest[];
  onCreate: (label: string, asset: string, amount?: string, address?: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [asset, setAsset] = useState('SOL');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!label.trim()) return;
    onCreate(label.trim(), asset.trim(), amount.trim() || undefined, address.trim() || undefined);
    setLabel('');
    setAmount('');
    setAddress('');
  }, [label, asset, amount, address, onCreate]);

  const handleCopy = useCallback((req: SolanaPrivateReceiveRequest) => {
    navigator.clipboard.writeText(req.payloadJson).then(() => {
      setCopiedId(req.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
          Create Receive Request
        </span>
        <input
          type="text"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
          }}
        />
        <input
          type="text"
          placeholder="Asset symbol"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
          }}
        />
        <input
          type="text"
          placeholder="Amount (optional)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
          }}
        />
        <input
          type="text"
          placeholder="Your public address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!label.trim()}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: !label.trim() ? '#cbd5e1' : '#0f172a',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: !label.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Create Receive Request
        </button>
      </div>

      {requests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
            Receive Requests ({requests.length})
          </span>
          {requests.map((req) => (
            <div
              key={req.id}
              style={{
                padding: '0.5rem 0.6rem',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  {req.label}
                </span>
                <button
                  onClick={() => handleCopy(req)}
                  style={{
                    fontSize: '0.6rem',
                    padding: '0.15rem 0.35rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: copiedId === req.id ? '#dcfce7' : '#fff',
                    color: copiedId === req.id ? '#166534' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === req.id ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {req.requestedAssetSymbol} {req.requestedAmountUi ?? ''} — {req.route}
              </span>
              {req.safetyNotes.map((note, i) => (
                <span key={i} style={{ fontSize: '0.65rem', color: '#92400e' }}>
                  {note}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
