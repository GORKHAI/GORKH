import {
  SolanaWalletOwnershipProofStatus,
  SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
} from '@gorkh/shared';
import type {
  SolanaWalletOwnershipProofRequest,
  SolanaWalletHandoffRequest,
  SolanaExternalWalletProvider,
  SolanaRpcNetwork,
} from '@gorkh/shared';

export const OWNERSHIP_PROOF_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function createOwnershipProofRequest(input: {
  handoffRequest: SolanaWalletHandoffRequest;
  publicAddress: string;
  provider: SolanaExternalWalletProvider;
  network?: SolanaRpcNetwork;
  domain?: string;
}): SolanaWalletOwnershipProofRequest {
  const now = Date.now();
  const domain = input.domain ?? 'app.gorkh.ai';

  return {
    id: crypto.randomUUID(),
    handoffRequestId: input.handoffRequest.requestId,
    publicAddress: input.publicAddress,
    provider: input.provider,
    network: input.network ?? input.handoffRequest.network,
    nonce: crypto.randomUUID(),
    domain,
    statement:
      'I am proving ownership of this public Solana address to GORKH. This message signing request cannot move funds or authorize transactions.',
    message: '', // populated by buildOwnershipProofMessage
    createdAt: now,
    expiresAt: now + OWNERSHIP_PROOF_EXPIRY_MS,
    status: SolanaWalletOwnershipProofStatus.REQUESTED,
    safetyNotes: SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
  };
}
