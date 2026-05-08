import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  GorkhAgentCloakDraftHandoff,
  SolanaWalletWorkspaceState,
  SolanaWalletReadOnlySnapshot,
  SolanaWalletProfile,
} from '@gorkh/shared';
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
import { LocalWalletVaultPanel } from '../local-vault/components/LocalWalletVaultPanel.js';
import {
  loadLocalWalletProfiles,
  loadSelectedLocalWalletId,
  saveLocalWalletProfiles,
  saveSelectedLocalWalletId,
} from '../local-vault/localWalletVaultStorage.js';
import { CloakWalletPanel } from '../cloak/components/CloakWalletPanel.js';
import { WalletHubDashboard } from '../hub/index.js';
import {
  loadActiveWalletHubProfileId,
  loadWalletHubProfiles,
  mergeWalletHubProfiles,
} from '../hub/index.js';
import { DeFiCommandCenter } from '../defi/index.js';

type WalletTab = 'hub' | 'overview' | 'local' | 'cloak' | 'portfolio' | 'defi' | 'snapshot' | 'send' | 'receive' | 'history' | 'security' | 'connect' | 'markets' | 'context';

const TABS: { id: WalletTab; label: string }[] = [
  { id: 'hub', label: 'Hub' },
  { id: 'overview', label: 'Overview' },
  { id: 'local', label: 'Local Wallet' },
  { id: 'cloak', label: 'Private / Cloak' },
  { id: 'portfolio', label: 'Balances' },
  { id: 'defi', label: 'DeFi' },
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'send', label: 'Send' },
  { id: 'receive', label: 'Receive' },
  { id: 'history', label: 'History / Audit' },
  { id: 'security', label: 'Security' },
  { id: 'connect', label: 'Browser' },
  { id: 'markets', label: 'Markets' },
  { id: 'context', label: 'Context' },
];

export function WalletWorkbench({
  pendingCloakHandoff,
}: {
  pendingCloakHandoff?: GorkhAgentCloakDraftHandoff | null;
}) {
  const [workspace, setWorkspace] = useState<SolanaWalletWorkspaceState>(() =>
    loadWalletWorkspaceState() ?? createEmptyWalletWorkspaceState()
  );
  const [localWallets, setLocalWallets] = useState(() => loadLocalWalletProfiles());
  const [selectedLocalWalletId, setSelectedLocalWalletId] = useState<string | null>(() => loadSelectedLocalWalletId());
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WalletTab>('hub');

  useEffect(() => {
    saveWalletWorkspaceState(workspace);
  }, [workspace]);

  useEffect(() => {
    saveLocalWalletProfiles(localWallets);
  }, [localWallets]);

  useEffect(() => {
    saveSelectedLocalWalletId(selectedLocalWalletId);
  }, [selectedLocalWalletId]);

  useEffect(() => {
    if (pendingCloakHandoff) {
      setActiveTab('cloak');
      if (pendingCloakHandoff.walletId) {
        setSelectedLocalWalletId(pendingCloakHandoff.walletId);
      }
    }
  }, [pendingCloakHandoff]);

  const selectedProfile = useMemo(
    () => workspace.profiles.find((p) => p.id === selectedProfileId) ?? workspace.profiles[0] ?? null,
    [selectedProfileId, workspace.profiles]
  );

  const selectedLocalWallet = useMemo(
    () => localWallets.find((wallet) => wallet.walletId === selectedLocalWalletId) ?? localWallets[0] ?? null,
    [localWallets, selectedLocalWalletId]
  );
  const walletHubProfiles = useMemo(
    () => mergeWalletHubProfiles({
      storedProfiles: loadWalletHubProfiles(),
      walletProfiles: workspace.profiles,
      localWallets,
    }),
    [localWallets, workspace.profiles]
  );
  const activeWalletHubProfileId = loadActiveWalletHubProfileId();

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
      className="gorkh-premium-workbench gorkh-wallet-workbench"
      style={{
        display: activeTab === 'hub' ? 'grid' : 'flex',
        gridTemplateRows: activeTab === 'hub' ? 'auto auto auto minmax(0, 1fr) auto' : undefined,
        flexDirection: activeTab === 'hub' ? undefined : 'column',
        gap: activeTab === 'hub' ? '0.6rem' : '1rem',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          GORKH Wallet
        </h3>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#475569' }}>
        Local non-custodial wallet foundation with OS keychain storage, read-only snapshots, Markets wallet context, and Cloak private wallet integration.
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
        Private keys stay in the OS keychain. Agent and Assistant can draft, but cannot sign or execute. Cloak execution remains approval-gated and blocked until the secure signer path is complete.
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

      {activeTab === 'overview' && (
        <div style={{ maxWidth: '760px', display: 'grid', gap: '1rem' }}>
          <WalletOverviewPanel
            profiles={workspace.profiles}
            selectedProfileId={selectedProfile?.id ?? null}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onRemoveProfile={handleRemoveProfile}
          />
          <div className="gorkh-assistant-panel" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.62)' }}>
            This wallet can be used across Wallet, Markets, and Agent workflows. Markets receives public address context only; Agent can draft actions but cannot sign or execute.
          </div>
        </div>
      )}

      {activeTab === 'hub' && (
        <WalletHubDashboard
          walletProfiles={workspace.profiles}
          localWallets={localWallets}
          readOnlySnapshots={workspace.readOnlySnapshots}
          onSnapshot={handleSnapshot}
        />
      )}

      {activeTab === 'local' && (
        <div style={{ maxWidth: '760px' }}>
          <LocalWalletVaultPanel
            wallets={localWallets}
            selectedWalletId={selectedLocalWallet?.walletId ?? null}
            onWalletsChange={setLocalWallets}
            onSelectWallet={setSelectedLocalWalletId}
          />
        </div>
      )}

      {activeTab === 'cloak' && (
        <div style={{ maxWidth: '760px' }}>
          <CloakWalletPanel
            selectedWallet={selectedLocalWallet}
            pendingHandoff={pendingCloakHandoff}
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

      {activeTab === 'defi' && (
        <DeFiCommandCenter
          profiles={walletHubProfiles}
          activeProfileId={activeWalletHubProfileId}
          initialScope="active_wallet"
        />
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

      {activeTab === 'markets' && (
        <div style={{ maxWidth: '640px' }}>
          <MarketsAccessPanel selectedProfile={selectedProfile} onAddToMarkets={handleAddToMarkets} />
          <div className="gorkh-assistant-panel" style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.62)' }}>
            Use selected local wallet for future trading — planned. Market trade execution is disabled in this phase.
          </div>
        </div>
      )}

      {activeTab === 'context' && (
        <div style={{ maxWidth: '640px' }}>
          <WalletContextPanel summary={contextSummary} />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ maxWidth: '640px', display: 'grid', gap: '1rem' }}>
          <PrivacyRoutesPanel />
          <div className="gorkh-assistant-panel" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.62)' }}>
            Cloak audit history will show safe transaction summaries, request IDs, and signatures only. It must never include note secrets, viewing keys, or wallet secret material.
          </div>
        </div>
      )}

      {activeTab === 'security' && (
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
        GORKH Wallet v0.7 — local wallet vault, Cloak SDK configuration, metadata-only wallet sharing, read-only snapshots, browser handoff. No autonomous signing, no market execution, no secret export.
      </div>
    </div>
  );
}
