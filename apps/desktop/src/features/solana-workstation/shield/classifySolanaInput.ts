import { SolanaShieldInputKind } from '@gorkh/shared';

const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]+$/;

function looksLikeBase58(s: string): boolean {
  return BASE58_CHARS.test(s);
}

function looksLikeBase64(s: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(s) && s.length % 4 === 0;
}

function tryBase64Decode(s: string): Uint8Array | null {
  try {
    const binary = atob(s);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Classify a raw string input as a Solana address, signature, serialized transaction, or unknown.
 * No RPC calls. No external dependencies.
 */
export function classifySolanaInput(input: string): SolanaShieldInputKind {
  const trimmed = input.trim();
  if (!trimmed) return SolanaShieldInputKind.UNKNOWN;

  // Signature: base58, ~87-88 chars (64 bytes encoded)
  if (looksLikeBase58(trimmed) && trimmed.length >= 85 && trimmed.length <= 92) {
    return SolanaShieldInputKind.SIGNATURE;
  }

  // Address: base58, ~32-44 chars (32 bytes encoded)
  if (looksLikeBase58(trimmed) && trimmed.length >= 32 && trimmed.length <= 44) {
    return SolanaShieldInputKind.ADDRESS;
  }

  // Serialized transaction base64: valid base64 that decodes to a reasonable transaction byte length
  if (looksLikeBase64(trimmed)) {
    const bytes = tryBase64Decode(trimmed);
    if (bytes && bytes.length >= 10 && bytes.length <= 65535) {
      // A valid transaction needs at least: 1 signature count + 1 signature (64 bytes) + message header (3) + 1 account key (32) + blockhash (32)
      // Minimum reasonable: ~100 bytes
      if (bytes.length >= 100) {
        return SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64;
      }
    }
  }

  return SolanaShieldInputKind.UNKNOWN;
}
