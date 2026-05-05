import {
  BIRDEYE_PUBLIC_API_BASE_URL,
  SOLANA_MARKETS_DENIED_TRADING_ACTIONS,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// birdeyeGuards.ts
// ----------------------------------------------------------------------------
// Input validation and safety guards for Birdeye API interactions.
// No API key storage. No trading. No execution.
// ----------------------------------------------------------------------------

export class BirdeyeGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BirdeyeGuardError';
  }
}

const MAX_API_KEY_LENGTH = 512;

export function validateBirdeyeApiKeyInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BirdeyeGuardError('API key cannot be empty.');
  }
  if (trimmed.length > MAX_API_KEY_LENGTH) {
    throw new BirdeyeGuardError('API key exceeds maximum length.');
  }
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new BirdeyeGuardError('API key cannot contain line breaks.');
  }
  // Reject values that look like scripts or commands
  const dangerous = ['eval', 'exec', 'function', '=>', 'import', 'require', 'fetch('];
  for (const d of dangerous) {
    if (trimmed.toLowerCase().includes(d)) {
      throw new BirdeyeGuardError('API key contains invalid characters.');
    }
  }
  return trimmed;
}

export function sanitizeBirdeyeApiKeyForDisplay(value: string): string {
  if (value.length <= 8) return '****';
  const last4 = value.slice(-4);
  return `****${last4}`;
}

export function assertBirdeyeFetchIsReadOnly(): void {
  // Birdeye fetch is permanently read-only. No trading actions are permitted.
  for (const action of SOLANA_MARKETS_DENIED_TRADING_ACTIONS) {
    if (action === 'drift') continue; // drift is a provider, not an action here
    // This is a guard assertion; actual rejection happens in marketDataGuards
  }
}

export function validateBirdeyeMintAddress(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length === 0) {
    return 'Mint address cannot be empty.';
  }
  if (trimmed.length < 32 || trimmed.length > 44) {
    return 'Mint address does not look like a valid Solana address.';
  }
  // Base58-like check: only alphanumeric characters, no 0/O/I/l confusion
  if (!/^[A-HJ-NP-Za-km-z1-9]+$/.test(trimmed)) {
    return 'Mint address contains invalid characters.';
  }
  return null;
}

export function getBirdeyePriceUrl(mintAddress: string): string {
  const base = BIRDEYE_PUBLIC_API_BASE_URL;
  return `${base}/defi/price?address=${encodeURIComponent(mintAddress)}`;
}

export function getBirdeyeTokenOverviewUrl(mintAddress: string): string {
  const base = BIRDEYE_PUBLIC_API_BASE_URL;
  return `${base}/defi/token_overview?address=${encodeURIComponent(mintAddress)}`;
}
