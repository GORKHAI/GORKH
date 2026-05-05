import { useState, useCallback } from 'react';
import {
  SolanaWalletProfileStatus,
  SolanaWalletRouteKind,
  type SolanaWalletProfile,
  type SolanaRpcNetwork,
} from '@gorkh/shared';

export function WalletOverviewPanel({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
  onRemoveProfile,
}: {
  profiles: SolanaWalletProfile[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (input: {
    label: string;
    publicAddress?: string;
    network: SolanaRpcNetwork;
    preferredPrivateRoute: SolanaWalletRouteKind;
    notes?: string;
    tags?: string[];
  }) => void;
  onRemoveProfile: (id: string) => void;
}) {
  const [form, setForm] = useState<{
    label: string;
    publicAddress: string;
    network: SolanaRpcNetwork;
    preferredPrivateRoute: SolanaWalletRouteKind;
    notes: string;
    tags: string;
  }>({
    label: '',
    publicAddress: '',
    network: 'devnet',
    preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    notes: '',
    tags: '',
  });

  const handleSubmit = useCallback(() => {
    if (!form.label.trim()) return;
    onCreateProfile({
      label: form.label,
      publicAddress: form.publicAddress || undefined,
      network: form.network,
      preferredPrivateRoute: form.preferredPrivateRoute,
      notes: form.notes || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setForm({
      label: '',
      publicAddress: '',
      network: 'devnet',
      preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
      notes: '',
      tags: '',
    });
  }, [form, onCreateProfile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(226,232,240,0.6)',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Wallet Profiles</span>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          Create local wallet profiles. No private keys or seed phrases are stored.
        </p>
      </div>

      {profiles.length === 0 && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            fontSize: '0.85rem',
            color: '#94a3b8',
          }}
        >
          No wallet profiles yet. Create one below.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => onSelectProfile(profile.id)}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: `1px solid ${selectedProfileId === profile.id ? '#0f172a' : '#e2e8f0'}`,
              background: selectedProfileId === profile.id ? '#f1f5f9' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{profile.label}</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: profile.status === SolanaWalletProfileStatus.ADDRESS_ONLY ? '#dcfce7' : '#f1f5f9',
                  color: profile.status === SolanaWalletProfileStatus.ADDRESS_ONLY ? '#166534' : '#475569',
                  border: '1px solid #e2e8f0',
                }}
              >
                {profile.status.replace(/_/g, ' ')}
              </span>
            </div>
            {profile.publicAddress && (
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                {profile.publicAddress}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {profile.network} — {profile.preferredPrivateRoute}
            </span>
            {profile.tags.length > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tags: {profile.tags.join(', ')}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveProfile(profile.id);
              }}
              style={{
                alignSelf: 'flex-start',
                marginTop: '0.3rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        ))}
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
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>New Profile</span>
        <input
          placeholder="Label (required)"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <input
          placeholder="Public address (optional)"
          value={form.publicAddress}
          onChange={(e) => setForm((f) => ({ ...f, publicAddress: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <select
          value={form.network}
          onChange={(e) => setForm((f) => ({ ...f, network: e.target.value as SolanaRpcNetwork }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        >
          <option value="devnet">devnet</option>
          <option value="mainnet-beta">mainnet-beta</option>
          <option value="localnet">localnet</option>
        </select>
        <select
          value={form.preferredPrivateRoute}
          onChange={(e) => setForm((f) => ({ ...f, preferredPrivateRoute: e.target.value as SolanaWalletRouteKind }))}
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
          placeholder="Tags (comma separated)"
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!form.label.trim()}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            border: 'none',
            background: form.label.trim() ? '#0f172a' : '#cbd5e1',
            color: form.label.trim() ? '#fff' : '#64748b',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: form.label.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Create Profile
        </button>
      </div>
    </div>
  );
}
