import {
  DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY,
  DeFiCommandCenterContextSnapshotSchema,
  type DeFiCommandCenterContextSnapshot,
  type DeFiPortfolioSummary,
  type DeFiQuoteSummary,
} from '@gorkh/shared';

export const DEFI_COMMAND_CENTER_LOCAL_CONTEXT_KEY =
  'gorkh.solana.defiCommandCenter.lastContext.v1';

const FORBIDDEN_SERIALIZED_PATTERNS = [
  /privateKey/i,
  /private\s+key/i,
  /seed\s+phrase/i,
  /wallet\s+json/i,
  /secretKey/i,
  /rawSigning/i,
  /serialized.*transaction/i,
  /swapTransaction/i,
  /execute.*payload/i,
  /api\s+key/i,
  /auth\s+header/i,
  /cloak\s+note/i,
  /viewing\s+key/i,
  /zerion.*token/i,
  /\bsk_[A-Za-z0-9_-]{16,}/,
  /\bzk_[A-Za-z0-9_-]{16,}/,
];

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function assertSafeDeFiSerialized(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const pattern of FORBIDDEN_SERIALIZED_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error('DeFi Command Center storage rejected forbidden secret or executable payload material.');
    }
  }
}

export function createDeFiContextSnapshot(input: {
  portfolio: DeFiPortfolioSummary;
  quote?: DeFiQuoteSummary | null;
  now?: number;
}): DeFiCommandCenterContextSnapshot {
  const now = input.now ?? Date.now();
  const topPositionsSummary = input.portfolio.positions
    .filter((position) => position.status === 'loaded')
    .slice(0, 5)
    .map((position) => `${position.protocolName}: ${position.positionLabel}`);
  const summary = [
    `DeFi Command Center reviewed ${input.portfolio.walletCount} wallet profile(s).`,
    `Detected ${input.portfolio.protocolCount} protocol(s) and ${input.portfolio.positionCount} loaded position(s).`,
    input.portfolio.totalEstimatedUsdValue
      ? `Estimated DeFi value is $${input.portfolio.totalEstimatedUsdValue}, displayed separately from token balances.`
      : 'Estimated DeFi value is unavailable and displayed separately from token balances.',
    'Jupiter quote is quote-only. Lending, LP, LST, limit order, and optimize actions are locked.',
  ].join(' ');

  return DeFiCommandCenterContextSnapshotSchema.parse({
    storageKey: DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY,
    selectedWalletScope: input.portfolio.walletScope,
    detectedProtocolCount: input.portfolio.protocolCount,
    defiEstimatedValue: input.portfolio.totalEstimatedUsdValue,
    topPositionsSummary,
    lendingRiskSummary: input.portfolio.lendingPositions.length
      ? `${input.portfolio.lendingPositions.length} lending position(s) loaded.`
      : 'No lending position data loaded.',
    lpSummary: input.portfolio.lpPositions.length
      ? `${input.portfolio.lpPositions.length} LP position(s) loaded.`
      : 'No LP position data loaded.',
    yieldComparisonSummary: `${input.portfolio.yieldOpportunities.length} read-only yield comparison row(s); unavailable data is not ranked.`,
    lstComparisonSummary: `${input.portfolio.lstComparisons.length} LST comparison row(s); no stake/unstake/swap action is available.`,
    jupiterQuoteSummary: input.quote
      ? `Jupiter quote status: ${input.quote.status}; executionLocked=${String(input.quote.executionLocked)}.`
      : 'No Jupiter quote requested.',
    staleOrErrorState: input.portfolio.staleOrErrorState,
    generatedAt: now,
    summary,
    redactionsApplied: [
      'defi.privateKeysExcluded',
      'defi.executableTransactionsExcluded',
      'defi.apiKeysExcluded',
      'defi.rawProtocolPayloadsExcluded',
    ],
    localOnly: true,
  });
}

export function saveDeFiContextSnapshot(snapshot: DeFiCommandCenterContextSnapshot): void {
  const parsed = DeFiCommandCenterContextSnapshotSchema.parse(snapshot);
  assertSafeDeFiSerialized(parsed);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY, JSON.stringify(parsed));
}

export function loadDeFiContextSnapshot(): DeFiCommandCenterContextSnapshot | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(DEFI_COMMAND_CENTER_CONTEXT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = DeFiCommandCenterContextSnapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
