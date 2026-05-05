import { z } from 'zod';
import { SolanaRpcNetworkSchema } from './solana-rpc.js';
import { WorkstationRiskLevelSchema } from './solana-workstation.js';

// ============================================================================
// GORKH Markets — Shared Domain Types (Phase 8)
// ============================================================================
// Read-only Solana market intelligence: watchlists, token risk cards,
// wallet snapshots. No trading, no signing, no protocol APIs.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaMarketsItemKind = {
  WALLET: 'wallet',
  TOKEN_MINT: 'token_mint',
  PROGRAM: 'program',
  POOL_OR_ACCOUNT: 'pool_or_account',
  UNKNOWN: 'unknown',
} as const;
export type SolanaMarketsItemKind =
  (typeof SolanaMarketsItemKind)[keyof typeof SolanaMarketsItemKind];

export const SolanaMarketsItemStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  ARCHIVED: 'archived',
} as const;
export type SolanaMarketsItemStatus =
  (typeof SolanaMarketsItemStatus)[keyof typeof SolanaMarketsItemStatus];

export const SolanaMarketsRiskSignalKind = {
  MINT_AUTHORITY_PRESENT: 'mint_authority_present',
  FREEZE_AUTHORITY_PRESENT: 'freeze_authority_present',
  UNINITIALIZED_MINT: 'uninitialized_mint',
  UNKNOWN_OWNER_PROGRAM: 'unknown_owner_program',
  ACCOUNT_NOT_FOUND: 'account_not_found',
  EXECUTABLE_PROGRAM: 'executable_program',
  HIGH_HOLDER_CONCENTRATION_POSSIBLE: 'high_holder_concentration_possible',
  LARGEST_ACCOUNTS_UNAVAILABLE: 'largest_accounts_unavailable',
  TOKEN_2022_REQUIRES_REVIEW: 'token_2022_requires_review',
  CUSTOM_RPC_PRIVACY_WARNING: 'custom_rpc_privacy_warning',
  MAINNET_OPERATIONAL_CAUTION: 'mainnet_operational_caution',
  UNKNOWN: 'unknown',
} as const;
export type SolanaMarketsRiskSignalKind =
  (typeof SolanaMarketsRiskSignalKind)[keyof typeof SolanaMarketsRiskSignalKind];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaMarketsItemKindSchema = z.enum([
  SolanaMarketsItemKind.WALLET,
  SolanaMarketsItemKind.TOKEN_MINT,
  SolanaMarketsItemKind.PROGRAM,
  SolanaMarketsItemKind.POOL_OR_ACCOUNT,
  SolanaMarketsItemKind.UNKNOWN,
]);

export const SolanaMarketsItemStatusSchema = z.enum([
  SolanaMarketsItemStatus.IDLE,
  SolanaMarketsItemStatus.LOADING,
  SolanaMarketsItemStatus.READY,
  SolanaMarketsItemStatus.ERROR,
  SolanaMarketsItemStatus.ARCHIVED,
]);

export const SolanaMarketsRiskSignalKindSchema = z.enum([
  SolanaMarketsRiskSignalKind.MINT_AUTHORITY_PRESENT,
  SolanaMarketsRiskSignalKind.FREEZE_AUTHORITY_PRESENT,
  SolanaMarketsRiskSignalKind.UNINITIALIZED_MINT,
  SolanaMarketsRiskSignalKind.UNKNOWN_OWNER_PROGRAM,
  SolanaMarketsRiskSignalKind.ACCOUNT_NOT_FOUND,
  SolanaMarketsRiskSignalKind.EXECUTABLE_PROGRAM,
  SolanaMarketsRiskSignalKind.HIGH_HOLDER_CONCENTRATION_POSSIBLE,
  SolanaMarketsRiskSignalKind.LARGEST_ACCOUNTS_UNAVAILABLE,
  SolanaMarketsRiskSignalKind.TOKEN_2022_REQUIRES_REVIEW,
  SolanaMarketsRiskSignalKind.CUSTOM_RPC_PRIVACY_WARNING,
  SolanaMarketsRiskSignalKind.MAINNET_OPERATIONAL_CAUTION,
  SolanaMarketsRiskSignalKind.UNKNOWN,
]);

