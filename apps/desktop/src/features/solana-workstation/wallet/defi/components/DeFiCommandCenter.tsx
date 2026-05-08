import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFI_COMMAND_CENTER_BLOCKED_ACTIONS,
  DEFI_COMMAND_CENTER_SAFETY_NOTES,
  DeFiAdapterStatus,
  DeFiPortfolioSummarySchema,
  DeFiQuoteInputSchema,
  type DeFiPortfolioSummary,
  type DeFiQuoteSummary,
  type WalletHubProfile,
} from '@gorkh/shared';
import {
  createDeFiContextSnapshot,
  saveDeFiContextSnapshot,
} from '../defiStorage.js';
import {
  createDeFiPortfolioSummary,
  filterProfilesForDeFiScope,
  type DeFiWalletScope,
} from '../defiPortfolio.js';
import { fetchJupiterQuoteOnly } from '../defiQuote.js';
import { fetchDeFiBackendPortfolio } from '../defiBackendClient.js';

const CSS = `
.defi-cc { height:100%; min-height:0; display:grid; grid-template-rows:42px 72px minmax(0,1fr); gap:8px; overflow:hidden; color:rgba(255,255,255,0.9); }
.defi-toolbar,.defi-summary { min-height:0; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.defi-brand { display:flex; align-items:center; gap:10px; min-width:0; }
.defi-led { width:9px; height:9px; border-radius:999px; background:#14b8a6; box-shadow:0 0 16px rgba(20,184,166,0.34); }
.defi-brand h2 { margin:0; font-size:0.98rem; letter-spacing:0; }
.defi-brand p { margin:1px 0 0; color:rgba(255,255,255,0.5); font-size:0.71rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.defi-select,.defi-input { min-height:28px; border-radius:6px; border:1px solid rgba(255,255,255,0.13); background:rgba(0,0,0,0.22); color:rgba(255,255,255,0.82); font-size:0.72rem; padding:0 8px; }
.defi-button { min-height:28px; border-radius:6px; border:1px solid rgba(255,255,255,0.13); background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.82); font-size:0.7rem; font-weight:760; cursor:pointer; }
.defi-button:disabled,.defi-locked { opacity:0.48; cursor:not-allowed; }
.defi-button-primary { background:rgba(20,184,166,0.18); border-color:rgba(20,184,166,0.42); color:#dffef9; }
.defi-summary { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); overflow:hidden; }
.defi-metric,.defi-panel { background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; min-height:0; overflow:hidden; }
.defi-metric { padding:9px; }
.defi-metric span,.defi-eyebrow { display:block; color:rgba(255,255,255,0.44); font-size:0.61rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; }
.defi-metric strong { display:block; margin-top:7px; font-size:0.92rem; color:rgba(255,255,255,0.9); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.defi-grid { min-height:0; display:grid; grid-template-columns:176px minmax(0,1fr) 292px; gap:8px; overflow:hidden; }
.defi-rail,.defi-main,.defi-inspector { min-height:0; overflow:hidden; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; }
.defi-rail { padding:8px; display:flex; flex-direction:column; gap:5px; }
.defi-tab { min-height:28px; border:1px solid transparent; border-radius:6px; background:transparent; color:rgba(255,255,255,0.58); font-size:0.7rem; font-weight:760; text-align:left; padding:0 8px; cursor:pointer; }
.defi-tab-active { color:white; background:rgba(255,255,255,0.09); border-color:rgba(255,255,255,0.13); }
.defi-main { display:grid; grid-template-rows:40px minmax(0,1fr); }
.defi-header { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.09); }
.defi-header h3 { margin:0; font-size:0.84rem; }
.defi-scroll { min-height:0; overflow:auto; padding:10px; }
.defi-section { border:1px solid rgba(255,255,255,0.09); border-radius:7px; background:rgba(0,0,0,0.15); padding:9px; margin-bottom:8px; }
.defi-section h4 { margin:0 0 7px; font-size:0.7rem; color:rgba(255,255,255,0.78); text-transform:uppercase; letter-spacing:0.05em; }
.defi-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.07); font-size:0.69rem; color:rgba(255,255,255,0.66); }
.defi-row strong { color:rgba(255,255,255,0.86); }
.defi-note,.defi-empty { margin:5px 0 0; color:rgba(255,255,255,0.54); font-size:0.7rem; line-height:1.45; }
.defi-chip { display:inline-flex; align-items:center; min-height:18px; padding:0 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.11); color:rgba(255,255,255,0.62); font-size:0.6rem; font-weight:800; text-transform:uppercase; }
.defi-chip-warn { color:#fde68a; border-color:rgba(245,158,11,0.42); background:rgba(245,158,11,0.1); }
.defi-form { display:grid; grid-template-columns:1fr 1fr 104px 104px; gap:6px; margin-bottom:8px; }
.defi-inspector { padding:10px; overflow:auto; }
@media (max-width:1180px) { .defi-grid { grid-template-columns:160px minmax(0,1fr); } .defi-inspector { display:none; } .defi-summary { grid-template-columns:repeat(3,minmax(0,1fr)); } }
`;

