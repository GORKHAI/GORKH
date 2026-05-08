import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import {
  DeFiAdapterStatus,
  DeFiBackendHealthSchema,
  DeFiDataSourceSchema,
  DeFiPortfolioSummarySchema,
  DeFiProtocolCategory,
  DeFiProtocolName,
  DeFiQuoteSummarySchema,
  DeFiYieldOpportunitySchema,
  type DeFiAdapterStatus as DeFiAdapterStatusType,
  type DeFiApiEnvelope,
  type DeFiBackendHealth,
  type DeFiDataSource,
  type DeFiLendingPosition,
  type DeFiLpPosition,
  type DeFiLstComparison,
  type DeFiPortfolioSummary,
  type DeFiProtocolCategory as DeFiProtocolCategoryType,
  type DeFiProtocolName as DeFiProtocolNameType,
  type DeFiQuoteSummary,
  type DeFiYieldOpportunity,
} from '@gorkh/shared';

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_QUOTE_AMOUNT = 10_000_000_000_000_000n;

const KNOWN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  WSOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4i1HodcqJjmZ7r2YkL8i',
};

const LST_TOKENS: Array<{
  symbol: DeFiLstComparison['tokenSymbol'];
  protocolName: DeFiProtocolNameType;
  mint?: string;
}> = [
  { symbol: 'JitoSOL', protocolName: DeFiProtocolName.JITOSOL, mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn' },
  { symbol: 'mSOL', protocolName: DeFiProtocolName.MSOL, mint: 'mSoLzYCxHdH8rt9g7fHc6vQGYgYpMoG5K3Y3KZK7KZ' },
  { symbol: 'bSOL', protocolName: DeFiProtocolName.BSOL },
  { symbol: 'bbSOL', protocolName: DeFiProtocolName.BBSOL },
];

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface AdapterStatusRow {
  protocolName: DeFiProtocolNameType;
  category: DeFiProtocolCategoryType;
  status: DeFiAdapterStatusType;
  reason?: string;
  updatedAt?: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function now(): number {
  return Date.now();
}

function envelope<T>(
  status: DeFiApiEnvelope<T>['status'],
  data: T,
  warnings: string[] = []
): DeFiApiEnvelope<T> {
  return {
    ok: status !== 'error',
    status,
    data,
    warnings,
    updatedAt: now(),
  };
}

function errorEnvelope(message: string, status: DeFiApiEnvelope['status'] = 'error'): DeFiApiEnvelope {
  return {
    ok: false,
    status,
    data: { message: redactSecretLike(message) },
    warnings: ['No executable DeFi payloads are returned by this endpoint.'],
    updatedAt: now(),
  };
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  const timestamp = now();
  if (existing && existing.expiresAt > timestamp) {
    return Promise.resolve(existing.value as T);
  }
  return load().then((value) => {
    cache.set(key, {
      expiresAt: timestamp + Math.max(0, config.DEFI_CACHE_TTL_MS),
      value,
    });
    return value;
  });
}

function redactSecretLike(value: string): string {
  return value
    .replace(/([?&](?:api[-_]?key|key|token|auth|access_token)=)[^&\s]+/gi, '$1••••••')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1••••••')
    .replace(/(sk_live_|sk_test_|whsec_)[A-Za-z0-9._-]+/g, '$1••••••');
}

function redactUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      url.searchParams.set(key, '••••••');
    }
    const pathParts = url.pathname.split('/').map((part) => (
      part.length > 18 && /[A-Za-z0-9_-]{18,}/.test(part) ? '••••••' : part
    ));
    url.pathname = pathParts.join('/');
    return redactSecretLike(url.toString());
  } catch {
    return redactSecretLike(value);
  }
}

function isSolanaPublicKey(value: string): boolean {
  return BASE58_RE.test(value.trim());
}

function normalizeMint(value: string): string {
  const trimmed = value.trim();
  return KNOWN_MINTS[trimmed.toUpperCase()] ?? trimmed;
}

function validateRawAmount(value: string): boolean {
  if (!/^[0-9]+$/.test(value)) return false;
  const parsed = BigInt(value);
  return parsed > 0n && parsed <= MAX_QUOTE_AMOUNT;
}

