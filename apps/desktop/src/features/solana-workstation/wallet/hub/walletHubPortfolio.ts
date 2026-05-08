import {
  ConsolidatedPortfolioSummarySchema,
  PortfolioSnapshotSchema,
  WalletHubFilter,
  WalletProfileKind,
  type ConsolidatedPortfolioSummary,
  type PortfolioPriceEstimate,
  type PortfolioSnapshot,
  type PortfolioTokenBalance,
  type PortfolioWalletSummary,
  type SolanaWalletReadOnlySnapshot,
  type WalletHubProfile,
} from '@gorkh/shared';

const KNOWN_STABLE_MINTS = new Map<string, { symbol: string; priceUsd: string }>([
  ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', { symbol: 'USDC', priceUsd: '1' }],
  ['Es9vMFrzaCERmJfrF4H2FYD4i1HodcqJjmZ7r2YkL8i', { symbol: 'USDT', priceUsd: '1' }],
]);

export function createPortfolioPriceEstimate(mint: string, now: number = Date.now()): PortfolioPriceEstimate {
  const known = KNOWN_STABLE_MINTS.get(mint);
  if (known) {
    return {
      mint,
      symbol: known.symbol,
      priceUsd: known.priceUsd,
      source: 'known_stable',
      estimated: true,
      fetchedAt: now,
      warnings: ['Stablecoin price is treated as an estimate.'],
    };
  }
  return {
    mint,
    source: 'unavailable',
    estimated: true,
    warnings: ['Price unavailable — balance shown without USD estimate.'],
  };
}

function decimalAmount(raw?: string, decimals?: number): number | undefined {
  if (!raw || decimals === undefined) return undefined;
  try {
    return Number(BigInt(raw)) / 10 ** decimals;
  } catch {
    return undefined;
  }
}

function amountNumber(amountUi?: string, raw?: string, decimals?: number): number | undefined {
  const parsedUi = amountUi !== undefined ? Number(amountUi) : undefined;
  if (parsedUi !== undefined && Number.isFinite(parsedUi)) return parsedUi;
  return decimalAmount(raw, decimals);
}

function formatUsd(value: number | undefined): string | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return value.toFixed(2);
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

export function buildPortfolioWalletSummary(input: {
  profile: WalletHubProfile;
  snapshot?: SolanaWalletReadOnlySnapshot | null;
  loading?: boolean;
  error?: string;
  now?: number;
}): PortfolioWalletSummary {
  const { profile, snapshot, loading, error } = input;
  const now = input.now ?? Date.now();
  const tokenBalances: PortfolioTokenBalance[] = [];
  const warnings = [...(snapshot?.warnings ?? [])];

  for (const account of snapshot?.tokenAccountsPreview ?? []) {
    const estimate = createPortfolioPriceEstimate(account.mint, now);
    const amount = amountNumber(account.uiAmountString, account.amountRaw, account.decimals);
    const price = estimate.priceUsd ? Number(estimate.priceUsd) : undefined;
    const estimatedUsdValue = formatUsd(amount !== undefined && price !== undefined ? amount * price : undefined);
    tokenBalances.push({
      walletProfileId: profile.id,
      walletLabel: profile.label,
      mint: account.mint,
      symbol: estimate.symbol,
      tokenAccountCount: 1,
      amountRaw: account.amountRaw,
      amountUi: account.amountUi ?? account.uiAmountString,
      decimals: account.decimals,
      uiAmountString: account.uiAmountString,
      priceEstimate: estimate,
      estimatedUsdValue,
      priceUnavailable: !estimatedUsdValue,
      warnings: [...(account.mint ? [] : ['Missing token mint.']), ...estimate.warnings],
    });
  }

  const totalEstimatedUsdValue = sumUsd(tokenBalances.map((balance) => balance.estimatedUsdValue));
  const status = error ? 'error' : loading ? 'loading' : snapshot ? 'loaded' : 'idle';

  return {
    walletProfileId: profile.id,
    walletLabel: profile.label,
    walletKind: profile.kind,
    walletStatus: profile.status,
    publicAddress: profile.publicAddress,
    network: profile.network,
    solBalanceLamports: snapshot?.solBalanceLamports,
    solBalanceUi: snapshot?.solBalanceUi,
    solEstimatedUsdValue: undefined,
    tokenBalances,
    totalEstimatedUsdValue,
    priceUnavailable: !totalEstimatedUsdValue || tokenBalances.some((balance) => balance.priceUnavailable),
    balanceStatus: status,
    error,
    refreshedAt: snapshot?.fetchedAt,
    warnings,
  };
}

export function createConsolidatedPortfolioSummary(input: {
  profiles: WalletHubProfile[];
  snapshots: SolanaWalletReadOnlySnapshot[];
  loadingIds?: Set<string>;
  errors?: Record<string, string>;
  filter?: WalletHubFilter;
  now?: number;
}): ConsolidatedPortfolioSummary {
  const now = input.now ?? Date.now();
  const snapshotByProfileId = new Map(input.snapshots.map((snapshot) => [snapshot.walletProfileId, snapshot]));
  const wallets = input.profiles.map((profile) =>
    buildPortfolioWalletSummary({
      profile,
      snapshot: snapshotByProfileId.get(profile.id) ?? null,
      loading: input.loadingIds?.has(profile.id),
      error: input.errors?.[profile.id],
      now,
    })
  );
  const tokenBalances = wallets.flatMap((wallet) => wallet.tokenBalances);
  const refreshedAt = wallets
    .map((wallet) => wallet.refreshedAt)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => b - a)[0];

  return ConsolidatedPortfolioSummarySchema.parse({
    id: `wallet-portfolio-${now}`,
    filter: input.filter ?? WalletHubFilter.ALL_WALLETS,
    walletCount: input.profiles.length,
    watchOnlyCount: input.profiles.filter((profile) => profile.kind === WalletProfileKind.WATCH_ONLY).length,
    localVaultCount: input.profiles.filter((profile) => profile.kind === WalletProfileKind.LOCAL_VAULT).length,
    browserHandoffCount: input.profiles.filter((profile) => profile.kind === WalletProfileKind.BROWSER_HANDOFF).length,
    totalEstimatedUsdValue: sumUsd(wallets.map((wallet) => wallet.totalEstimatedUsdValue)),
    priceUnavailable: wallets.some((wallet) => wallet.priceUnavailable),
    wallets,
    tokenBalances,
    generatedAt: now,
    refreshedAt,
    warnings: wallets.flatMap((wallet) => wallet.warnings),
    localOnly: true,
  });
}
export function createPortfolioSnapshot(summary: ConsolidatedPortfolioSummary, now: number = Date.now()): PortfolioSnapshot {
  return PortfolioSnapshotSchema.parse({
    id: `wallet-portfolio-snapshot-${now}`,
    summaryId: summary.id,
    filter: summary.filter,
    walletIds: summary.wallets.map((wallet) => wallet.walletProfileId),
    publicAddresses: summary.wallets.map((wallet) => wallet.publicAddress),
    tokenSummary: summary.tokenBalances.slice(0, 12).map((balance) => ({
      mint: balance.mint,
      symbol: balance.symbol,
      amountUi: balance.uiAmountString ?? balance.amountUi,
      estimatedUsdValue: balance.estimatedUsdValue,
    })),
    totalEstimatedUsdValue: summary.totalEstimatedUsdValue,
    priceUnavailable: summary.priceUnavailable,
    capturedAt: now,
    redactionsApplied: ['walletHub.snapshot.secretFieldsExcluded'],
    localOnly: true,
  });
}
