import {
  DeFiAdapterStatus,
  DeFiPositionKind,
  DeFiProtocolCategory,
  DeFiProtocolName,
  type DeFiAdapterStatus as DeFiAdapterStatusType,
  type DeFiLendingPosition,
  type DeFiLpPosition,
  type DeFiLstComparison,
  type DeFiPositionSummary,
  type DeFiYieldOpportunity,
  type WalletHubProfile,
} from '@gorkh/shared';

export interface DeFiAdapterResult {
  protocolName: DeFiProtocolName;
  category: DeFiProtocolCategory;
  status: DeFiAdapterStatusType;
  reason?: string;
  positions: DeFiPositionSummary[];
  lpPositions: DeFiLpPosition[];
  lendingPositions: DeFiLendingPosition[];
  yieldOpportunities: DeFiYieldOpportunity[];
  lstComparisons: DeFiLstComparison[];
  updatedAt?: number;
}

function adapterUnavailable(
  protocolName: DeFiProtocolName,
  category: DeFiProtocolCategory,
  reason: string
): DeFiAdapterResult {
  return {
    protocolName,
    category,
    status: DeFiAdapterStatus.UNAVAILABLE,
    reason,
    positions: [],
    lpPositions: [],
    lendingPositions: [],
    yieldOpportunities: [],
    lstComparisons: [],
  };
}

export function createReadOnlyDeFiAdapterResults(_profiles: WalletHubProfile[]): DeFiAdapterResult[] {
  return [
    adapterUnavailable(
      DeFiProtocolName.RAYDIUM,
      DeFiProtocolCategory.LIQUIDITY,
      'Raydium read-only adapter is not connected in v0.1. LP positions are unavailable. No funds are touched.'
    ),
    adapterUnavailable(
      DeFiProtocolName.ORCA,
      DeFiProtocolCategory.LIQUIDITY,
      'Orca read-only adapter is not connected in v0.1. LP positions are unavailable. No funds are touched.'
    ),
    adapterUnavailable(
      DeFiProtocolName.METEORA,
      DeFiProtocolCategory.LIQUIDITY,
      'Meteora read-only adapter is not connected in v0.1. LP positions are unavailable. No funds are touched.'
    ),
    adapterUnavailable(
      DeFiProtocolName.KAMINO,
      DeFiProtocolCategory.LENDING,
      'Kamino adapter is not connected in v0.1. Position data is unavailable. No funds are touched.'
    ),
    adapterUnavailable(
      DeFiProtocolName.MARGINFI,
      DeFiProtocolCategory.LENDING,
      'MarginFi adapter is not connected in v0.1. Position data is unavailable. No funds are touched.'
    ),
    adapterUnavailable(
      DeFiProtocolName.JITOSOL,
      DeFiProtocolCategory.LST,
      'JitoSOL public APY/TVL adapter is unavailable in v0.1. No staking, unstaking, or swapping is available.'
    ),
    adapterUnavailable(
      DeFiProtocolName.MSOL,
      DeFiProtocolCategory.LST,
      'mSOL public APY/TVL adapter is unavailable in v0.1. No staking, unstaking, or swapping is available.'
    ),
    adapterUnavailable(
      DeFiProtocolName.BSOL,
      DeFiProtocolCategory.LST,
      'bSOL public APY/TVL adapter is unavailable in v0.1. No staking, unstaking, or swapping is available.'
    ),
    adapterUnavailable(
      DeFiProtocolName.BBSOL,
      DeFiProtocolCategory.LST,
      'bbSOL public APY/TVL adapter is unavailable in v0.1. No staking, unstaking, or swapping is available.'
    ),
  ];
}

export function createLstComparisonRows(now: number = Date.now()): DeFiLstComparison[] {
  return [
    ['JitoSOL', DeFiProtocolName.JITOSOL],
    ['mSOL', DeFiProtocolName.MSOL],
    ['bSOL', DeFiProtocolName.BSOL],
    ['bbSOL', DeFiProtocolName.BBSOL],
  ].map(([tokenSymbol, protocolName]) => ({
    id: `defi-lst-${String(tokenSymbol).toLowerCase()}`,
    tokenSymbol: tokenSymbol as DeFiLstComparison['tokenSymbol'],
    sourceLabel: String(protocolName),
    status: DeFiAdapterStatus.UNAVAILABLE,
    statusReason: 'Live exchange rate, APY, TVL, and liquidity data are not connected in v0.1.',
    liquidityNote: 'Read-only comparison placeholder. Stake, unstake, and swap actions are locked.',
    updatedAt: now,
    warnings: ['No live LST data is inferred or faked.'],
    localOnly: true,
  }));
}

export function createUnavailableYieldRows(now: number = Date.now()): DeFiYieldOpportunity[] {
  return [
    {
      id: 'defi-yield-usdc-kamino',
      asset: 'USDC',
      protocolName: DeFiProtocolName.KAMINO,
      productType: 'lending',
      riskNote: 'APY unavailable until a safe public Kamino read-only adapter is connected.',
      sourceLabel: 'Kamino adapter unavailable',
      status: DeFiAdapterStatus.UNAVAILABLE,
      updatedAt: now,
      warnings: ['No yield ranking is computed from unavailable data.'],
      localOnly: true,
    },
    {
      id: 'defi-yield-sol-lst',
      asset: 'SOL',
      protocolName: DeFiProtocolName.JITOSOL,
      productType: 'lst',
      riskNote: 'LST APY unavailable until safe public data is connected.',
      sourceLabel: 'LST adapter unavailable',
      status: DeFiAdapterStatus.UNAVAILABLE,
      updatedAt: now,
      warnings: ['No recommendation to move funds is made.'],
      localOnly: true,
    },
  ];
}

export function createNoPositionPlaceholder(profile: WalletHubProfile, now: number = Date.now()): DeFiPositionSummary {
  return {
    id: `defi-empty-${profile.id}`,
    protocolName: DeFiProtocolName.JUPITER,
    protocolCategory: DeFiProtocolCategory.UNKNOWN,
    positionKind: DeFiPositionKind.QUOTE,
    walletPublicAddress: profile.publicAddress,
    walletLabel: profile.label,
    positionLabel: 'No DeFi positions detected',
    assetSymbols: [],
    assetMints: [],
    status: DeFiAdapterStatus.EMPTY,
    statusReason: 'No connected protocol adapters returned positions for this wallet scope.',
    sourceLabel: 'GORKH DeFi Command Center',
    updatedAt: now,
    warnings: ['No DeFi positions are inferred from token balances.'],
    localOnly: true,
  };
}