async function fetchJsonWithTimeout(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1_000, config.DEFI_REQUEST_TIMEOUT_MS));
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Upstream returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function pickRecord(value: unknown): Record<string, unknown> {
  const root = asRecord(value);
  return asRecord(root.data ?? root.result ?? root);
}

function stringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function statusRow(
  protocolName: DeFiProtocolNameType,
  category: DeFiProtocolCategoryType,
  status: DeFiAdapterStatusType,
  reason?: string
): AdapterStatusRow {
  return {
    protocolName,
    category,
    status,
    reason,
    updatedAt: now(),
  };
}

function unavailableStatus(
  protocolName: DeFiProtocolNameType,
  category: DeFiProtocolCategoryType,
  reason: string
): AdapterStatusRow {
  return statusRow(protocolName, category, DeFiAdapterStatus.UNAVAILABLE, reason);
}

function configuredSources(): DeFiDataSource[] {
  const sources: DeFiDataSource[] = [
    {
      id: 'jupiter-quote',
      label: 'Jupiter Quote API',
      kind: 'public_api',
      status: config.JUPITER_API_BASE ? DeFiAdapterStatus.CONNECTED : DeFiAdapterStatus.UNAVAILABLE,
      redactedUrl: config.JUPITER_API_BASE ? redactUrl(config.JUPITER_API_BASE) : undefined,
      updatedAt: now(),
      warnings: ['Quote-only source. Swap transaction endpoints are not called.'],
    },
    {
      id: 'birdeye',
      label: 'Birdeye public token data',
      kind: 'indexer',
      status: config.BIRDEYE_API_KEY ? DeFiAdapterStatus.CONNECTED : DeFiAdapterStatus.UNAVAILABLE,
      updatedAt: now(),
      warnings: ['API key remains server-side and is not returned to desktop clients.'],
    },
    {
      id: 'solana-mainnet-rpc',
      label: 'Solana mainnet RPC',
      kind: 'rpc',
      status: config.SOLANA_RPC_MAINNET_URL ? DeFiAdapterStatus.CONNECTED : DeFiAdapterStatus.UNAVAILABLE,
      redactedUrl: config.SOLANA_RPC_MAINNET_URL ? redactUrl(config.SOLANA_RPC_MAINNET_URL) : undefined,
      updatedAt: now(),
      warnings: ['RPC is used for read-only diagnostics only.'],
    },
  ];
  return sources.map((source) => DeFiDataSourceSchema.parse(source));
}

function backendHealth(): DeFiBackendHealth {
  const sources = configuredSources();
  return DeFiBackendHealthSchema.parse({
    enabled: config.DEFI_FEATURES_ENABLED,
    configuredAdapters: sources.filter((source) => source.status === DeFiAdapterStatus.CONNECTED).map((source) => source.label),
    unavailableAdapters: [
      !config.BIRDEYE_API_KEY ? 'LST APY/TVL adapter requires BIRDEYE_API_KEY.' : '',
      !config.KAMINO_API_BASE ? 'Kamino read-only adapter requires KAMINO_API_BASE.' : '',
      !config.MARGINFI_API_BASE ? 'MarginFi read-only adapter requires MARGINFI_API_BASE.' : '',
      !config.ORCA_API_BASE ? 'Orca LP adapter requires ORCA_API_BASE or an indexer source.' : '',
      !config.RAYDIUM_API_BASE ? 'Raydium LP adapter requires RAYDIUM_API_BASE or an indexer source.' : '',
      !config.METEORA_API_BASE ? 'Meteora LP adapter requires METEORA_API_BASE or an indexer source.' : '',
    ].filter(Boolean),
    cacheTtlMs: config.DEFI_CACHE_TTL_MS,
    requestTimeoutMs: config.DEFI_REQUEST_TIMEOUT_MS,
    sources,
    updatedAt: now(),
  });
}

