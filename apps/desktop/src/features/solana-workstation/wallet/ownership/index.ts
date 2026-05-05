export { createOwnershipProofRequest, OWNERSHIP_PROOF_EXPIRY_MS } from './createOwnershipProofRequest.js';
export { buildOwnershipProofMessageFromRequest } from './buildOwnershipProofMessage.js';
export { validateOwnershipProof } from './validateOwnershipProof.js';
export {
  loadPendingOwnershipProofRequest,
  savePendingOwnershipProofRequest,
  clearPendingOwnershipProofRequest,
  loadVerifiedOwnershipProofs,
  saveVerifiedOwnershipProof,
  clearVerifiedOwnershipProofs,
} from './ownershipProofStorage.js';
export { createWalletVerifiedOwnership } from './createWalletVerifiedOwnership.js';
export { verifySolanaMessageSignature } from '@gorkh/shared';
