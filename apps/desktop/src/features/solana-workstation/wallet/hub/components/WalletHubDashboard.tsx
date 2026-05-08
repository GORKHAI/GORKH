import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WALLET_HUB_LOCKED_ROADMAP,
  WalletHubFilter,
  WalletProfileKind,
  type LocalWalletProfile,
  type SolanaWalletProfile,
  type SolanaWalletReadOnlySnapshot,
  type WalletHubProfile,
} from '@gorkh/shared';
import { getDefaultEndpointConfig } from '../../../rpc/index.js';
import { fetchWalletReadOnlySnapshot } from '../../fetchWalletReadOnlySnapshot.js';
import {
  createConsolidatedPortfolioSummary,
  createPortfolioSnapshot,
  createWalletHubContextSnapshot,
  createWatchOnlyWalletHubProfile,
  filterWalletHubProfiles,
  loadActiveWalletHubProfileId,
  loadPortfolioSnapshots,
  loadWalletHubProfiles,
  mergeWalletHubProfiles,
  profileKindLabel,
  removeWatchOnlyWalletHubProfile,
  saveActiveWalletHubProfileId,
  savePortfolioSnapshots,
  saveWalletHubContextSnapshot,
  saveWalletHubProfiles,
  updateWalletHubProfileLabel,
  updateWalletHubProfileTags,
} from '../index.js';
import { createDeFiPortfolioSummary, walletHubFilterToDeFiScope } from '../../defi/defiPortfolio.js';

const CSS = `
.whub { height: 100%; min-height:0; display:grid; grid-template-rows:42px minmax(0,1fr) 164px; gap:8px; overflow:hidden; color:rgba(255,255,255,0.9); }
.whub-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; }
.whub-brand { display:flex; align-items:center; gap:10px; min-width:0; }
.whub-led { width:9px; height:9px; border-radius:999px; background:#8b5cf6; box-shadow:0 0 16px rgba(139,92,246,0.32); }
.whub-brand h2 { margin:0; font-size:0.98rem; letter-spacing:0; }
.whub-brand p { margin:1px 0 0; color:rgba(255,255,255,0.5); font-size:0.71rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.whub-controls { display:flex; align-items:center; gap:6px; min-width:0; }
.whub-select, .whub-input { min-height:28px; border-radius:6px; border:1px solid rgba(255,255,255,0.13); background:rgba(0,0,0,0.22); color:rgba(255,255,255,0.82); font-size:0.72rem; padding:0 8px; }
.whub-grid { min-height:0; display:grid; grid-template-columns:272px minmax(360px,1fr) 308px; gap:8px; overflow:hidden; }
.whub-bottom { min-height:0; display:grid; grid-template-columns:1.15fr 1fr 1fr; gap:8px; overflow:hidden; }
.whub-panel { min-height:0; display:flex; flex-direction:column; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.11); border-radius:8px; overflow:hidden; }
.whub-pane { min-height:0; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.11); border-radius:8px; overflow:auto; padding:10px; }
.whub-header { min-height:40px; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.09); display:flex; align-items:center; justify-content:space-between; gap:8px; }
.whub-header h3 { margin:0; font-size:0.82rem; }
.whub-scroll { min-height:0; overflow:auto; padding:10px; }
.whub-row { width:100%; text-align:left; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:7px; padding:8px; border:1px solid rgba(255,255,255,0.08); border-radius:7px; background:rgba(0,0,0,0.12); color:rgba(255,255,255,0.72); cursor:pointer; }
.whub-row + .whub-row { margin-top:6px; }
.whub-row-active { border-color:rgba(20,184,166,0.45); background:rgba(20,184,166,0.1); }
.whub-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; font-weight:800; color:rgba(255,255,255,0.88); }
.whub-sub { margin-top:3px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.65rem; color:rgba(255,255,255,0.44); }
.whub-chip { display:inline-flex; align-items:center; min-height:18px; padding:0 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.62); font-size:0.6rem; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.whub-chip-watch { color:#bfdbfe; border-color:rgba(59,130,246,0.42); background:rgba(59,130,246,0.1); }
.whub-chip-locked { color:#fde68a; border-color:rgba(245,158,11,0.42); background:rgba(245,158,11,0.1); }
.whub-button { min-height:28px; border-radius:6px; border:1px solid rgba(255,255,255,0.13); background:rgba(255,255,255,0.055); color:rgba(255,255,255,0.82); font-size:0.7rem; font-weight:750; cursor:pointer; }
.whub-button:hover:not(:disabled) { background:rgba(255,255,255,0.09); color:white; }
.whub-button:disabled { opacity:0.42; cursor:not-allowed; }
.whub-button-primary { background:rgba(20,184,166,0.18); border-color:rgba(20,184,166,0.42); color:#dffef9; }
.whub-form { display:grid; gap:6px; padding:10px; border-top:1px solid rgba(255,255,255,0.08); }
.whub-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.whub-metric { min-height:76px; border:1px solid rgba(255,255,255,0.09); border-radius:7px; padding:9px; background:rgba(0,0,0,0.13); }
.whub-metric span, .whub-eyebrow { display:block; color:rgba(255,255,255,0.44); font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; }
.whub-metric strong { display:block; margin-top:8px; font-size:1rem; color:rgba(255,255,255,0.9); overflow:hidden; text-overflow:ellipsis; }
.whub-token-row, .whub-history-row, .whub-roadmap-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.08); }
.whub-token-row code { color:rgba(255,255,255,0.58); font-size:0.62rem; }
.whub-empty, .whub-note { margin:6px 0 0; color:rgba(255,255,255,0.52); font-size:0.7rem; line-height:1.45; }
.whub-error { color:#fecaca; }
.whub-roadmap-row { opacity:0.62; cursor:not-allowed; }
@media (max-width:1180px) { .whub-grid { grid-template-columns:250px minmax(300px,1fr); } .whub-inspector { display:none; } .whub-bottom { grid-template-columns:1fr 1fr; } }
`;

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function profileToSnapshotProfile(profile: WalletHubProfile): SolanaWalletProfile {
  return {
    id: profile.id,
    label: profile.label,
    publicAddress: profile.publicAddress,
    network: profile.network,
    status: 'address_only',
    preferredPrivateRoute: 'manual_privacy_review_only',
    tags: profile.tags,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    localOnly: true,
    safetyNotes: profile.safetyNotes,
  };
}

