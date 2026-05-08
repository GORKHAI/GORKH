import {
  DeFiAdapterStatus,
  DeFiPortfolioSummarySchema,
  DeFiProtocolCategory,
  DeFiProtocolName,
  WalletHubFilter,
  WalletProfileKind,
  type DeFiPortfolioSummary,
  type WalletHubProfile,
} from '@gorkh/shared';
import {
  createLstComparisonRows,
  createNoPositionPlaceholder,
  createReadOnlyDeFiAdapterResults,
  createUnavailableYieldRows,
  type DeFiAdapterResult,
} from './defiAdapters.js';

export type DeFiWalletScope = 'all_wallets' | 'active_wallet' | 'watch_only' | 'local_vault';

export function walletHubFilterToDeFiScope(filter: WalletHubFilter): DeFiWalletScope {
  if (filter === WalletHubFilter.ACTIVE_WALLET) return 'active_wallet';
  if (filter === WalletHubFilter.WATCH_ONLY) return 'watch_only';
  if (filter === WalletHubFilter.LOCAL_VAULT) return 'local_vault';
  return 'all_wallets';
}

export function filterProfilesForDeFiScope(input: {
  profiles: WalletHubProfile[];
  activeProfileId?: string | null;
  scope: DeFiWalletScope;
}): WalletHubProfile[] {
  if (input.scope === 'active_wallet') {
    return input.profiles.filter((profile) => profile.id === input.activeProfileId);
  }
  if (input.scope === 'watch_only') {
    return input.profiles.filter((profile) => profile.kind === WalletProfileKind.WATCH_ONLY);
  }
  if (input.scope === 'local_vault') {
    return input.profiles.filter((profile) => profile.kind === WalletProfileKind.LOCAL_VAULT);
  }
  return input.profiles;
}

function sumUsd(values: Array<string | undefined>): string | undefined {
  let total = 0;
  let saw = false;
  for (const value of values) {
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) continue;
    total += parsed;
    saw = true;
  }
  return saw ? total.toFixed(2) : undefined;
}

export function createDeFiPortfolioSummary(input: {
  profiles: WalletHubProfile[];
  activeProfileId?: string | null;
  scope: DeFiWalletScope;
  adapters?: DeFiAdapterResult[];
  now?: number;
}): DeFiPortfolioSummary {
  const now = input.now ?? Date.now();
  const scopedProfiles = filterProfilesForDeFiScope({
    profiles: input.profiles,
    activeProfileId: input.activeProfileId,
    scope: input.scope,
  });
  const adapters = input.adapters ?? createReadOnlyDeFiAdapterResults(scopedProfiles);
  const adapterPositions = adapters.flatMap((adapter) => adapter.positions);
  const positions = adapterPositions.length
    ? adapterPositions
    : scopedProfiles.length
      ? [createNoPositionPlaceholder(scopedProfiles[0], now)]
      : [];
  const lpPositions = adapters.flatMap((adapter) => adapter.lpPositions);
  const lendingPositions = adapters.flatMap((adapter) => adapter.lendingPositions);
  const yieldOpportunities = [
    ...adapters.flatMap((adapter) => adapter.yieldOpportunities),
    ...createUnavailableYieldRows(now),
  ];
  const lstComparisons = [
    ...adapters.flatMap((adapter) => adapter.lstComparisons),
    ...createLstComparisonRows(now),
  ];
  const loadedPositions = positions.filter((position) => position.status === DeFiAdapterStatus.LOADED);
  const protocolsDetected = Array.from(
    new Set(loadedPositions.map((position) => position.protocolName))
  ) as DeFiProtocolName[];
  const categories = [
    DeFiProtocolCategory.LIQUIDITY,
    DeFiProtocolCategory.LENDING,
    DeFiProtocolCategory.LST,
    DeFiProtocolCategory.YIELD,
  ];
  const unavailable = adapters.filter((adapter) => adapter.status === DeFiAdapterStatus.UNAVAILABLE);
  const errors = adapters.filter((adapter) => adapter.status === DeFiAdapterStatus.ERROR);
  const staleOrErrorState = errors.length
    ? `${errors.length} DeFi adapter(s) returned errors.`
    : unavailable.length
      ? 'Protocol adapters are unavailable in v0.1. No funds are touched.'
      : undefined;

  return DeFiPortfolioSummarySchema.parse({
    id: `defi-portfolio-${now}`,
    walletScope: input.scope,
    walletCount: scopedProfiles.length,
    protocolCount: protocolsDetected.length,
    positionCount: loadedPositions.length,
    totalEstimatedUsdValue: sumUsd(loadedPositions.map((position) => position.estimatedUsdValue)),
    valueDisplayedSeparately: true,
    protocolsDetected,
    categoryBreakdown: categories.map((category) => ({
      category,
      count: loadedPositions.filter((position) => position.protocolCategory === category).length,
      estimatedUsdValue: sumUsd(
        loadedPositions
          .filter((position) => position.protocolCategory === category)
          .map((position) => position.estimatedUsdValue)
      ),
    })),
    positions,
    lpPositions,
    lendingPositions,
    yieldOpportunities,
    lstComparisons,
    adapterStatuses: adapters.map((adapter) => ({
      protocolName: adapter.protocolName,
      category: adapter.category,
      status: adapter.status,
      reason: adapter.reason,
      updatedAt: adapter.updatedAt,
    })),
    staleOrErrorState,
    generatedAt: now,
    warnings: [
      'DeFi value is displayed separately to avoid double-counting wallet token balances.',
      'Protocol positions are not inferred from wallet token balances.',
    ],
    localOnly: true,
  });
}
