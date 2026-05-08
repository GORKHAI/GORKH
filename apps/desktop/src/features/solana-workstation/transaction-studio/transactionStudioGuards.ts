import {
  TRANSACTION_STUDIO_ALLOWED_RPC_METHODS,
  TRANSACTION_STUDIO_BLOCKED_CAPABILITIES,
} from '@gorkh/shared';

const BLOCKED_PHRASES = [
  /broadcast\s+this/i,
  /send\s+raw\s+transaction/i,
  /sendTransaction/i,
  /sendRawTransaction/i,
  /requestAirdrop/i,
  /signTransaction/i,
  /signAllTransactions/i,
  /signMessage/i,
  /submit\s+bundle/i,
  /jito/i,
  /private\s+key/i,
  /seed\s+phrase/i,
  /wallet\s+json/i,
  /arbitrary\s+shell/i,
  /terminal\s+command/i,
];

const SECRET_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'seed_phrase_shape', pattern: /\b(?:[a-z]{3,12}\s+){11,23}[a-z]{3,12}\b/i },
  { id: 'private_key_array_shape', pattern: /\[(?:\s*\d{1,3}\s*,){30,}\s*\d{1,3}\s*\]/g },
  { id: 'solana_keypair_json_shape', pattern: /"secretKey"\s*:\s*\[/i },
  { id: 'viewing_key_shape', pattern: /\b(viewing[_ -]?key|cloak[_ -]?note)\b\s*[:=]\s*\S+/i },
  { id: 'api_token_shape', pattern: /\b(api[_ -]?key|token|bearer)\b\s*[:=]\s*[A-Za-z0-9._-]{20,}/i },
];

export const TRANSACTION_STUDIO_LOCKED_COPY =
  'Broadcast is locked in Transaction Studio v0.1. Decode and simulation review are available.';

export function isTransactionStudioBlockedIntent(text: string): boolean {
  return BLOCKED_PHRASES.some((pattern) => pattern.test(text));
}

export function assertTransactionStudioSafeIntent(text: string): void {
  if (isTransactionStudioBlockedIntent(text)) {
    throw new Error(TRANSACTION_STUDIO_LOCKED_COPY);
  }
}

export function assertTransactionStudioAllowedRpcMethod(method: string): void {
  if (!TRANSACTION_STUDIO_ALLOWED_RPC_METHODS.includes(method as never)) {
    throw new Error(`Transaction Studio blocks RPC method "${method}".`);
  }
}

export function redactTransactionStudioInput(input: string): {
  value: string;
  redactionsApplied: string[];
} {
  let value = input;
  const redactionsApplied: string[] = [];

  for (const secret of SECRET_PATTERNS) {
    if (secret.pattern.test(value)) {
      value = value.replace(secret.pattern, '[redacted secret material]');
      redactionsApplied.push(secret.id);
    }
  }

  return { value, redactionsApplied };
}

export function getTransactionStudioBlockedCapabilities(): readonly string[] {
  return TRANSACTION_STUDIO_BLOCKED_CAPABILITIES;
}
