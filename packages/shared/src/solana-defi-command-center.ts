import { z } from 'zod';

export const DeFiProtocolCategory = {
  LIQUIDITY: 'liquidity',
  LENDING: 'lending',
  LST: 'lst',
  SWAP_QUOTE: 'swap_quote',
  YIELD: 'yield',
  UNKNOWN: 'unknown',
} as const;
export type DeFiProtocolCategory =
  (typeof DeFiProtocolCategory)[keyof typeof DeFiProtocolCategory];

export const DeFiProtocolName = {
  RAYDIUM: 'Raydium',
  ORCA: 'Orca',
  METEORA: 'Meteora',
  KAMINO: 'Kamino',
  MARGINFI: 'MarginFi',
  JITOSOL: 'JitoSOL',
  MSOL: 'mSOL',
  BSOL: 'bSOL',
  BBSOL: 'bbSOL',
  JUPITER: 'Jupiter',
} as const;
export type DeFiProtocolName = (typeof DeFiProtocolName)[keyof typeof DeFiProtocolName];

export const DeFiPositionKind = {
  LP: 'lp',
  LENDING: 'lending',
  LST: 'lst',
  YIELD: 'yield',
  QUOTE: 'quote',
} as const;
export type DeFiPositionKind = (typeof DeFiPositionKind)[keyof typeof DeFiPositionKind];

export const DeFiAdapterStatus = {
  CONNECTED: 'connected',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error',
  STALE: 'stale',
  EMPTY: 'empty',
  LOADED: 'loaded',
} as const;
export type DeFiAdapterStatus = (typeof DeFiAdapterStatus)[keyof typeof DeFiAdapterStatus];

export const DeFiProtocolCategorySchema = z.enum([
  DeFiProtocolCategory.LIQUIDITY,
  DeFiProtocolCategory.LENDING,
  DeFiProtocolCategory.LST,
  DeFiProtocolCategory.SWAP_QUOTE,
  DeFiProtocolCategory.YIELD,
  DeFiProtocolCategory.UNKNOWN,
]);

export const DeFiProtocolNameSchema = z.enum([
  DeFiProtocolName.RAYDIUM,
  DeFiProtocolName.ORCA,
  DeFiProtocolName.METEORA,
  DeFiProtocolName.KAMINO,
  DeFiProtocolName.MARGINFI,
  DeFiProtocolName.JITOSOL,
  DeFiProtocolName.MSOL,
  DeFiProtocolName.BSOL,
  DeFiProtocolName.BBSOL,
  DeFiProtocolName.JUPITER,
]);

export const DeFiPositionKindSchema = z.enum([
  DeFiPositionKind.LP,
  DeFiPositionKind.LENDING,
  DeFiPositionKind.LST,
  DeFiPositionKind.YIELD,
  DeFiPositionKind.QUOTE,
]);

export const DeFiAdapterStatusSchema = z.enum([
  DeFiAdapterStatus.CONNECTED,
  DeFiAdapterStatus.UNAVAILABLE,
  DeFiAdapterStatus.ERROR,
  DeFiAdapterStatus.STALE,
  DeFiAdapterStatus.EMPTY,
  DeFiAdapterStatus.LOADED,
]);

export const DeFiDataSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['backend', 'rpc', 'indexer', 'public_api']),
  status: DeFiAdapterStatusSchema,
  redactedUrl: z.string().optional(),
  updatedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
});
export type DeFiDataSource = z.infer<typeof DeFiDataSourceSchema>;

export const DeFiAdapterErrorSchema = z.object({
  protocolName: DeFiProtocolNameSchema,
  category: DeFiProtocolCategorySchema,
  status: z.enum([DeFiAdapterStatus.UNAVAILABLE, DeFiAdapterStatus.ERROR, DeFiAdapterStatus.STALE]),
  message: z.string().min(1),
  sourceLabel: z.string().optional(),
  updatedAt: z.number().int().optional(),
});
export type DeFiAdapterError = z.infer<typeof DeFiAdapterErrorSchema>;

export const DeFiApiEnvelopeSchema = z.object({
  ok: z.boolean(),
  status: z.enum(['loaded', 'partial', 'unavailable', 'error']),
  data: z.unknown().optional(),
  warnings: z.array(z.string()).default([]),
  updatedAt: z.number().int(),
});
export type DeFiApiEnvelope<T = unknown> = Omit<z.infer<typeof DeFiApiEnvelopeSchema>, 'data'> & {
  data?: T;
};