type DeFiTab = 'overview' | 'positions' | 'lp' | 'lending' | 'yield' | 'lsts' | 'swap_quote' | 'locked';

const TABS: { id: DeFiTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'positions', label: 'Positions' },
  { id: 'lp', label: 'LP' },
  { id: 'lending', label: 'Lending' },
  { id: 'yield', label: 'Yield' },
  { id: 'lsts', label: 'LSTs' },
  { id: 'swap_quote', label: 'Swap Quote' },
  { id: 'locked', label: 'Locked Actions' },
];

function scopeLabel(scope: DeFiWalletScope): string {
  return scope.replace(/_/g, ' ');
}

function sumUsd(values: Array<string | undefined>): string | undefined {
  let total = 0;
  let sawValue = false;
  for (const value of values) {
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) continue;
    total += parsed;
    sawValue = true;
  }
  return sawValue ? total.toFixed(2) : undefined;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function mergeBackendPortfolios(input: {
  base: DeFiPortfolioSummary;
  portfolios: DeFiPortfolioSummary[];
  walletCount: number;
  rejectedCount: number;
}): DeFiPortfolioSummary {
  const now = Date.now();
  const positions = input.portfolios.flatMap((portfolio) => portfolio.positions);
  const lpPositions = input.portfolios.flatMap((portfolio) => portfolio.lpPositions);
  const lendingPositions = input.portfolios.flatMap((portfolio) => portfolio.lendingPositions);
  const yieldOpportunities = uniqueById(input.portfolios.flatMap((portfolio) => portfolio.yieldOpportunities));
  const lstComparisons = uniqueById(input.portfolios.flatMap((portfolio) => portfolio.lstComparisons));
  const adapterStatuses = input.portfolios.flatMap((portfolio) => portfolio.adapterStatuses);
  const loadedPositions = positions.filter((position) => position.status === DeFiAdapterStatus.LOADED);
  const protocolsDetected = Array.from(new Set(loadedPositions.map((position) => position.protocolName)));

  return DeFiPortfolioSummarySchema.parse({
    ...input.base,
    id: `defi-backend-merged-${now}`,
    walletCount: input.walletCount,
    protocolCount: protocolsDetected.length,
    positionCount: loadedPositions.length,
    protocolsDetected,
    totalEstimatedUsdValue: sumUsd(loadedPositions.map((position) => position.estimatedUsdValue)),
    categoryBreakdown: input.base.categoryBreakdown.map((category) => ({
      ...category,
      count: loadedPositions.filter((position) => position.protocolCategory === category.category).length,
      estimatedUsdValue: sumUsd(
        loadedPositions
          .filter((position) => position.protocolCategory === category.category)
          .map((position) => position.estimatedUsdValue)
      ),
    })),
    positions: positions.length ? positions : input.base.positions,
    lpPositions,
    lendingPositions,
    yieldOpportunities: yieldOpportunities.length ? yieldOpportunities : input.base.yieldOpportunities,
    lstComparisons: lstComparisons.length ? lstComparisons : input.base.lstComparisons,
    adapterStatuses: adapterStatuses.length ? adapterStatuses : input.base.adapterStatuses,
    staleOrErrorState: input.rejectedCount
      ? `${input.rejectedCount} backend DeFi request(s) failed. Showing partial read-only data.`
      : input.portfolios.some((portfolio) => portfolio.staleOrErrorState)
        ? 'Some backend DeFi adapters are unavailable or partially configured.'
        : undefined,
    refreshedAt: now,
    warnings: [
      'Real DeFi data is loaded from the GORKH read-only backend where configured.',
      'No executable transactions are created, returned, stored, signed, or broadcast.',
      ...input.base.warnings,
    ],
  });
}