export const SolanaMarketsWatchlistItemSchema = z.object({
  id: z.string().min(1),
  address: z.string().min(1),
  label: z.string().optional(),
  kind: SolanaMarketsItemKindSchema,
  network: SolanaRpcNetworkSchema,
  status: SolanaMarketsItemStatusSchema,
  tags: z.array(z.string()),
  notes: z.string().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
});

export const SolanaMarketsAccountSnapshotSchema = z.object({
  address: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  exists: z.boolean(),
  lamports: z.number().optional(),
  owner: z.string().optional(),
  executable: z.boolean().optional(),
  dataLength: z.number().optional(),
  rentEpoch: z.number().optional(),
  fetchedAt: z.number().int(),
});

export const SolanaMarketsTokenLargestAccountSchema = z.object({
  address: z.string().min(1),
  amountRaw: z.string().min(1),
  amountUi: z.string().optional(),
  decimals: z.number().int().optional(),
  uiAmountString: z.string().optional(),
});

export const SolanaMarketsTokenMintSnapshotSchema = z.object({
  mintAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  exists: z.boolean(),
  owner: z.string().optional(),
  decimals: z.number().int().optional(),
  supplyRaw: z.string().optional(),
  supplyUi: z.string().optional(),
  mintAuthorityPresent: z.boolean().optional(),
  freezeAuthorityPresent: z.boolean().optional(),
  isInitialized: z.boolean().optional(),
  tokenProgram: z.enum(['spl_token', 'token_2022', 'unknown']).optional(),
  largestAccounts: z.array(SolanaMarketsTokenLargestAccountSchema).optional(),
  fetchedAt: z.number().int(),
  warnings: z.array(z.string()),
});

export const SolanaMarketsWalletTokenAccountSchema = z.object({
  pubkey: z.string().min(1),
  mint: z.string().min(1),
  amountRaw: z.string().optional(),
  amountUi: z.string().optional(),
  decimals: z.number().int().optional(),
  uiAmountString: z.string().optional(),
});

export const SolanaMarketsWalletSnapshotSchema = z.object({
  walletAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  exists: z.boolean(),
  solBalanceLamports: z.number().optional(),
  solBalanceUi: z.string().optional(),
  tokenAccountCount: z.number().int().optional(),
  tokenAccountsPreview: z.array(SolanaMarketsWalletTokenAccountSchema),
  fetchedAt: z.number().int(),
  warnings: z.array(z.string()),
});

