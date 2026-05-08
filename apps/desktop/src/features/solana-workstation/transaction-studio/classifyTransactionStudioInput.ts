import {
  TransactionStudioInputKind,
  type TransactionStudioInputKind as TransactionStudioInputKindType,
} from '@gorkh/shared';
import { classifySolanaInput } from '../shield/classifySolanaInput.js';
import { SolanaShieldInputKind } from '@gorkh/shared';

const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]+$/;
const BASE64_CHARS = /^[A-Za-z0-9+/=]+$/;

function tryBase64Decode(s: string): Uint8Array | null {
  try {
    const binary = atob(s);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function classifyTransactionStudioInput(
  input: string
): TransactionStudioInputKindType {
  const trimmed = input.trim();
  if (!trimmed) return TransactionStudioInputKind.UNKNOWN;

  const shieldKind = classifySolanaInput(trimmed);
  if (shieldKind === SolanaShieldInputKind.SIGNATURE) {
    return TransactionStudioInputKind.SIGNATURE;
  }
  if (shieldKind === SolanaShieldInputKind.ADDRESS) {
    return TransactionStudioInputKind.ADDRESS;
  }
  if (shieldKind === SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64) {
    const bytes = tryBase64Decode(trimmed);
    const signatureCount = bytes?.[0] ?? 255;
    if (bytes && signatureCount > 0 && signatureCount <= 32 && bytes.length > 64 * signatureCount) {
      return TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64;
    }
  }

  if (BASE58_CHARS.test(trimmed) && trimmed.length > 100 && !/[+/=]/.test(trimmed)) {
    return TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE58;
  }

  if (shieldKind === SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64) {
    return TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64;
  }

  if (BASE64_CHARS.test(trimmed) && trimmed.length % 4 === 0 && trimmed.length > 80) {
    return TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64;
  }

  return TransactionStudioInputKind.UNKNOWN;
}