export function DeFiCommandCenter({
  profiles,
  activeProfileId,
  initialScope = 'all_wallets',
}: {
  profiles: WalletHubProfile[];
  activeProfileId?: string | null;
  initialScope?: DeFiWalletScope;
}) {
  const [scope, setScope] = useState<DeFiWalletScope>(initialScope);
  const [activeTab, setActiveTab] = useState<DeFiTab>('overview');
  const [quoteInputMint, setQuoteInputMint] = useState('SOL');
  const [quoteOutputMint, setQuoteOutputMint] = useState('USDC');
  const [quoteAmount, setQuoteAmount] = useState('1000000');
  const [quoteSlippageBps, setQuoteSlippageBps] = useState(50);
  const [quote, setQuote] = useState<DeFiQuoteSummary | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [backendPortfolio, setBackendPortfolio] = useState<DeFiPortfolioSummary | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [message, setMessage] = useState('DeFi Command Center is read-only. No execution actions are available.');

  const localPortfolio = useMemo(
    () => createDeFiPortfolioSummary({ profiles, activeProfileId, scope }),
    [activeProfileId, profiles, scope]
  );
  const portfolio = backendPortfolio ?? localPortfolio;

  useEffect(() => {
    const scopedProfiles = filterProfilesForDeFiScope({ profiles, activeProfileId, scope });
    let cancelled = false;

    if (!scopedProfiles.length) {
      setBackendPortfolio(null);
      setMessage('No wallet profiles in this DeFi scope. Backend was not called.');
      return;
    }

    setBackendLoading(true);
    setBackendPortfolio(null);
    void Promise.allSettled(
      scopedProfiles.map((profile) => fetchDeFiBackendPortfolio({
        wallet: profile.publicAddress,
        scope,
      }))
    ).then((results) => {
      if (cancelled) return;
      const fulfilled = results
        .filter((result): result is PromiseFulfilledResult<DeFiPortfolioSummary> => result.status === 'fulfilled')
        .map((result) => result.value);
      const rejectedCount = results.length - fulfilled.length;
      if (!fulfilled.length) {
        setBackendPortfolio(null);
        setMessage('GORKH read-only DeFi backend is unavailable. Showing local safe unavailable states.');
        return;
      }
      setBackendPortfolio(mergeBackendPortfolios({
        base: localPortfolio,
        portfolios: fulfilled,
        walletCount: scopedProfiles.length,
        rejectedCount,
      }));
      setMessage('Real DeFi data is loaded from the GORKH read-only backend where configured. Execution is locked.');
    }).finally(() => {
      if (!cancelled) setBackendLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProfileId, localPortfolio, profiles, scope]);

  useEffect(() => {
    saveDeFiContextSnapshot(createDeFiContextSnapshot({ portfolio, quote }));
  }, [portfolio, quote]);

  const runQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuote(null);
    try {
      const input = DeFiQuoteInputSchema.parse({
        inputMintOrSymbol: quoteInputMint,
        outputMintOrSymbol: quoteOutputMint,
        amount: quoteAmount,
        slippageBps: quoteSlippageBps,
        source: 'pasted',
        localOnly: true,
      });
      const result = await fetchJupiterQuoteOnly(input);
      setQuote(result);
      setMessage('Quote only. Swap execution is locked. GORKH did not build, sign, or broadcast a transaction.');
    } finally {
      setQuoteLoading(false);
    }
  }, [quoteAmount, quoteInputMint, quoteOutputMint, quoteSlippageBps]);

  const renderRows = () => {
    if (activeTab === 'positions') {
      return portfolio.positions.map((position) => (
        <div className="defi-row" key={position.id}>
          <span><strong>{position.positionLabel}</strong><br />{position.walletLabel ?? position.walletPublicAddress} · {position.statusReason ?? position.sourceLabel}</span>
          <span className="defi-chip">{position.status}</span>
        </div>
      ));
    }
    if (activeTab === 'lp') {
      return portfolio.lpPositions.length ? portfolio.lpPositions.map((position) => (
        <div className="defi-row" key={position.id}>
          <span><strong>{position.protocolName}</strong><br />{position.poolName ?? 'Pool unavailable'} · IL {position.impermanentLossStatus}</span>
          <span>{position.estimatedUsdValue ?? 'no value'}</span>
        </div>
      )) : <p className="defi-empty">IL unavailable — entry price/history is not available in v0.1. No LP positions are loaded.</p>;
    }
    if (activeTab === 'lending') {
      return portfolio.lendingPositions.length ? portfolio.lendingPositions.map((position) => (
        <div className="defi-row" key={position.id}>
          <span><strong>{position.protocolName}</strong><br />supplied {position.suppliedAssets.join(', ') || 'unavailable'} · borrowed {position.borrowedAssets.join(', ') || 'unavailable'}</span>
          <span>{position.liquidationRiskLabel ?? position.status}</span>
        </div>
      )) : <p className="defi-empty">Protocol adapter not connected in v0.1. No funds are touched.</p>;
    }
    if (activeTab === 'yield') {
      return portfolio.yieldOpportunities.map((item) => (
        <div className="defi-row" key={item.id}>
          <span><strong>{item.asset} · {item.protocolName}</strong><br />{item.productType} · {item.riskNote}</span>
          <span>{item.apy ?? item.apr ?? 'APY unavailable'}</span>
        </div>
      ));
    }
    if (activeTab === 'lsts') {
      return portfolio.lstComparisons.map((item) => (
        <div className="defi-row" key={item.id}>
          <span><strong>{item.tokenSymbol}</strong><br />{item.liquidityNote ?? item.statusReason}</span>
          <span>{item.apy ?? 'APY unavailable'}</span>
        </div>
      ));
    }
    if (activeTab === 'swap_quote') {
      return (
        <>
          <div className="defi-form">
            <input className="defi-input" value={quoteInputMint} onChange={(event) => setQuoteInputMint(event.target.value)} placeholder="Input mint/symbol" />
            <input className="defi-input" value={quoteOutputMint} onChange={(event) => setQuoteOutputMint(event.target.value)} placeholder="Output mint/symbol" />
            <input className="defi-input" value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} placeholder="amount raw" />
            <input className="defi-input" value={quoteSlippageBps} onChange={(event) => setQuoteSlippageBps(Number(event.target.value))} placeholder="slippage bps" />
          </div>
          <button className="defi-button defi-button-primary" disabled={quoteLoading} onClick={() => void runQuote()}>
            {quoteLoading ? 'Quote Loading' : 'Get Quote Only'}
          </button>
          <button className="defi-button defi-locked" disabled>Swap execution locked</button>
          {quote ? (
            <div className="defi-section">
              <h4>Jupiter Quote Summary</h4>
              <div className="defi-row"><span>Status</span><span>{quote.status}</span></div>
              <div className="defi-row"><span>Estimated output</span><span>{quote.estimatedOutput ?? 'unavailable'}</span></div>
              <div className="defi-row"><span>Price impact</span><span>{quote.priceImpactPct ?? 'unavailable'}</span></div>
              <p className="defi-note">{quote.warnings.join(' ')}</p>
            </div>
          ) : (
            <p className="defi-empty">Quote empty. Enter mints or symbols and amount to request a public Jupiter quote summary.</p>
          )}
        </>
      );
    }
    if (activeTab === 'locked') {
      return DEFI_COMMAND_CENTER_BLOCKED_ACTIONS.map((action) => (
        <div className="defi-row defi-locked" aria-disabled="true" key={action}>
          <span><strong>{action}</strong><br />Disabled in v0.1. Future DeFi actions require proposal, policy check, simulation/review, explicit approval, secure signer gateway, and audit log.</span>
          <span className="defi-chip defi-chip-warn">locked</span>
        </div>
      ));
    }
    return (
      <>
        <div className="defi-section">
          <h4>Read-Only DeFi Overview</h4>
          <p className="defi-note">No DeFi positions detected for the selected wallet scope. GORKH did not move funds or connect to any execution protocol.</p>
          <p className="defi-note">DeFi value is displayed separately to avoid double-counting wallet token balances.</p>
        </div>
        <div className="defi-section">
          <h4>Adapter Status</h4>
          {portfolio.adapterStatuses.map((adapter) => (
            <div className="defi-row" key={`${adapter.protocolName}-${adapter.category}`}>
              <span><strong>{adapter.protocolName}</strong><br />{adapter.reason}</span>
              <span className="defi-chip">{adapter.status}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="defi-cc" data-testid="defi-command-center">
      <style>{CSS}</style>
      <div className="defi-toolbar">
        <div className="defi-brand">
          <span className="defi-led" />
          <div>
            <h2>GORKH DeFi Command Center</h2>
            <p>Read-only protocol intelligence and Jupiter quote-only review.</p>
          </div>
        </div>
        <select className="defi-select" value={scope} onChange={(event) => setScope(event.target.value as DeFiWalletScope)}>
          <option value="all_wallets">All wallets</option>
          <option value="active_wallet">Active wallet</option>
          <option value="watch_only">Watch-only wallets</option>
          <option value="local_vault">Local vault wallets</option>
        </select>
      </div>

      <div className="defi-summary">
        <div className="defi-metric"><span>Scope</span><strong>{scopeLabel(scope)}</strong></div>
        <div className="defi-metric"><span>DeFi Value</span><strong>{portfolio.totalEstimatedUsdValue ? `$${portfolio.totalEstimatedUsdValue}` : 'Unavailable'}</strong></div>
        <div className="defi-metric"><span>Positions</span><strong>{portfolio.positionCount}</strong></div>
        <div className="defi-metric"><span>Protocols</span><strong>{portfolio.protocolCount}</strong></div>
        <div className="defi-metric"><span>Status</span><strong>{backendLoading ? 'Loading' : portfolio.staleOrErrorState ? 'Partial' : 'Loaded'}</strong></div>
      </div>

      <div className="defi-grid">
        <nav className="defi-rail" aria-label="DeFi Command Center tabs">
          {TABS.map((tab) => (
            <button key={tab.id} className={`defi-tab ${activeTab === tab.id ? 'defi-tab-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <section className="defi-main">
          <div className="defi-header">
            <h3>{TABS.find((tab) => tab.id === activeTab)?.label ?? 'Overview'}</h3>
            <span className="defi-chip">read-only v0.1</span>
          </div>
          <div className="defi-scroll">{renderRows()}</div>
        </section>
        <aside className="defi-inspector">
          <div className="defi-section">
            <h4>Safety</h4>
            {DEFI_COMMAND_CENTER_SAFETY_NOTES.map((note) => <p className="defi-note" key={note}>{note}</p>)}
          </div>
          <div className="defi-section">
            <h4>Context Snapshot</h4>
            <p className="defi-note">Stored at gorkh.solana.defiCommandCenter.lastContext.v1 with summaries and redaction metadata only.</p>
            <p className="defi-note">{message}</p>
          </div>
          <div className="defi-section">
            <h4>Limit Orders</h4>
            <p className="defi-note">Jupiter limit orders, place order, cancel order, and order history are locked in v0.1.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