export const DeFiBackendHealthSchema = z.object({
  enabled: z.boolean(),
  configuredAdapters: z.array(z.string()).default([]),
  unavailableAdapters: z.array(z.string()).default([]),
  cacheTtlMs: z.number().int().nonnegative(),
  requestTimeoutMs: z.number().int().positive(),
  sources: z.array(DeFiDataSourceSchema).default([]),
  updatedAt: z.number().int(),
});
export type DeFiBackendHealth = z.infer<typeof DeFiBackendHealthSchema>;

export const DeFiPositionSummarySchema = z.object({
  id: z.string().min(1),
  protocolName: DeFiProtocolNameSchema,
  protocolCategory: DeFiProtocolCategorySchema,
  positionKind: DeFiPositionKindSchema,
  walletPublicAddress: z.string().min(1),
  walletLabel: z.string().optional(),
  positionLabel: z.string().min(1),
  assetSymbols: z.array(z.string()).default([]),
  assetMints: z.array(z.string()).default([]),
  amount: z.string().optional(),
  estimatedUsdValue: z.string().optional(),
  healthLabel: z.string().optional(),
  riskLabel: z.string().optional(),
  apy: z.string().optional(),
  tvl: z.string().optional(),
  status: DeFiAdapterStatusSchema,
  statusReason: z.string().optional(),
  sourceLabel: z.string(),
  updatedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});
export type DeFiPositionSummary = z.infer<typeof DeFiPositionSummarySchema>;

export const DeFiLpPositionSchema = DeFiPositionSummarySchema.extend({
  positionKind: z.literal(DeFiPositionKind.LP),
  poolName: z.string().optional(),
  lpTokenAccount: z.string().optional(),
  tokenAAmount: z.string().optional(),
  tokenBAmount: z.string().optional(),
  impermanentLossStatus: z.enum([
    'available',
    'unavailable',
    'insufficient_historical_entry_data',
  ]),
});
export type DeFiLpPosition = z.infer<typeof DeFiLpPositionSchema>;

export const DeFiLendingPositionSchema = DeFiPositionSummarySchema.extend({
  positionKind: z.literal(DeFiPositionKind.LENDING),
  suppliedAssets: z.array(z.string()).default([]),
  borrowedAssets: z.array(z.string()).default([]),
  netValue: z.string().optional(),
  healthFactor: z.string().optional(),
  loanToValue: z.string().optional(),
  liquidationRiskLabel: z.string().optional(),
});
export type DeFiLendingPosition = z.infer<typeof DeFiLendingPositionSchema>;

export const DeFiYieldOpportunitySchema = z.object({
  id: z.string().min(1),
  asset: z.string().min(1),
  protocolName: DeFiProtocolNameSchema,
  productType: z.enum(['lending', 'lp', 'lst', 'stablecoin_yield']),
  apy: z.string().optional(),
  apr: z.string().optional(),
  tvl: z.string().optional(),
  riskNote: z.string(),
  sourceLabel: z.string(),
  status: DeFiAdapterStatusSchema,
  updatedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});
export type DeFiYieldOpportunity = z.infer<typeof DeFiYieldOpportunitySchema>;

export const DeFiLstComparisonSchema = z.object({
  id: z.string().min(1),
  tokenSymbol: z.enum(['JitoSOL', 'mSOL', 'bSOL', 'bbSOL']),
  tokenMint: z.string().optional(),
  exchangeRate: z.string().optional(),
  apy: z.string().optional(),
  tvl: z.string().optional(),
  liquidityNote: z.string().optional(),
  sourceLabel: z.string(),
  status: DeFiAdapterStatusSchema,
  statusReason: z.string().optional(),
  updatedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});
export type DeFiLstComparison = z.infer<typeof DeFiLstComparisonSchema>;

export const DeFiQuoteInputSchema = z.object({
  inputMintOrSymbol: z.string().min(1),
  outputMintOrSymbol: z.string().min(1),
  amount: z.string().min(1),
  slippageBps: z.number().int().min(0).max(5000),
  source: z.enum(['pasted', 'wallet_portfolio']),
  localOnly: z.literal(true),
});
export type DeFiQuoteInput = z.infer<typeof DeFiQuoteInputSchema>;

