import {
  SOLANA_WALLET_DISABLED_SIGNING_METHODS,
  SOLANA_WALLET_DENIED_CAPABILITIES,
  type SolanaExternalWalletProvider,
  type SolanaWalletConnectionState,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// walletConnectionGuards.ts
// ----------------------------------------------------------------------------
// Safety guards for external wallet connection.
// Rejects signing, execution, and private key exposure.
// ----------------------------------------------------------------------------

export function rejectSigningCapabilityExposure(methodName: string): void {
  if (SOLANA_WALLET_DISABLED_SIGNING_METHODS.includes(methodName)) {
    throw new Error(
      `GORKH Wallet blocks signing method "${methodName}". External wallet connection is read-only.`
    );
  }
}

export function assertReadOnlyWalletConnectionState(
  state: SolanaWalletConnectionState
): void {
  if (state.status === 'connected_read_only') {
    return;
  }
  if (state.status === 'error') {
    throw new Error(`Wallet connection error: ${state.error ?? 'Unknown error'}`);
  }
  if (state.status === 'unsupported') {
    throw new Error('Wallet connection is unsupported in this environment.');
  }
}

export function sanitizeWalletProviderName(name: unknown): SolanaExternalWalletProvider {
  if (typeof name !== 'string') return 'unknown';
  const lower = name.toLowerCase().trim();
  if (lower.includes('solflare')) return 'solflare';
  if (lower.includes('phantom')) return 'phantom';
  if (lower.includes('backpack')) return 'backpack';
  if (lower.includes('wallet_standard') || lower.includes('walletstandard')) return 'wallet_standard';
  return 'unknown';
}

export function validateConnectedPublicAddress(address: unknown): string | null {
  if (typeof address !== 'string') return 'Public address must be a string.';
  const trimmed = address.trim();
  if (!trimmed) return 'Public address is empty.';
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return 'Invalid Solana public address format.';
  }
  return null;
}

export function isDeniedWalletConnectionCapability(capability: string): boolean {
  return SOLANA_WALLET_DENIED_CAPABILITIES.includes(capability);
}