export function WalletHubDashboard({
  walletProfiles,
  localWallets,
  readOnlySnapshots,
  onSnapshot,
}: {
  walletProfiles: SolanaWalletProfile[];
  localWallets: LocalWalletProfile[];
  readOnlySnapshots: SolanaWalletReadOnlySnapshot[];
  onSnapshot: (snapshot: SolanaWalletReadOnlySnapshot) => void;
}) {
  const [storedProfiles, setStoredProfiles] = useState<WalletHubProfile[]>(() => loadWalletHubProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => loadActiveWalletHubProfileId());
  const [filter, setFilter] = useState<WalletHubFilter>(WalletHubFilter.ALL_WALLETS);
  const [addressDraft, setAddressDraft] = useState('');
  const [labelDraft, setLabelDraft] = useState('Watch: Wallet');
  const [tagsDraft, setTagsDraft] = useState('watch-only');
  const [message, setMessage] = useState('Wallet Hub is metadata-only and read-only.');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState(() => loadPortfolioSnapshots());

  const profiles = useMemo(
    () => mergeWalletHubProfiles({ storedProfiles, walletProfiles, localWallets }),
    [localWallets, storedProfiles, walletProfiles]
  );

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? null;
  const visibleProfiles = filterWalletHubProfiles(profiles, filter, activeProfile?.id);
  const visibleSnapshots = readOnlySnapshots.filter((snapshot) =>
    visibleProfiles.some((profile) => profile.id === snapshot.walletProfileId)
  );
  const portfolio = useMemo(
    () =>
      createConsolidatedPortfolioSummary({
        profiles: visibleProfiles,
        snapshots: visibleSnapshots,
        loadingIds,
        errors,
        filter,
      }),
    [errors, filter, loadingIds, visibleProfiles, visibleSnapshots]
  );
  const defiPortfolio = useMemo(
    () =>
      createDeFiPortfolioSummary({
        profiles,
        activeProfileId: activeProfile?.id,
        scope: walletHubFilterToDeFiScope(filter),
      }),
    [activeProfile?.id, filter, profiles]
  );

  useEffect(() => {
    saveWalletHubProfiles(storedProfiles);
  }, [storedProfiles]);

  useEffect(() => {
    saveActiveWalletHubProfileId(activeProfile?.id ?? null);
  }, [activeProfile]);

  useEffect(() => {
    const snapshot = createWalletHubContextSnapshot({ profiles, activeProfile, portfolio });
    saveWalletHubContextSnapshot(snapshot);
  }, [activeProfile, portfolio, profiles]);

  const handleAddWatchOnly = useCallback(() => {
    try {
      const profile = createWatchOnlyWalletHubProfile({
        publicAddress: addressDraft,
        label: labelDraft,
        tags: tagsDraft.split(','),
        network: activeProfile?.network ?? 'devnet',
      });
      setStoredProfiles((prev) => [profile, ...prev]);
      setActiveProfileId(profile.id);
      setAddressDraft('');
      setMessage('Watch-only wallet added. It has no signing capability.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to add watch-only wallet.');
    }
  }, [activeProfile?.network, addressDraft, labelDraft, tagsDraft]);

  const handleRefreshProfile = useCallback(
    async (profile: WalletHubProfile) => {
      setLoadingIds((prev) => new Set(prev).add(profile.id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[profile.id];
        return next;
      });
      try {
        const endpoint = getDefaultEndpointConfig(profile.network);
        const result = await fetchWalletReadOnlySnapshot({
          walletProfile: profileToSnapshotProfile(profile),
          endpoint,
        });
        if (result.status === 'ready' && result.snapshot) {
          onSnapshot(result.snapshot);
          setMessage(`Portfolio refreshed for ${profile.label}.`);
        } else {
          setErrors((prev) => ({ ...prev, [profile.id]: result.error ?? 'Balance fetch failed.' }));
          setMessage(result.error ?? 'Balance fetch failed.');
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Balance fetch failed.';
        setErrors((prev) => ({ ...prev, [profile.id]: error }));
        setMessage(error);
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
      }
    },
    [onSnapshot]
  );

  const handleRefreshVisible = useCallback(async () => {
    for (const profile of visibleProfiles) {
      await handleRefreshProfile(profile);
    }
    const snapshot = createPortfolioSnapshot(portfolio);
    const next = [snapshot, ...history].slice(0, 24);
    setHistory(next);
    savePortfolioSnapshots(next);
  }, [handleRefreshProfile, history, portfolio, visibleProfiles]);

  const canRemoveActive = activeProfile?.kind === WalletProfileKind.WATCH_ONLY;

  return (
    <div className="whub" data-testid="wallet-hub-dashboard">
      <style>{CSS}</style>
      <div className="whub-toolbar">
        <div className="whub-brand">
          <span className="whub-led" />
          <div>
            <h2>GORKH Wallet Hub</h2>
            <p>Multi-wallet metadata, watch-only control, and read-only portfolio dashboard.</p>
          </div>
        </div>
        <div className="whub-controls">
          <select className="whub-select" value={filter} onChange={(event) => setFilter(event.target.value as WalletHubFilter)}>
            <option value={WalletHubFilter.ALL_WALLETS}>All wallets</option>
            <option value={WalletHubFilter.ACTIVE_WALLET}>Active wallet</option>
            <option value={WalletHubFilter.WATCH_ONLY}>Watch-only</option>
            <option value={WalletHubFilter.LOCAL_VAULT}>Local vault</option>
          </select>
          <button className="whub-button whub-button-primary" onClick={handleRefreshVisible}>
            Refresh Portfolio
          </button>
          <span className="whub-chip">{activeProfile ? `${activeProfile.label} · ${shortAddress(activeProfile.publicAddress)}` : 'no wallet'}</span>
        </div>
      </div>

      <div className="whub-grid">
        <div className="whub-panel">
          <div className="whub-header">
            <h3>Wallet Profiles</h3>
            <span className="whub-chip">{profiles.length} total</span>
          </div>
          <div className="whub-scroll">
            {profiles.length === 0 && <p className="whub-empty">No wallets yet. Add a watch-only wallet or create a local vault wallet.</p>}
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className={`whub-row ${activeProfile?.id === profile.id ? 'whub-row-active' : ''}`}
                onClick={() => {
                  setActiveProfileId(profile.id);
                  setMessage(`Active wallet switched to ${profile.label}. No signing or execution was triggered.`);
                }}
              >
                <span>
                  <span className="whub-title">{profile.label}</span>
                  <span className="whub-sub">{shortAddress(profile.publicAddress)} · {profile.tags.join(', ') || 'untagged'}</span>
                </span>
                <span className={`whub-chip ${profile.kind === WalletProfileKind.WATCH_ONLY ? 'whub-chip-watch' : profile.status === 'locked' ? 'whub-chip-locked' : ''}`}>
                  {profileKindLabel(profile.kind)}
                </span>
              </button>
            ))}
          </div>
          <div className="whub-form">
            <input className="whub-input" value={addressDraft} onChange={(event) => setAddressDraft(event.target.value)} placeholder="Paste Solana watch-only address" />
            <input className="whub-input" value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} placeholder="Label" />
            <input className="whub-input" value={tagsDraft} onChange={(event) => setTagsDraft(event.target.value)} placeholder="Tags, comma separated" />
            <button className="whub-button whub-button-primary" onClick={handleAddWatchOnly}>Add Watch-Only</button>
          </div>
        </div>

        <div className="whub-panel">
          <div className="whub-header">
            <h3>Portfolio Dashboard</h3>
            <span className="whub-chip">values are estimates</span>
          </div>
          <div className="whub-scroll">
            <div className="whub-metrics">
              <div className="whub-metric"><span>Total Estimate</span><strong>{portfolio.totalEstimatedUsdValue ? `$${portfolio.totalEstimatedUsdValue}` : 'Unavailable'}</strong></div>
              <div className="whub-metric"><span>Wallets</span><strong>{portfolio.walletCount}</strong></div>
              <div className="whub-metric"><span>Last Refreshed</span><strong>{portfolio.refreshedAt ? new Date(portfolio.refreshedAt).toLocaleTimeString() : 'Not run'}</strong></div>
            </div>
            <div className="whub-token-row">
              <span>
                <span className="whub-title">DeFi Command Center</span>
                <span className="whub-sub">
                  {defiPortfolio.positionCount} positions · {defiPortfolio.protocolCount} protocols · displayed separately to avoid double-counting wallet token balances
                </span>
              </span>
              <span className="whub-chip">{defiPortfolio.totalEstimatedUsdValue ? `$${defiPortfolio.totalEstimatedUsdValue}` : 'defi unavailable'}</span>
            </div>
            <p className="whub-note">{message}</p>
            {portfolio.priceUnavailable && <p className="whub-note">Price unavailable — balances are shown without complete USD estimates.</p>}
            {portfolio.wallets.map((wallet) => (
              <div key={wallet.walletProfileId} className="whub-token-row">
                <span>
                  <span className="whub-title">{wallet.walletLabel}</span>
                  <span className="whub-sub">{wallet.solBalanceUi ?? '—'} SOL · {wallet.tokenBalances.length} token rows · {wallet.balanceStatus}</span>
                  {wallet.error && <span className="whub-sub whub-error">{wallet.error}</span>}
                </span>
                <span className="whub-chip">{wallet.totalEstimatedUsdValue ? `$${wallet.totalEstimatedUsdValue}` : 'no usd'}</span>
              </div>
            ))}
            {portfolio.tokenBalances.length === 0 && <p className="whub-empty">No SPL token balances loaded. Refresh a wallet to fetch read-only token accounts.</p>}
            {portfolio.tokenBalances.map((token) => (
              <div key={`${token.walletProfileId}-${token.mint}`} className="whub-token-row">
                <span>
                  <span className="whub-title">{token.symbol ?? 'Unknown Token'} · {token.uiAmountString ?? token.amountUi ?? token.amountRaw ?? '—'}</span>
                  <span className="whub-sub"><code>{token.mint}</code> · {token.walletLabel}</span>
                </span>
                <span className="whub-chip">{token.estimatedUsdValue ? `$${token.estimatedUsdValue}` : 'price unavailable'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="whub-panel whub-inspector">
          <div className="whub-header">
            <h3>Active Wallet</h3>
            <span className="whub-chip">safe metadata</span>
          </div>
          <div className="whub-scroll">
            {activeProfile ? (
              <>
                <div className="whub-metric"><span>Selected</span><strong>{activeProfile.label}</strong></div>
                <p className="whub-note">{activeProfile.publicAddress}</p>
                <p className="whub-note">{profileKindLabel(activeProfile.kind)} · {activeProfile.status}</p>
                <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                  <input className="whub-input" value={activeProfile.label} onChange={(event) => setStoredProfiles((prev) => updateWalletHubProfileLabel(prev, activeProfile.id, event.target.value))} />
                  <input className="whub-input" value={activeProfile.tags.join(', ')} onChange={(event) => setStoredProfiles((prev) => updateWalletHubProfileTags(prev, activeProfile.id, event.target.value.split(',')))} />
                  <button className="whub-button" onClick={() => handleRefreshProfile(activeProfile)}>Refresh Selected</button>
                  <button
                    className="whub-button"
                    disabled={!canRemoveActive}
                    onClick={() => {
                      setStoredProfiles((prev) => removeWatchOnlyWalletHubProfile(prev, activeProfile.id));
                      setActiveProfileId(null);
                      setMessage('Watch-only wallet removed.');
                    }}
                  >
                    Remove Watch-Only
                  </button>
                </div>
              </>
            ) : (
              <p className="whub-empty">No active wallet selected.</p>
            )}
          </div>
        </div>
      </div>

      <div className="whub-bottom">
        <div className="whub-pane">
          <div className="whub-eyebrow">Recent Portfolio Snapshots</div>
          {history.length === 0 && <p className="whub-empty">No safe portfolio snapshots stored yet.</p>}
          {history.slice(0, 5).map((snapshot) => (
            <div key={snapshot.id} className="whub-history-row">
              <span>
                <span className="whub-title">{new Date(snapshot.capturedAt).toLocaleString()}</span>
                <span className="whub-sub">{snapshot.walletIds.length} wallets · {snapshot.tokenSummary.length} token summaries</span>
              </span>
              <span className="whub-chip">{snapshot.totalEstimatedUsdValue ? `$${snapshot.totalEstimatedUsdValue}` : 'no usd'}</span>
            </div>
          ))}
        </div>
        <div className="whub-pane">
          <div className="whub-eyebrow">Context Snapshot</div>
          <p className="whub-note">
            Stored at gorkh.solana.walletHub.lastContext.v1. Includes wallet labels, public addresses, counts, estimated totals, and redaction metadata only.
          </p>
          <p className="whub-note">No private keys, seed phrases, wallet JSON, Cloak notes, viewing keys, Zerion credentials, API keys, tokens, or signing material.</p>
        </div>
        <div className="whub-pane">
          <div className="whub-eyebrow">Locked Roadmap</div>
          {WALLET_HUB_LOCKED_ROADMAP.map((item) => (
            <div key={item.id} className="whub-roadmap-row" aria-disabled="true">
              <span>
                <span className="whub-title">{item.title}</span>
                <span className="whub-sub">{item.copy}</span>
              </span>
              <span className="whub-chip whub-chip-locked">locked</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
