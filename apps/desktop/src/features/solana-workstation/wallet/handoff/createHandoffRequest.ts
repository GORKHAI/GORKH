import type { SolanaWalletHandoffRequest, SolanaRpcNetwork } from '@gorkh/shared';

export const HANDOFF_REQUEST_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function createHandoffRequest(input: {
  network?: SolanaRpcNetwork;
}): SolanaWalletHandoffRequest {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    network: input.network ?? 'devnet',
    expiry: now + HANDOFF_REQUEST_EXPIRY_MS,
    createdAt: now,
  };
}
