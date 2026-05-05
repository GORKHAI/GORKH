import { useState, useCallback, useEffect, useMemo } from 'react';
import type { SolanaWalletWorkspaceState, SolanaWalletReadOnlySnapshot, SolanaWalletProfile } from '@gorkh/shared';
import {
  SolanaWalletRouteKind,
  SolanaWalletAssetKind,
} from '@gorkh/shared';
import {
  loadWalletWorkspaceState,
  saveWalletWorkspaceState,
  createEmptyWalletWorkspaceState,
} from '../walletStorage.js';
import { createWalletProfile } from '../createWalletProfile.js';
import { createWalletReceiveRequest } from '../createWalletReceiveRequest.js';
import { createWalletSendDraft } from '../createWalletSendDraft.js';
import { createWalletContextSummary } from '../createWalletContextSummary.js';
import { WalletOverviewPanel } from './WalletOverviewPanel.js';
import { PrivateReceivePanel } from './PrivateReceivePanel.js';
import { PrivateSendPanel } from './PrivateSendPanel.js';
import { PrivacyRoutesPanel } from './PrivacyRoutesPanel.js';
import { MarketsAccessPanel } from './MarketsAccessPanel.js';
import { WalletContextPanel } from './WalletContextPanel.js';
import { WalletSafetyPanel } from './WalletSafetyPanel.js';
import { WalletSnapshotPanel } from './WalletSnapshotPanel.js';
import { WalletRpcSettingsPanel } from './WalletRpcSettingsPanel.js';
import { buildMarketsWatchlistItemFromWalletProfile } from '../walletBridge.js';
import {
  loadMarketsWorkspaceState,
  saveMarketsWorkspaceState,
  createEmptyMarketsWorkspaceState,
} from '../../markets/marketsStorage.js';
import { ExternalWalletPanel } from '../connection/index.js';
import { WalletHandoffPanel } from '../handoff/components/WalletHandoffPanel.js';
import { WalletPortfolioPanel } from '../portfolio/components/WalletPortfolioPanel.js';

type WalletTab = 'wallet' | 'connect' | 'portfolio' | 'snapshot' | 'receive' | 'send' | 'routes' | 'markets' | 'context' | 'safety';

const TABS: { id: WalletTab; label: string }[] = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'connect', label: 'Connect' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'receive', label: 'Receive' },
  { id: 'send', label: 'Send' },
  { id: 'routes', label: 'Routes' },
  { id: 'markets', label: 'Markets Access' },
  { id: 'context', label: 'Context' },
  { id: 'safety', label: 'Safety' },
];

