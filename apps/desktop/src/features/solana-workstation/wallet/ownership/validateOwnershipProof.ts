import {
  SolanaWalletOwnershipProofResultSchema,
} from '@gorkh/shared';

const OWNERSHIP_PROOF_FORBIDDEN_FIELDS = [
  'privateKey',
  'seedPhrase',
  'mnemonic',
  'secretKey',
  'keypair',
  'signedTransaction',
  'serializedTransaction',
  'adapter',
  'walletAdapter',
];

function hasForbiddenOwnershipFields(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some((key) => OWNERSHIP_PROOF_FORBIDDEN_FIELDS.includes(key));
}
import type {
  SolanaWalletOwnershipProofRequest,
  SolanaWalletOwnershipProofResult,
} from '@gorkh/shared';

export interface OwnershipProofValidationResult {
  ok: true;
  result: SolanaWalletOwnershipProofResult;
}

export interface OwnershipProofValidationError {
  ok: false;
  error: string;
  field?: string;
}

export function validateOwnershipProof(
  request: SolanaWalletOwnershipProofRequest,
  payload: unknown,
  expectedMessage: string
): OwnershipProofValidationResult | OwnershipProofValidationError {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'Payload must be a JSON object.', field: 'root' };
  }

  const record = payload as Record<string, unknown>;

  if (hasForbiddenOwnershipFields(record)) {
    const forbidden = Object.keys(record).filter((key) =>
      OWNERSHIP_PROOF_FORBIDDEN_FIELDS.includes(key)
    );
    return {
      ok: false,
      error: `Payload contains forbidden fields: ${forbidden.join(', ')}.`,
      field: 'forbidden',
    };
  }

  const parsed = SolanaWalletOwnershipProofResultSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join('; ');
    return { ok: false, error: `Payload validation failed: ${issues}.`, field: 'schema' };
  }

  const data = parsed.data;

  if (data.handoffRequestId !== request.handoffRequestId) {
    return {
      ok: false,
      error: 'Handoff request ID mismatch.',
      field: 'handoffRequestId',
    };
  }

  if (data.requestId !== request.id) {
    return {
      ok: false,
      error: 'Request ID mismatch.',
      field: 'requestId',
    };
  }

  if (data.nonce !== request.nonce) {
    return {
      ok: false,
      error: 'Nonce mismatch.',
      field: 'nonce',
    };
  }

  if (Date.now() > request.expiresAt) {
    return {
      ok: false,
      error: 'Ownership proof request has expired.',
      field: 'expiry',
    };
  }

  if (data.publicAddress !== request.publicAddress) {
    return {
      ok: false,
      error: 'Public address mismatch.',
      field: 'publicAddress',
    };
  }

  if (data.provider !== request.provider) {
    return {
      ok: false,
      error: 'Provider mismatch.',
      field: 'provider',
    };
  }

  if (data.network !== request.network) {
    return {
      ok: false,
      error: `Network mismatch: expected ${request.network}, got ${data.network}.`,
      field: 'network',
    };
  }

  if (data.message !== expectedMessage) {
    return {
      ok: false,
      error: 'Message mismatch. The signed message does not match the expected ownership proof message.',
      field: 'message',
    };
  }

  if (!data.signature || data.signature.length < 10) {
    return {
      ok: false,
      error: 'Signature is missing or too short.',
      field: 'signature',
    };
  }

  return { ok: true, result: data };
}
