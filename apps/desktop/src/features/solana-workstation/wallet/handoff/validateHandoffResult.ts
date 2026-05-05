import {
  SolanaWalletHandoffPayloadSchema,
  SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS,
  hasForbiddenHandoffPayloadFields,
} from '@gorkh/shared';
import type {
  SolanaWalletHandoffRequest,
  SolanaWalletHandoffResult,
  SolanaWalletHandoffPayload,
} from '@gorkh/shared';

export interface HandoffValidationResult {
  ok: true;
  result: SolanaWalletHandoffResult;
}

export interface HandoffValidationError {
  ok: false;
  error: string;
  field?: string;
}

export function validateHandoffResult(
  request: SolanaWalletHandoffRequest,
  payload: unknown
): HandoffValidationResult | HandoffValidationError {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'Payload must be a JSON object.', field: 'root' };
  }

  const record = payload as Record<string, unknown>;

  // Reject any payload containing forbidden fields (private keys, signatures, etc.)
  if (hasForbiddenHandoffPayloadFields(record)) {
    const forbidden = Object.keys(record).filter((key) =>
      SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes(key)
    );
    return {
      ok: false,
      error: `Payload contains forbidden fields: ${forbidden.join(', ')}.`,
      field: 'forbidden',
    };
  }

  const parsed = SolanaWalletHandoffPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join('; ');
    return { ok: false, error: `Payload validation failed: ${issues}.`, field: 'schema' };
  }

  const data: SolanaWalletHandoffPayload = parsed.data;

  if (data.requestId !== request.requestId) {
    return {
      ok: false,
      error: 'Request ID mismatch. The payload was generated for a different handoff request.',
      field: 'requestId',
    };
  }

  if (data.nonce !== request.nonce) {
    return {
      ok: false,
      error: 'Nonce mismatch. The payload may have been tampered with or replayed.',
      field: 'nonce',
    };
  }

  if (Date.now() > request.expiry) {
    return {
      ok: false,
      error: 'Handoff request has expired. Please start a new connection.',
      field: 'expiry',
    };
  }

  // Only devnet is supported in Phase 14 for safety
  if (data.network !== request.network) {
    return {
      ok: false,
      error: `Network mismatch: expected ${request.network}, got ${data.network}.`,
      field: 'network',
    };
  }

  const result: SolanaWalletHandoffResult = {
    requestId: data.requestId,
    nonce: data.nonce,
    publicAddress: data.publicAddress,
    provider: data.provider,
    network: data.network,
    connectedAt: data.connectedAt,
    safetyNotes: data.safetyNotes,
  };

  return { ok: true, result };
}