async function fetchBirdeyeTokenOverview(mint: string): Promise<Record<string, unknown>> {
  if (!config.BIRDEYE_API_KEY) {
    throw new Error('BIRDEYE_API_KEY is not configured.');
  }
  const url = new URL('https://public-api.birdeye.so/defi/token_overview');
  url.searchParams.set('address', mint);
  const payload = await fetchJsonWithTimeout(url.toString(), {
    headers: {
      'X-API-KEY': config.BIRDEYE_API_KEY,
      'x-chain': 'solana',
    },
  });
  return pickRecord(payload);
}

async function getLstComparisons(): Promise<{
  lstComparisons: DeFiLstComparison[];
  adapterStatuses: AdapterStatusRow[];
}> {
  const timestamp = now();
  if (!config.BIRDEYE_API_KEY) {
    return {
      lstComparisons: LST_TOKENS.map((token) => ({
        id: `defi-lst-${token.symbol.toLowerCase()}`,
        tokenSymbol: token.symbol,
        tokenMint: token.mint,
        sourceLabel: 'Birdeye token overview',
        status: DeFiAdapterStatus.UNAVAILABLE,
        statusReason: 'BIRDEYE_API_KEY is not configured. Live LST APY, TVL, and exchange-rate fields are unavailable.',
        liquidityNote: 'Stake, unstake, and swap actions are locked.',
        updatedAt: timestamp,
        warnings: ['No LST values are inferred or faked.'],
        localOnly: true,
      })),
      adapterStatuses: LST_TOKENS.map((token) => unavailableStatus(
        token.protocolName,
        DeFiProtocolCategory.LST,
        'BIRDEYE_API_KEY is not configured. No funds were touched.'
      )),
    };
  }

  const rows: DeFiLstComparison[] = [];
  const statuses: AdapterStatusRow[] = [];
  for (const token of LST_TOKENS) {
    if (!token.mint) {
      rows.push({
        id: `defi-lst-${token.symbol.toLowerCase()}`,
        tokenSymbol: token.symbol,
        sourceLabel: 'Birdeye token overview',
        status: DeFiAdapterStatus.UNAVAILABLE,
        statusReason: `${token.symbol} mint is not configured in the v0.1 adapter.`,
        liquidityNote: 'No values are inferred or faked.',
        updatedAt: timestamp,
        warnings: ['Configure a verified token mint before loading live data.'],
        localOnly: true,
      });
      statuses.push(unavailableStatus(token.protocolName, DeFiProtocolCategory.LST, `${token.symbol} mint is not configured.`));
      continue;
    }

    const mint = token.mint;
    try {
      const data = await cached(`birdeye-token-${mint}`, () => fetchBirdeyeTokenOverview(mint));
      const record = asRecord(data);
      const apy = stringField(record, ['apy', 'apr', 'stakingApy', 'stakeApy']);
      const tvl = stringField(record, ['tvl', 'liquidity', 'marketCap']);
      const exchangeRate = stringField(record, ['exchangeRate', 'rate']);
      const status = apy || tvl || exchangeRate ? DeFiAdapterStatus.LOADED : DeFiAdapterStatus.UNAVAILABLE;
      rows.push({
        id: `defi-lst-${token.symbol.toLowerCase()}`,
        tokenSymbol: token.symbol,
        tokenMint: token.mint,
        exchangeRate,
        apy,
        tvl,
        liquidityNote: tvl ? 'Liquidity/TVL field loaded from public token data.' : 'Liquidity/TVL unavailable from configured source.',
        sourceLabel: 'Birdeye token overview',
        status,
        statusReason: status === DeFiAdapterStatus.UNAVAILABLE
          ? 'Configured source responded, but APY/TVL/exchange-rate fields were unavailable.'
          : undefined,
        updatedAt: timestamp,
        warnings: ['Read-only public data. No staking, unstaking, or swapping is available.'],
        localOnly: true,
      });
      statuses.push(statusRow(
        token.protocolName,
        DeFiProtocolCategory.LST,
        status,
        status === DeFiAdapterStatus.UNAVAILABLE ? 'Public source did not include usable LST fields.' : 'Public token data loaded.'
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LST adapter failed.';
      rows.push({
        id: `defi-lst-${token.symbol.toLowerCase()}`,
        tokenSymbol: token.symbol,
        tokenMint: token.mint,
        sourceLabel: 'Birdeye token overview',
        status: DeFiAdapterStatus.ERROR,
        statusReason: redactSecretLike(message),
        liquidityNote: 'Public LST data request failed. No values are inferred.',
        updatedAt: timestamp,
        warnings: ['No funds were touched.'],
        localOnly: true,
      });
      statuses.push(statusRow(token.protocolName, DeFiProtocolCategory.LST, DeFiAdapterStatus.ERROR, redactSecretLike(message)));
    }
  }

  return { lstComparisons: rows, adapterStatuses: statuses };
}

function unavailableLending(): DeFiLendingPosition[] {
  return [];
}

function unavailableLp(): DeFiLpPosition[] {
  return [];
}

function protocolAvailabilityRows(): AdapterStatusRow[] {
  return [
    unavailableStatus(
      DeFiProtocolName.KAMINO,
      DeFiProtocolCategory.LENDING,
      config.KAMINO_API_BASE
        ? 'Kamino base URL is configured, but the v0.1 adapter requires a stable read-only position endpoint contract before loading user positions.'
        : 'KAMINO_API_BASE is not configured. No funds were touched.'
    ),
    unavailableStatus(
      DeFiProtocolName.MARGINFI,
      DeFiProtocolCategory.LENDING,
      config.MARGINFI_API_BASE
        ? 'MarginFi base URL is configured, but the v0.1 adapter requires a stable read-only position endpoint contract before loading user positions.'
        : 'MARGINFI_API_BASE is not configured. No funds were touched.'
    ),
    unavailableStatus(
      DeFiProtocolName.ORCA,
      DeFiProtocolCategory.LIQUIDITY,
      config.ORCA_API_BASE
        ? 'Orca base URL is configured, but LP position detection requires a safe wallet-indexed endpoint or indexer mapping.'
        : 'ORCA_API_BASE is not configured. No funds were touched.'
    ),
    unavailableStatus(
      DeFiProtocolName.RAYDIUM,
      DeFiProtocolCategory.LIQUIDITY,
      config.RAYDIUM_API_BASE
        ? 'Raydium base URL is configured, but LP position detection requires a safe wallet-indexed endpoint or indexer mapping.'
        : 'RAYDIUM_API_BASE is not configured. No funds were touched.'
    ),
    unavailableStatus(
      DeFiProtocolName.METEORA,
      DeFiProtocolCategory.LIQUIDITY,
      config.METEORA_API_BASE
        ? 'Meteora base URL is configured, but LP position detection requires a safe wallet-indexed endpoint or indexer mapping.'
        : 'METEORA_API_BASE is not configured. No funds were touched.'
    ),
  ];
}

async function buildPortfolio(wallet: string, scope = 'active_wallet'): Promise<DeFiPortfolioSummary> {
  const timestamp = now();
  const lst = await getLstComparisons();
  const adapterStatuses = [...protocolAvailabilityRows(), ...lst.adapterStatuses];
  const loadedProtocols = Array.from(
    new Set(adapterStatuses
      .filter((adapter) => adapter.status === DeFiAdapterStatus.LOADED)
      .map((adapter) => adapter.protocolName))
  );

  return DeFiPortfolioSummarySchema.parse({
    id: `defi-backend-${wallet}-${timestamp}`,
    walletScope: scope === 'all_wallets' || scope === 'watch_only' || scope === 'local_vault' ? scope : 'active_wallet',
    walletCount: 1,
    protocolCount: loadedProtocols.length,
    positionCount: 0,
    valueDisplayedSeparately: true,
    protocolsDetected: loadedProtocols,
    categoryBreakdown: [
      { category: DeFiProtocolCategory.LIQUIDITY, count: 0 },
      { category: DeFiProtocolCategory.LENDING, count: 0 },
      { category: DeFiProtocolCategory.LST, count: 0 },
      { category: DeFiProtocolCategory.YIELD, count: 0 },
    ],
    positions: [],
    lpPositions: unavailableLp(),
    lendingPositions: unavailableLending(),
    yieldOpportunities: await getYieldOpportunities(),
    lstComparisons: lst.lstComparisons,
    adapterStatuses,
    staleOrErrorState: adapterStatuses.some((adapter) => adapter.status === DeFiAdapterStatus.ERROR)
      ? 'One or more DeFi backend adapters returned errors.'
      : 'Some DeFi protocol adapters are unavailable until safe read-only data sources are configured.',
    generatedAt: timestamp,
    refreshedAt: timestamp,
    warnings: [
      'Real DeFi data is loaded from the GORKH read-only backend where configured.',
      'DeFi value is displayed separately to avoid double-counting wallet token balances.',
      'No executable transactions are created, returned, stored, signed, or broadcast.',
    ],
    localOnly: true,
  });
}

async function getYieldOpportunities(): Promise<DeFiYieldOpportunity[]> {
  const timestamp = now();
  const lst = await getLstComparisons();
  return lst.lstComparisons.map((item) => DeFiYieldOpportunitySchema.parse({
    id: `defi-yield-${item.tokenSymbol.toLowerCase()}`,
    asset: item.tokenSymbol,
    protocolName: item.tokenSymbol === 'JitoSOL'
      ? DeFiProtocolName.JITOSOL
      : item.tokenSymbol === 'mSOL'
        ? DeFiProtocolName.MSOL
        : item.tokenSymbol === 'bSOL'
          ? DeFiProtocolName.BSOL
          : DeFiProtocolName.BBSOL,
    productType: 'lst',
    apy: item.apy,
    tvl: item.tvl,
    riskNote: item.status === DeFiAdapterStatus.LOADED
      ? 'Read-only LST comparison data. No stake, unstake, or swap action is available.'
      : 'APY/TVL unavailable from configured public source. No recommendation is made.',
    sourceLabel: item.sourceLabel,
    status: item.status,
    updatedAt: item.updatedAt ?? timestamp,
    warnings: item.warnings,
    localOnly: true,
  }));
}

async function fetchJupiterQuote(input: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
}): Promise<DeFiQuoteSummary> {
  const timestamp = now();
  if (!config.JUPITER_API_BASE) {
    return DeFiQuoteSummarySchema.parse({
      id: `defi-quote-${timestamp}`,
      provider: 'Jupiter',
      inputMintOrSymbol: input.inputMint,
      outputMintOrSymbol: input.outputMint,
      quoteTimestamp: timestamp,
      status: 'unavailable',
      error: 'JUPITER_API_BASE is not configured.',
      warnings: ['Quote only. Swap execution is locked.'],
      executionLocked: true,
      redactionsApplied: ['jupiter.executablePayloadExcluded'],
      localOnly: true,
    });
  }

  const url = new URL('/v6/quote', config.JUPITER_API_BASE.replace(/\/$/, ''));
  url.searchParams.set('inputMint', normalizeMint(input.inputMint));
  url.searchParams.set('outputMint', normalizeMint(input.outputMint));
  url.searchParams.set('amount', input.amount);
  url.searchParams.set('slippageBps', String(input.slippageBps));
  url.searchParams.set('onlyDirectRoutes', 'false');

  const payload = await cached(`jupiter-quote-${url.searchParams.toString()}`, () => fetchJsonWithTimeout(url.toString()));
  const record = asRecord(payload);
  const routeLabels = Array.isArray(record.routePlan)
    ? record.routePlan
      .map((route) => stringField(asRecord(asRecord(route).swapInfo), ['label']))
      .filter((label): label is string => Boolean(label))
      .slice(0, 6)
    : [];

  return DeFiQuoteSummarySchema.parse({
    id: `defi-quote-${timestamp}`,
    provider: 'Jupiter',
    inputMintOrSymbol: input.inputMint,
    outputMintOrSymbol: input.outputMint,
    inAmount: stringField(record, ['inAmount']),
    outAmount: stringField(record, ['outAmount']),
    estimatedOutput: stringField(record, ['outAmount']),
    priceImpactPct: stringField(record, ['priceImpactPct']),
    routeSummary: routeLabels,
    feeSummary: stringField(record, ['otherAmountThreshold'])
      ? `Other amount threshold: ${stringField(record, ['otherAmountThreshold'])}`
      : undefined,
    quoteTimestamp: timestamp,
    expiresAt: timestamp + Math.max(5_000, Math.min(config.DEFI_CACHE_TTL_MS, 60_000)),
    status: 'success',
    warnings: ['Quote only. Swap execution is locked. Backend did not request, create, store, sign, or broadcast a transaction.'],
    executionLocked: true,
    redactionsApplied: ['jupiter.routePlanNormalized', 'jupiter.executablePayloadExcluded'],
    localOnly: true,
  });
}

const walletQuerySchema = z.object({
  wallet: z.string().refine(isSolanaPublicKey, 'wallet must be a valid Solana public key'),
  scope: z.enum(['all_wallets', 'active_wallet', 'watch_only', 'local_vault']).optional(),
});

const quoteQuerySchema = z.object({
  inputMint: z.string().min(1),
  outputMint: z.string().min(1),
  amount: z.string().refine(validateRawAmount, 'amount must be a positive bounded raw token amount'),
  slippageBps: z.coerce.number().int().min(0).max(5000),
});

function sendValidationError(issues: z.ZodIssue[]): DeFiApiEnvelope {
  return errorEnvelope(issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '), 'error');
}

export async function registerDeFiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/defi/health', async () => envelope('loaded', backendHealth()));

  fastify.get('/api/defi/lsts', async () => {
    if (!config.DEFI_FEATURES_ENABLED) {
      return envelope('unavailable', { lstComparisons: [], adapterStatuses: [] }, ['DEFI_FEATURES_ENABLED=false']);
    }
    const data = await getLstComparisons();
    const status = data.adapterStatuses.some((adapter) => adapter.status === DeFiAdapterStatus.LOADED)
      ? 'loaded'
      : 'unavailable';
    return envelope(status, data);
  });

  fastify.get('/api/defi/yields', async () => {
    if (!config.DEFI_FEATURES_ENABLED) {
      return envelope('unavailable', { yieldOpportunities: [] }, ['DEFI_FEATURES_ENABLED=false']);
    }
    const yieldOpportunities = await getYieldOpportunities();
    const status = yieldOpportunities.some((item) => item.status === DeFiAdapterStatus.LOADED) ? 'loaded' : 'unavailable';
    return envelope(status, { yieldOpportunities });
  });

  fastify.get('/api/defi/positions', async (request, reply) => {
    const parsed = walletQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400);
      return sendValidationError(parsed.error.issues);
    }
    try {
      const portfolio = await buildPortfolio(parsed.data.wallet, parsed.data.scope);
      const status = portfolio.staleOrErrorState ? 'partial' : 'loaded';
      return envelope(status, portfolio);
    } catch (error) {
      reply.status(502);
      return errorEnvelope(error instanceof Error ? error.message : 'DeFi position aggregation failed.');
    }
  });

  fastify.get('/api/defi/lending', async (request, reply) => {
    const parsed = walletQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400);
      return sendValidationError(parsed.error.issues);
    }
    const adapterStatuses = protocolAvailabilityRows().filter((adapter) => adapter.category === DeFiProtocolCategory.LENDING);
    return envelope('unavailable', {
      lendingPositions: [] as DeFiLendingPosition[],
      adapterStatuses,
      wallet: parsed.data.wallet,
    });
  });

  fastify.get('/api/defi/lp', async (request, reply) => {
    const parsed = walletQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400);
      return sendValidationError(parsed.error.issues);
    }
    const adapterStatuses = protocolAvailabilityRows().filter((adapter) => adapter.category === DeFiProtocolCategory.LIQUIDITY);
    return envelope('unavailable', {
      lpPositions: [] as DeFiLpPosition[],
      adapterStatuses,
      wallet: parsed.data.wallet,
      impermanentLossNote: 'IL unavailable — entry price/history is not available in v0.1.',
    });
  });

  fastify.get('/api/defi/jupiter/quote', async (request, reply) => {
    const parsed = quoteQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400);
      return sendValidationError(parsed.error.issues);
    }
    try {
      const quote = await fetchJupiterQuote(parsed.data);
      return envelope(quote.status === 'success' ? 'loaded' : 'unavailable', quote);
    } catch (error) {
      reply.status(502);
      return errorEnvelope(error instanceof Error ? error.message : 'Jupiter quote unavailable.');
    }
  });
}
