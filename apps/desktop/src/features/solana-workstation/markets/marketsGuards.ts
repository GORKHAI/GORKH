import { SOLANA_MARKETS_DENIED_FEATURES } from '@gorkh/shared';

export function assertSafeMarketsLabel(label: string): void {
  const lower = label.toLowerCase();
  for (const denied of SOLANA_MARKETS_DENIED_FEATURES) {
    if (lower.includes(denied)) {
      throw new Error(`Markets label cannot reference denied feature: ${denied}`);
    }
  }
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
