import {
  WALLET_HUB_CONTEXT_STORAGE_KEY,
  type ConsolidatedPortfolioSummary,
  type PortfolioContextSnapshot,
  type WalletHubProfile,
} from '@gorkh/shared';

export function createWalletHubContextSnapshot(input: {
  profiles: WalletHubProfile[];
  activeProfile: WalletHubProfile | null;
  portfolio: ConsolidatedPortfolioSummary;
  now?: number;
}): PortfolioContextSnapshot {
  const now = input.now ?? Date.now();
  const topTokens = Array.from(
    new Set(
      input.portfolio.tokenBalances
        .map((balance) => balance.symbol ?? balance.mint)
        .filter(Boolean)
        .slice(0, 5)
    )
  );
  const staleOrErrorState =
    input.portfolio.wallets.some((wallet) => wallet.balanceStatus === 'error')
      ? 'One or more wallet balance fetches failed.'
      : input.portfolio.wallets.every((wallet) => wallet.balanceStatus === 'idle')
        ? 'Portfolio has not been refreshed in this session.'
        : undefined;

  const summary = [
    `Wallet Hub has ${input.profiles.length} profiles: ${input.portfolio.localVaultCount} local vault, ${input.portfolio.watchOnlyCount} watch-only, ${input.portfolio.browserHandoffCount} browser handoff.`,
    input.activeProfile ? `Active wallet is ${input.activeProfile.label}.` : 'No active wallet selected.',
    input.portfolio.totalEstimatedUsdValue
      ? `Estimated total portfolio value is $${input.portfolio.totalEstimatedUsdValue}.`
      : 'Estimated total portfolio value is unavailable.',
    topTokens.length ? `Top assets: ${topTokens.join(', ')}.` : 'No token assets loaded.',
    'Prices are estimates. No secrets included.',
  ].join(' ');

  return {
    storageKey: WALLET_HUB_CONTEXT_STORAGE_KEY,
    activeWalletLabel: input.activeProfile?.label,
    activeWalletPublicAddress: input.activeProfile?.publicAddress,
    walletCount: input.profiles.length,
    watchOnlyCount: input.portfolio.watchOnlyCount,
    localVaultCount: input.portfolio.localVaultCount,
    totalEstimatedUsdValue: input.portfolio.totalEstimatedUsdValue,
    topTokens,
    staleOrErrorState,
    generatedAt: now,
    summary,
    redactionsApplied: ['walletHub.context.secretFieldsExcluded'],
    localOnly: true,
  };
}
