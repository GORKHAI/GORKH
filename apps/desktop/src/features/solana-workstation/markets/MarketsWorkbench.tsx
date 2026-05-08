import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  SolanaRpcNetwork,
  SolanaMarketsWorkspaceState,
  SolanaMarketsWatchlistItem,
} from '@gorkh/shared';
import { getDefaultEndpointConfig } from '../rpc/index.js';
import { loadMarketsWorkspaceState, saveMarketsWorkspaceState, createEmptyMarketsWorkspaceState } from './marketsStorage.js';
import { analyzeMarketsItem } from './analyzeMarketsItem.js';
import {
  fetchAccountSnapshot,
  fetchTokenMintSnapshot,
  fetchWalletSnapshot,
} from './fetchMarketsSnapshots.js';
import { createMarketsContextSummary } from './createMarketsContextSummary.js';
import {
  MarketsSafetyPanel,
  WatchlistPanel,
  MarketItemCard,
  MarketsContextPanel,
} from './components/index.js';
import {
  MarketDataProviderPanel,
  MarketDataContextPanel,
} from './market-data/index.js';

const NETWORK_OPTIONS: { value: SolanaRpcNetwork; label: string }[] = [
  { value: 'devnet', label: 'Devnet' },
  { value: 'mainnet-beta', label: 'Mainnet Beta' },
  { value: 'localnet', label: 'Localnet' },
];

type MarketsTab = 'watchlist' | 'market_data' | 'providers' | 'context' | 'safety';

const TABS: { id: MarketsTab; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'market_data', label: 'Market Data' },
  { id: 'providers', label: 'Providers' },
  { id: 'context', label: 'Context' },
  { id: 'safety', label: 'Safety' },
];

export function MarketsWorkbench() {
  const [workspace, setWorkspace] = useState<SolanaMarketsWorkspaceState>(() => loadMarketsWorkspaceState() ?? createEmptyMarketsWorkspaceState());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<SolanaRpcNetwork>('devnet');
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<MarketsTab>('watchlist');

  useEffect(() => {
    saveMarketsWorkspaceState(workspace);
  }, [workspace]);

  const endpoint = getDefaultEndpointConfig(network);
  const activeEndpoint = customUrl.trim()
    ? { ...endpoint, url: customUrl.trim(), label: 'Custom Endpoint', isCustom: true }
    : endpoint;
  const isCustomEndpoint = activeEndpoint.isCustom ?? false;
  const isMainnet = network === 'mainnet-beta';

  const handleAdd = useCallback(
    async (address: string, label?: string) => {
      setError(null);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const newItem: SolanaMarketsWatchlistItem = {
        id,
        address,
        label: label || undefined,
        network: activeEndpoint.network,
        kind: 'unknown',
        status: 'idle',
        tags: [],
        createdAt: now,
        updatedAt: now,
        localOnly: true,
      };
      setWorkspace((prev) => ({
        ...prev,
        watchlist: [...prev.watchlist, newItem],
      }));
      setSelectedItemId(id);
    },
    [activeEndpoint.network]
  );

  const handleRemove = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      watchlist: prev.watchlist.map((i) => (i.id === id ? { ...i, status: 'archived' as const } : i)),
    }));
    setSelectedItemId((sid) => (sid === id ? null : sid));
  }, []);

  const handleSelect = useCallback((item: SolanaMarketsWatchlistItem) => {
    setSelectedItemId(item.id);
  }, []);

  const handleAnalyze = useCallback(
    async (item: SolanaMarketsWatchlistItem) => {
      setIsAnalyzing(true);
      setError(null);
      try {
        const accountSnapshot = await fetchAccountSnapshot(activeEndpoint, item.address);

        let tokenMintSnapshot = undefined;
        let walletSnapshot = undefined;

        if (!accountSnapshot.executable) {
          const [tokenResult, walletResult] = await Promise.allSettled([
            fetchTokenMintSnapshot(activeEndpoint, item.address),
            fetchWalletSnapshot(activeEndpoint, item.address),
          ]);
          if (tokenResult.status === 'fulfilled' && tokenResult.value.exists) {
            tokenMintSnapshot = tokenResult.value;
          }
          if (walletResult.status === 'fulfilled' && walletResult.value.exists) {
            walletSnapshot = walletResult.value;
          }
        }

        const analysis = analyzeMarketsItem({
          item,
          accountSnapshot,
          tokenMintSnapshot,
          walletSnapshot,
          isCustomEndpoint,
          isMainnet,
        });

        setWorkspace((prev) => ({
          ...prev,
          analyses: [...prev.analyses.filter((a) => a.item.id !== item.id), analysis],
        }));
      } catch (e: any) {
        setError(e.message ?? 'Analysis failed.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [activeEndpoint, isCustomEndpoint, isMainnet]
  );

  const selectedAnalysis = useMemo(() => {
    if (!selectedItemId) return undefined;
    return workspace.analyses.find((a) => a.item.id === selectedItemId);
  }, [selectedItemId, workspace.analyses]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return workspace.watchlist.find((i) => i.id === selectedItemId) ?? null;
  }, [selectedItemId, workspace.watchlist]);

  const contextSummary = useMemo(
    () => createMarketsContextSummary(workspace, activeEndpoint.network),
    [workspace, activeEndpoint.network]
  );

  const activeItems = workspace.watchlist.filter((i) => i.status !== 'archived');

  return (
    <div
      className="gorkh-premium-workbench gorkh-markets-workbench"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Network:</span>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as SolanaRpcNetwork)}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
            background: '#fff',
          }}
        >
          {NETWORK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Custom RPC URL (optional)"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8rem',
            minWidth: '220px',
          }}
        />
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
          Using {activeEndpoint.label}
        </span>
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

      {activeTab === 'watchlist' && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <WatchlistPanel
            items={workspace.watchlist}
            network={endpoint.network}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onSelect={handleSelect}
            isAnalyzing={isAnalyzing}
          />

          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {selectedAnalysis ? (
              <>
                <MarketItemCard
                  analysis={selectedAnalysis}
                  onRemove={() => handleRemove(selectedAnalysis.item.id)}
                />
                <button
                  onClick={() => handleAnalyze(selectedAnalysis.item)}
                  disabled={isAnalyzing}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: isAnalyzing ? '#cbd5e1' : '#0f172a',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  {isAnalyzing ? 'Analyzing…' : 'Refresh Analysis'}
                </button>
              </>
            ) : selectedItemId ? (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  Select an item or click Analyze to load on-chain data.
                </div>
                <button
                  onClick={() => {
                    const item = activeItems.find((i) => i.id === selectedItemId);
                    if (item) handleAnalyze(item);
                  }}
                  disabled={isAnalyzing}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: isAnalyzing ? '#cbd5e1' : '#0f172a',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAnalyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>
            ) : (
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
                Select a watchlist item to view analysis. New items are analyzed automatically on first view.
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'market_data' && (
        <div style={{ maxWidth: '720px' }}>
          <MarketDataContextPanel item={selectedItem} />
        </div>
      )}

      {activeTab === 'providers' && (
        <div style={{ maxWidth: '720px' }}>
          <MarketDataProviderPanel />
        </div>
      )}

      {activeTab === 'context' && (
        <div style={{ maxWidth: '720px' }}>
          <MarketsContextPanel summary={contextSummary} />
        </div>
      )}

      {activeTab === 'safety' && (
        <div style={{ maxWidth: '720px' }}>
          <MarketsSafetyPanel />
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
        Markets v0.3 — Read-only watchlists, Birdeye manual fetch, market data adapter shell, and sample context. No swaps. No trading. No execution.
      </div>
    </div>
  );
}