export function WalletWorkbench() {
  const [workspace, setWorkspace] = useState<SolanaWalletWorkspaceState>(() =>
    loadWalletWorkspaceState() ?? createEmptyWalletWorkspaceState()
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WalletTab>('wallet');

  useEffect(() => {
    saveWalletWorkspaceState(workspace);
  }, [workspace]);

  const selectedProfile = useMemo(
    () => workspace.profiles.find((p) => p.id === selectedProfileId) ?? workspace.profiles[0] ?? null,
    [selectedProfileId, workspace.profiles]
  );

  const contextSummary = useMemo(
    () => createWalletContextSummary(workspace, selectedProfile?.network ?? 'devnet', selectedProfile?.id),
    [workspace, selectedProfile]
  );

  const handleCreateProfile = useCallback(
    (input: {
      label: string;
      publicAddress?: string;
      network: 'localnet' | 'devnet' | 'mainnet-beta';
      preferredPrivateRoute: SolanaWalletRouteKind;
      notes?: string;
      tags?: string[];
    }) => {
      const profile = createWalletProfile(input);
      setWorkspace((prev) => ({
        ...prev,
        profiles: [...prev.profiles, profile],
        updatedAt: Date.now(),
      }));
      setSelectedProfileId(profile.id);
    },
    []
  );

  const handleSelectProfile = useCallback((id: string) => {
    setSelectedProfileId(id);
  }, []);

  const handleRemoveProfile = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      profiles: prev.profiles.filter((p) => p.id !== id),
      updatedAt: Date.now(),
    }));
    setSelectedProfileId((sid) => (sid === id ? null : sid));
  }, []);

  const handleCreateReceiveRequest = useCallback(
    (input: {
      route: SolanaWalletRouteKind;
      requestedAssetSymbol: string;
      requestedAmountUi?: string;
      label?: string;
      purpose?: string;
    }) => {
      if (!selectedProfile) return;
      const req = createWalletReceiveRequest({
        walletProfile: selectedProfile,
        route: input.route,
        requestedAssetSymbol: input.requestedAssetSymbol,
        requestedAmountUi: input.requestedAmountUi,
        label: input.label,
        purpose: input.purpose,
      });
      setWorkspace((prev) => ({
        ...prev,
        receiveRequests: [...prev.receiveRequests, req],
        updatedAt: Date.now(),
      }));
    },
    [selectedProfile]
  );

  const handleCreateSendDraft = useCallback(
    (input: {
      route: SolanaWalletRouteKind;
      assetSymbol: string;
      assetKind: SolanaWalletAssetKind;
      amountUi: string;
      recipientAddressOrLabel: string;
      memoPolicy?: 'no_memo' | 'local_note_only';
    }) => {
      if (!selectedProfile) return;
      const draft = createWalletSendDraft({
        walletProfile: selectedProfile,
        route: input.route,
        assetSymbol: input.assetSymbol,
        assetKind: input.assetKind,
        amountUi: input.amountUi,
        recipientAddressOrLabel: input.recipientAddressOrLabel,
        memoPolicy: input.memoPolicy,
      });
      setWorkspace((prev) => ({
        ...prev,
        sendDrafts: [...prev.sendDrafts, draft],
        updatedAt: Date.now(),
      }));
    },
    [selectedProfile]
  );

  const handleSnapshot = useCallback((snapshot: SolanaWalletReadOnlySnapshot) => {
    setWorkspace((prev) => {
      // Keep max 20 snapshots, replace if same wallet profile
      const others = prev.readOnlySnapshots.filter((s) => s.walletProfileId !== snapshot.walletProfileId);
      const updated = [snapshot, ...others].slice(0, 20);
      return {
        ...prev,
        readOnlySnapshots: updated,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleAddToMarkets = useCallback(
    (profile: SolanaWalletProfile) => {
      const item = buildMarketsWatchlistItemFromWalletProfile(profile);
      if (!item) return;

      const marketsState = loadMarketsWorkspaceState() ?? createEmptyMarketsWorkspaceState();
      const exists = marketsState.watchlist.some((w) => w.id === item.id);
      if (exists) {
        // eslint-disable-next-line no-console
        console.log('[GORKH Wallet] Markets watchlist item already exists:', item.id);
        return;
      }

      const updated = {
        ...marketsState,
        watchlist: [...marketsState.watchlist, item],
        updatedAt: Date.now(),
      };
      saveMarketsWorkspaceState(updated);
      // eslint-disable-next-line no-console
      console.log('[GORKH Wallet] Added to Markets watchlist:', item.id);
    },
    []
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          GORKH Wallet
        </h3>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#475569' }}>
        Address-only wallet profiles with read-only RPC snapshots and Markets watchlist bridge.
      </p>

      <div
        style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: '0.78rem',
          color: '#991b1b',
        }}
      >
        Wallet shell only. No private transfer, signing, swap, or trading execution is available in this phase.
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          paddingBottom: '0.25rem',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab.id ? '#0f172a' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'wallet' && (
        <div style={{ maxWidth: '640px' }}>
          <WalletOverviewPanel
            profiles={workspace.profiles}
            selectedProfileId={selectedProfile?.id ?? null}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onRemoveProfile={handleRemoveProfile}
          />
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div style={{ maxWidth: '640px' }}>
          <WalletPortfolioPanel
            profile={selectedProfile}
            snapshot={
              workspace.readOnlySnapshots.find((s) => s.walletProfileId === selectedProfile?.id) ?? null
            }
            onOpenMarkets={() => {
              // Switch to markets tab within wallet
              setActiveTab('markets');
            }}
          />
        </div>
      )}

      {activeTab === 'connect' && (
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <WalletHandoffPanel
            runtimeHttpBase="http://localhost:3000"
            onProfileCreated={(profile) => {
              setWorkspace((prev) => ({
                ...prev,
                profiles: [...prev.profiles, profile],
                updatedAt: Date.now(),
              }));
              setSelectedProfileId(profile.id);
            }}
          />
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: '1rem' }}>
            <ExternalWalletPanel
              onProfileCreated={(profile) => {
                setWorkspace((prev) => ({
                  ...prev,
                  profiles: [...prev.profiles, profile],
                  updatedAt: Date.now(),
                }));
                setSelectedProfileId(profile.id);
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'snapshot' && (
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <WalletRpcSettingsPanel
            endpoint={{
              network: selectedProfile?.network ?? 'devnet',
              url: 'https://api.devnet.solana.com',
              label: 'Solana Devnet',
              isCustom: false,
            }}
            onChange={() => {}}
          />
          <WalletSnapshotPanel
            profile={selectedProfile}
            snapshot={
              workspace.readOnlySnapshots.find((s) => s.walletProfileId === selectedProfile?.id) ?? null
            }
            onSnapshot={handleSnapshot}
            onAddToMarkets={() => {
              if (!selectedProfile) return;
              handleAddToMarkets(selectedProfile);
            }}
          />
        </div>
      )}

      {activeTab === 'receive' && (
        <div style={{ maxWidth: '640px' }}>
          <PrivateReceivePanel
            selectedProfile={selectedProfile}
            receiveRequests={workspace.receiveRequests}
            onCreate={handleCreateReceiveRequest}
          />
        </div>
      )}

      {activeTab === 'send' && (
        <div style={{ maxWidth: '640px' }}>
          <PrivateSendPanel
            selectedProfile={selectedProfile}
            sendDrafts={workspace.sendDrafts}
            onCreate={handleCreateSendDraft}
          />
        </div>
      )}

      {activeTab === 'routes' && (
        <div style={{ maxWidth: '640px' }}>
          <PrivacyRoutesPanel />
        </div>
      )}

      {activeTab === 'markets' && (
        <div style={{ maxWidth: '640px' }}>
          <MarketsAccessPanel selectedProfile={selectedProfile} onAddToMarkets={handleAddToMarkets} />
        </div>
      )}

      {activeTab === 'context' && (
        <div style={{ maxWidth: '640px' }}>
          <WalletContextPanel summary={contextSummary} />
        </div>
      )}

      {activeTab === 'safety' && (
        <div style={{ maxWidth: '640px' }}>
          <WalletSafetyPanel />
        </div>
      )}

      <div
        style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.7rem',
          color: '#94a3b8',
        }}
      >
        GORKH Wallet v0.6 — Portfolio view, Markets sync, browser wallet handoff, address-only profiles, read-only RPC snapshots. No signing or trading execution.
      </div>
    </div>
  );
}
