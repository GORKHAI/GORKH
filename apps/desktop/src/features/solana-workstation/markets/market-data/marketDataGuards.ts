import {
  SOLANA_MARKETS_DENIED_TRADING_ACTIONS,
  SolanaMarketDataProviderId,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// marketDataGuards.ts
// ----------------------------------------------------------------------------
// Safety guards for market data operations.
// Rejects trading actions, asserts read-only providers, sanitizes inputs.
// No API key storage. No execution.
// ----------------------------------------------------------------------------

export class MarketDataGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketDataGuardError';
  }
}

export function rejectDeniedTradingAction(action: string): void {
  const normalized = action.toLowerCase().trim();
  if (SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes(normalized)) {
    throw new MarketDataGuardError(
      `Trading action "${action}" is permanently disabled. GORKH does not support swaps, trades, orders, or execution.`
    );
  }
}

export function assertReadOnlyMarketDataProvider(provider: string): void {
  const readOnlyIds: string[] = [
    SolanaMarketDataProviderId.RPC_NATIVE,
    SolanaMarketDataProviderId.SAMPLE_OFFLINE,
  ];
  if (!readOnlyIds.includes(provider)) {
    // Non-read-only providers are allowed as shells but must not execute trades
    const plannedIds: string[] = [
      SolanaMarketDataProviderId.BIRDEYE_READ_ONLY,
      SolanaMarketDataProviderId.QUICKNODE_PLANNED,
      SolanaMarketDataProviderId.PYTH_PLANNED,
      SolanaMarketDataProviderId.JUPITER_PLANNED,
      SolanaMarketDataProviderId.METEORA_PLANNED,
      SolanaMarketDataProviderId.ORCA_PLANNED,
    ];
    if (!plannedIds.includes(provider)) {
      throw new MarketDataGuardError(`Unknown market data provider: ${provider}`);
    }
  }
}

export function sanitizeProviderApiKeyInput(value: string): string {
  // Strip whitespace and limit length to prevent abuse
  const trimmed = value.trim();
  if (trimmed.length > 512) {
    throw new MarketDataGuardError('API key input exceeds maximum length.');
  }
  // Reject values that look like commands or scripts
  const dangerous = ['eval', 'exec', 'function', '=>', 'import', 'require'];
  for (const d of dangerous) {
    if (trimmed.toLowerCase().includes(d)) {
      throw new MarketDataGuardError('API key input contains invalid characters.');
    }
  }
  return trimmed;
}

export function isDeniedTradingAction(action: string): boolean {
  return SOLANA_MARKETS_DENIED_TRADING_ACTIONS.includes(action.toLowerCase().trim());
}