export const DeFiQuoteSummarySchema = z.object({
  id: z.string().min(1),
  provider: z.literal('Jupiter'),
  inputMintOrSymbol: z.string().min(1),
  outputMintOrSymbol: z.string().min(1),
  inAmount: z.string().optional(),
  outAmount: z.string().optional(),
  estimatedOutput: z.string().optional(),
  priceImpactPct: z.string().optional(),
  routeSummary: z.array(z.string()).default([]),
  feeSummary: z.string().optional(),
  quoteTimestamp: z.number().int(),
  expiresAt: z.number().int().optional(),
  status: z.enum(['idle', 'loading', 'success', 'failed', 'unavailable', 'stale']),
  error: z.string().optional(),
  warnings: z.array(z.string()).default([]),
  executionLocked: z.literal(true),
  redactionsApplied: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});
export type DeFiQuoteSummary = z.infer<typeof DeFiQuoteSummarySchema>;

export const DeFiPortfolioSummarySchema = z.object({
  id: z.string().min(1),
  walletScope: z.enum(['all_wallets', 'active_wallet', 'watch_only', 'local_vault']),
  walletCount: z.number().int().nonnegative(),
  protocolCount: z.number().int().nonnegative(),
  positionCount: z.number().int().nonnegative(),
  totalEstimatedUsdValue: z.string().optional(),
  valueDisplayedSeparately: z.literal(true),
  protocolsDetected: z.array(DeFiProtocolNameSchema).default([]),
  categoryBreakdown: z.array(z.object({
    category: DeFiProtocolCategorySchema,
    count: z.number().int().nonnegative(),
    estimatedUsdValue: z.string().optional(),
  })),
  positions: z.array(DeFiPositionSummarySchema),
  lpPositions: z.array(DeFiLpPositionSchema),
  lendingPositions: z.array(DeFiLendingPositionSchema),
  yieldOpportunities: z.array(DeFiYieldOpportunitySchema),
  lstComparisons: z.array(DeFiLstComparisonSchema),
  adapterStatuses: z.array(z.object({
    protocolName: DeFiProtocolNameSchema,
    category: DeFiProtocolCategorySchema,
    status: DeFiAdapterStatusSchema,
    reason: z.string().optional(),
    updatedAt: z.number().int().optional(),
  })),
  staleOrErrorState: z.string().optional(),
  generatedAt: z.number().int(),
  refreshedAt: z.number().int().optional(),
  warnings: z.array(z.string()).default([]),
  localOnly: z.literal(true),
});
export type DeFiPortfolioSummary = z.infer<typeof DeFiPortfolioSummarySchema>;

export const DeFiCommandCenterContextSnapshotSchema = z.object({
  storageKey: z.literal('gorkh.solana.defiCommandCenter.lastContext.v1'),
  selectedWalletScope: z.enum(['all_wallets', 'active_wallet', 'watch_only', 'local_vault']),
  detectedProtocolCount: z.number().int().nonnegative(),
  defiEstimatedValue: z.string().optional(),
  topPositionsSummary: z.array(z.string()).default([]),
  lendingRiskSummary: z.string().optional(),
  lpSummary: z.string().optional(),
  yieldComparisonSummary: z.string().optional(),
  lstComparisonSummary: z.string().optional(),
  jupiterQuoteSummary: z.string().optional(),
  staleOrErrorState: z.string().optional(),
  generatedAt: z.number().int(),
  summary: z.string(),
  redactionsApplied: z.array(z.string()),
  localOnly: z.literal(true),
});
export type DeFiCommandCenterContextSnapshot = z.infer<
  typeof DeFiCommandCenterContextSnapshotSchema
>;

export const DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY =
  'gorkh.solana.defiCommandCenter.lastContext.v1';

export const DEFI_COMMAND_CENTER_BLOCKED_ACTIONS = [
  'Execute Swap',
  'Place Limit Order',
  'Cancel Limit Order',
  'Deposit to Lending',
  'Borrow',
  'Repay',
  'Withdraw',
  'Add Liquidity',
  'Remove Liquidity',
  'Stake / Unstake LST',
  'Auto Yield Optimize',
] as const;

export const DEFI_COMMAND_CENTER_SAFETY_NOTES = [
  'DeFi Command Center v0.1 is read-only intelligence plus quote/proposal-only review.',
  'Jupiter support is quote-only; no executable swap transaction is built, stored, signed, or broadcast.',
  'Lending, LP, staking, limit order, bridge, Jito, Squads, hardware signing, Drift, and autonomous execution are locked.',
  'DeFi value is displayed separately to avoid double-counting wallet token balances.',
] as const;
