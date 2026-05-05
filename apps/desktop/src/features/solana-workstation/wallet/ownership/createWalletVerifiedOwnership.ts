import type { SolanaWalletOwnershipProofResult, SolanaWalletVerifiedOwnership } from '@gorkh/shared';

export function createWalletVerifiedOwnership(
  result: SolanaWalletOwnershipProofResult,
  verifier: 'local_ed25519' | 'browser_provider_claim' | 'not_verified'
): SolanaWalletVerifiedOwnership {
  return {
    publicAddress: result.publicAddress,
    provider: result.provider,
    network: result.network,
    message: result.message,
    signature: result.signature,
    verifiedAt: Date.now(),
    verifier,
    safetyNotes: [
      ...result.safetyNotes,
      `Verifier: ${verifier}`,
      'Ownership proof does not authorize transactions.',
    ],
  };
}
