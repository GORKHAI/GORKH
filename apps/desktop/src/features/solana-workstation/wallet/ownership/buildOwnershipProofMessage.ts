import { buildOwnershipProofMessage as sharedBuildOwnershipProofMessage } from '@gorkh/shared';
import type { SolanaWalletOwnershipProofRequest } from '@gorkh/shared';

export function buildOwnershipProofMessageFromRequest(
  request: SolanaWalletOwnershipProofRequest
): string {
  return sharedBuildOwnershipProofMessage({
    publicAddress: request.publicAddress,
    provider: request.provider,
    network: request.network,
    requestId: request.id,
    handoffRequestId: request.handoffRequestId,
    nonce: request.nonce,
    domain: request.domain,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    statement: request.statement,
  });
}