export const SolanaMarketsRiskSignalSchema = z.object({
  id: z.string().min(1),
  kind: SolanaMarketsRiskSignalKindSchema,
  level: WorkstationRiskLevelSchema,
  title: z.string().min(1),
  description: z.string(),
  recommendation: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const SolanaMarketsItemAnalysisSchema = z.object({
  item: SolanaMarketsWatchlistItemSchema,
  accountSnapshot: SolanaMarketsAccountSnapshotSchema.optional(),
  tokenMintSnapshot: SolanaMarketsTokenMintSnapshotSchema.optional(),
  walletSnapshot: SolanaMarketsWalletSnapshotSchema.optional(),
  riskSignals: z.array(SolanaMarketsRiskSignalSchema),
  summary: z.string(),
  analyzedAt: z.number().int(),
  dataSources: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export const SolanaMarketsWorkspaceStateSchema = z.object({
  watchlist: z.array(SolanaMarketsWatchlistItemSchema),
  analyses: z.array(SolanaMarketsItemAnalysisSchema),
  selectedItemId: z.string().optional(),
  updatedAt: z.number().int(),
});

export const SolanaMarketsContextSummarySchema = z.object({
  generatedAt: z.string(),
  network: SolanaRpcNetworkSchema,
  watchlistCount: z.number().int().nonnegative(),
  itemSummaries: z.array(
    z.object({
      label: z.string().optional(),
      address: z.string().min(1),
      kind: SolanaMarketsItemKindSchema,
      riskSignalCount: z.number().int().nonnegative(),
      summary: z.string(),
    })
  ),
  markdown: z.string(),
  redactionsApplied: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaMarketsWatchlistItem = z.infer<typeof SolanaMarketsWatchlistItemSchema>;
export type SolanaMarketsAccountSnapshot = z.infer<typeof SolanaMarketsAccountSnapshotSchema>;
export type SolanaMarketsTokenMintSnapshot = z.infer<typeof SolanaMarketsTokenMintSnapshotSchema>;
export type SolanaMarketsWalletSnapshot = z.infer<typeof SolanaMarketsWalletSnapshotSchema>;
export type SolanaMarketsRiskSignal = z.infer<typeof SolanaMarketsRiskSignalSchema>;
export type SolanaMarketsItemAnalysis = z.infer<typeof SolanaMarketsItemAnalysisSchema>;
export type SolanaMarketsWorkspaceState = z.infer<typeof SolanaMarketsWorkspaceStateSchema>;
export type SolanaMarketsContextSummary = z.infer<typeof SolanaMarketsContextSummarySchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const SOLANA_MARKETS_PHASE_8_SAFETY_NOTES: string[] = [
  'Markets v0.1 is read-only.',
  'No swaps, orders, signing, or transaction execution are available.',
  'Risk signals are heuristics and do not prove safety.',
  'No external protocol APIs are called in Phase 8.',
];

export const SOLANA_MARKETS_DENIED_FEATURES: string[] = [
  'swap',
  'trade',
  'sniper',
  'auto_buy',
  'auto_sell',
  'mev',
  'jupiter_route',
  'drift',
  'perps',
  'leverage',
];

export const SOLANA_MARKETS_TRUSTED_FUTURE_INTEGRATIONS: string[] = [
  'Helius',
  'Pyth',
  'Jupiter',
  'Kamino',
  'Squads',
  'Meteora',
  'Orca',
  'Jito',
  'QuickNode',
  'Birdeye',
];

// ----------------------------------------------------------------------------
// Market Data Types (Phase 17)
// ----------------------------------------------------------------------------
// Typed adapter registry for future market intelligence providers.
// All data is read-only. No trading. No execution. No hardcoded keys.
// ----------------------------------------------------------------------------

export const SolanaMarketDataProviderId = {
  RPC_NATIVE: 'rpc_native',
  BIRDEYE_PLANNED: 'birdeye_planned',
  BIRDEYE_READ_ONLY: 'birdeye_read_only',
  QUICKNODE_PLANNED: 'quicknode_planned',
  PYTH_PLANNED: 'pyth_planned',
  JUPITER_PLANNED: 'jupiter_planned',
  METEORA_PLANNED: 'meteora_planned',
  ORCA_PLANNED: 'orca_planned',
  SAMPLE_OFFLINE: 'sample_offline',
} as const;
export type SolanaMarketDataProviderId =
  (typeof SolanaMarketDataProviderId)[keyof typeof SolanaMarketDataProviderId];

export const SolanaMarketDataProviderStatus = {
  AVAILABLE_READ_ONLY: 'available_read_only',
  PLANNED: 'planned',
  REQUIRES_USER_API_KEY: 'requires_user_api_key',
  DISABLED: 'disabled',
} as const;
export type SolanaMarketDataProviderStatus =
  (typeof SolanaMarketDataProviderStatus)[keyof typeof SolanaMarketDataProviderStatus];

export const SolanaMarketDataProviderIdSchema = z.enum([
  SolanaMarketDataProviderId.RPC_NATIVE,
  SolanaMarketDataProviderId.BIRDEYE_PLANNED,
  SolanaMarketDataProviderId.BIRDEYE_READ_ONLY,
  SolanaMarketDataProviderId.QUICKNODE_PLANNED,
  SolanaMarketDataProviderId.PYTH_PLANNED,
  SolanaMarketDataProviderId.JUPITER_PLANNED,
  SolanaMarketDataProviderId.METEORA_PLANNED,
  SolanaMarketDataProviderId.ORCA_PLANNED,
  SolanaMarketDataProviderId.SAMPLE_OFFLINE,
]);

export const SolanaMarketDataProviderStatusSchema = z.enum([
  SolanaMarketDataProviderStatus.AVAILABLE_READ_ONLY,
  SolanaMarketDataProviderStatus.PLANNED,
  SolanaMarketDataProviderStatus.REQUIRES_USER_API_KEY,
  SolanaMarketDataProviderStatus.DISABLED,
]);

export const SolanaMarketDataProviderDefinitionSchema = z.object({
  id: SolanaMarketDataProviderIdSchema,
  name: z.string().min(1),
  status: SolanaMarketDataProviderStatusSchema,
  capabilities: z.array(
    z.enum([
      'account_metadata',
      'token_supply',
      'token_holders',
      'price_context',
      'liquidity_context',
      'route_preview_planned',
      'risk_context',
    ])
  ),
  requiresApiKey: z.boolean(),
  storesApiKey: z.literal(false),
  safetyNote: z.string().min(1),
  roadmapNote: z.string().min(1),
});

export const SolanaMarketPriceContextSchema = z.object({
  mintAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  provider: SolanaMarketDataProviderIdSchema,
  priceUsd: z.string().optional(),
  priceChange24hPct: z.string().optional(),
  volume24hUsd: z.string().optional(),
  liquidityUsd: z.string().optional(),
  marketCapUsd: z.string().optional(),
  fetchedAt: z.number().int().optional(),
  isSample: z.boolean(),
  warnings: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export const SolanaMarketLiquidityPoolSchema = z.object({
  protocol: z.string().min(1),
  poolAddress: z.string().optional(),
  liquidityUsd: z.string().optional(),
  baseMint: z.string().optional(),
  quoteMint: z.string().optional(),
  warning: z.string().optional(),
});

export const SolanaMarketLiquidityContextSchema = z.object({
  mintAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  provider: SolanaMarketDataProviderIdSchema,
  pools: z.array(SolanaMarketLiquidityPoolSchema),
  fetchedAt: z.number().int().optional(),
  isSample: z.boolean(),
  warnings: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export const SolanaMarketDataContextSchema = z.object({
  itemId: z.string().min(1),
  address: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  providersUsed: z.array(SolanaMarketDataProviderIdSchema),
  priceContext: SolanaMarketPriceContextSchema.optional(),
  liquidityContext: SolanaMarketLiquidityContextSchema.optional(),
  generatedAt: z.number().int(),
  isSample: z.boolean(),
  warnings: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export const SolanaMarketProviderConfigSchema = z.object({
  provider: SolanaMarketDataProviderIdSchema,
  enabled: z.boolean(),
  apiKeyPresent: z.boolean(),
  endpointLabel: z.string().optional(),
  storesApiKey: z.literal(false),
  safetyNotes: z.array(z.string()),
});

export type SolanaMarketDataProviderDefinition = z.infer<typeof SolanaMarketDataProviderDefinitionSchema>;
export type SolanaMarketPriceContext = z.infer<typeof SolanaMarketPriceContextSchema>;
export type SolanaMarketLiquidityContext = z.infer<typeof SolanaMarketLiquidityContextSchema>;
export type SolanaMarketDataContext = z.infer<typeof SolanaMarketDataContextSchema>;
export type SolanaMarketProviderConfig = z.infer<typeof SolanaMarketProviderConfigSchema>;

export const SOLANA_MARKET_DATA_PROVIDERS: SolanaMarketDataProviderDefinition[] = [
  {
    id: SolanaMarketDataProviderId.RPC_NATIVE,
    name: 'Native RPC',
    status: SolanaMarketDataProviderStatus.AVAILABLE_READ_ONLY,
    capabilities: ['account_metadata', 'token_supply', 'token_holders'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Uses the configured Solana RPC endpoint. No external market APIs.',
    roadmapNote: 'Already available for account and token metadata.',
  },
  {
    id: SolanaMarketDataProviderId.BIRDEYE_READ_ONLY,
    name: 'Birdeye',
    status: SolanaMarketDataProviderStatus.REQUIRES_USER_API_KEY,
    capabilities: ['price_context', 'liquidity_context'],
    requiresApiKey: true,
    storesApiKey: false,
    safetyNote: 'Birdeye read-only fetch available when user provides API key. Key is never stored by GORKH.',
    roadmapNote: 'Read-only token price and market data via Birdeye public API. No trading execution.',
  },
  {
    id: SolanaMarketDataProviderId.QUICKNODE_PLANNED,
    name: 'QuickNode',
    status: SolanaMarketDataProviderStatus.REQUIRES_USER_API_KEY,
    capabilities: ['account_metadata', 'token_holders', 'price_context'],
    requiresApiKey: true,
    storesApiKey: false,
    safetyNote: 'Requires a user-provided QuickNode endpoint or API key. Key is never stored by GORKH.',
    roadmapNote: 'Planned for enhanced RPC and indexing.',
  },
  {
    id: SolanaMarketDataProviderId.PYTH_PLANNED,
    name: 'Pyth',
    status: SolanaMarketDataProviderStatus.PLANNED,
    capabilities: ['price_context'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Pyth price feeds are planned for future read-only price context.',
    roadmapNote: 'Planned for on-chain price oracle integration.',
  },
  {
    id: SolanaMarketDataProviderId.JUPITER_PLANNED,
    name: 'Jupiter',
    status: SolanaMarketDataProviderStatus.PLANNED,
    capabilities: ['route_preview_planned'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Jupiter route previews are planned only. No swap execution will ever be available.',
    roadmapNote: 'Planned for read-only route preview context only. Trading is permanently disabled.',
  },
  {
    id: SolanaMarketDataProviderId.METEORA_PLANNED,
    name: 'Meteora',
    status: SolanaMarketDataProviderStatus.PLANNED,
    capabilities: ['liquidity_context'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Meteora liquidity context is planned for future read-only pool data.',
    roadmapNote: 'Planned for liquidity pool metadata.',
  },
  {
    id: SolanaMarketDataProviderId.ORCA_PLANNED,
    name: 'Orca',
    status: SolanaMarketDataProviderStatus.PLANNED,
    capabilities: ['liquidity_context'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Orca liquidity context is planned for future read-only pool data.',
    roadmapNote: 'Planned for liquidity pool metadata.',
  },
  {
    id: SolanaMarketDataProviderId.SAMPLE_OFFLINE,
    name: 'Sample Offline',
    status: SolanaMarketDataProviderStatus.AVAILABLE_READ_ONLY,
    capabilities: ['price_context', 'liquidity_context'],
    requiresApiKey: false,
    storesApiKey: false,
    safetyNote: 'Deterministic sample data for UI development only. Not real market data.',
    roadmapNote: 'Available for UI development and testing.',
  },
];

export const SOLANA_MARKETS_PHASE_17_SAFETY_NOTES: string[] = [
  'Markets v0.2 is read-only.',
  'No swaps, orders, routes, or trades are executed.',
  'External market APIs are manual-click only and require user configuration.',
  'Sample data is clearly marked and must not be used for trading.',
];

export const SOLANA_MARKETS_PHASE_18_SAFETY_NOTES: string[] = [
  'Birdeye fetch is manual-click only.',
  'API keys are never stored by GORKH.',
  'Market data is informational and must not be treated as trading advice.',
  'No swaps, routes, orders, or trades are created.',
];

export const BIRDEYE_PUBLIC_API_BASE_URL = 'https://public-api.birdeye.so';

export const SOLANA_MARKETS_DENIED_TRADING_ACTIONS: string[] = [
  'swap',
  'route',
  'trade',
  'order',
  'auto_buy',
  'auto_sell',
  'sniper',
  'mev',
  'leverage',
  'perps',
  'drift',
];

// ----------------------------------------------------------------------------
// Birdeye Fetch Types (Phase 18)
// ----------------------------------------------------------------------------

export const SolanaMarketDataFetchStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
export type SolanaMarketDataFetchStatus =
  (typeof SolanaMarketDataFetchStatus)[keyof typeof SolanaMarketDataFetchStatus];

export const SolanaBirdeyeFetchMode = {
  PRICE: 'price',
  TOKEN_OVERVIEW: 'token_overview',
  PRICE_AND_OVERVIEW: 'price_and_overview',
} as const;
export type SolanaBirdeyeFetchMode =
  (typeof SolanaBirdeyeFetchMode)[keyof typeof SolanaBirdeyeFetchMode];

export const SolanaMarketDataFetchStatusSchema = z.enum([
  SolanaMarketDataFetchStatus.IDLE,
  SolanaMarketDataFetchStatus.LOADING,
  SolanaMarketDataFetchStatus.SUCCESS,
  SolanaMarketDataFetchStatus.ERROR,
]);

export const SolanaBirdeyeFetchModeSchema = z.enum([
  SolanaBirdeyeFetchMode.PRICE,
  SolanaBirdeyeFetchMode.TOKEN_OVERVIEW,
  SolanaBirdeyeFetchMode.PRICE_AND_OVERVIEW,
]);

export const SolanaBirdeyeMarketFetchRequestSchema = z.object({
  mintAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  mode: SolanaBirdeyeFetchModeSchema,
  apiKeyPresent: z.boolean(),
  requestedAt: z.number().int(),
});

export const SolanaBirdeyeMarketFetchResultSchema = z.object({
  provider: z.enum(['birdeye_read_only']),
  mintAddress: z.string().min(1),
  network: SolanaRpcNetworkSchema,
  status: SolanaMarketDataFetchStatusSchema,
  priceContext: SolanaMarketPriceContextSchema.optional(),
  rawOverviewSummary: z.string().optional(),
  error: z.string().optional(),
  fetchedAt: z.number().int().optional(),
  apiKeyStored: z.literal(false),
  safetyNotes: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type SolanaBirdeyeMarketFetchRequest = z.infer<typeof SolanaBirdeyeMarketFetchRequestSchema>;
export type SolanaBirdeyeMarketFetchResult = z.infer<typeof SolanaBirdeyeMarketFetchResultSchema>;

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaMarketsItemKind(value: unknown): value is SolanaMarketsItemKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaMarketsItemKind).includes(value as SolanaMarketsItemKind)
  );
}

export function isDeniedMarketsFeature(feature: string): boolean {
  return SOLANA_MARKETS_DENIED_FEATURES.includes(feature.toLowerCase());
}

export function isTrustedFutureIntegration(name: string): boolean {
  return SOLANA_MARKETS_TRUSTED_FUTURE_INTEGRATIONS.some(
    (i) => i.toLowerCase() === name.toLowerCase()
  );
}

export function isDeniedTradingAction(action: string): boolean {
  return SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes(action.toLowerCase());
}

export function getMarketDataProviderDefinition(
  id: SolanaMarketDataProviderId
): SolanaMarketDataProviderDefinition | undefined {
  return SOLANA_MARKET_DATA_PROVIDERS.find((p) => p.id === id);
}
