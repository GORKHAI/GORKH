import { ed25519 } from '@noble/curves/ed25519.js';
import bs58 from 'bs58';

export type SignatureEncoding = 'base58' | 'base64' | 'hex' | 'unknown';

function decodeBase58(input: string): Uint8Array {
  return bs58.decode(input);
}

function decodeBase64(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeHex(input: string): Uint8Array {
  const hex = input.replace(/^0x/, '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function decodeSignature(signature: string, encoding: SignatureEncoding): Uint8Array | null {
  try {
    switch (encoding) {
      case 'base58':
        return decodeBase58(signature);
      case 'base64':
        return decodeBase64(signature);
      case 'hex':
        return decodeHex(signature);
      default:
        try {
          return decodeBase58(signature);
        } catch {
          return decodeBase64(signature);
        }
    }
  } catch {
    return null;
  }
}

function decodePublicKey(publicAddress: string): Uint8Array | null {
  try {
    return decodeBase58(publicAddress);
  } catch {
    return null;
  }
}

/**
 * Verify an Ed25519 signature on a UTF-8 message.
 * Solana wallets sign the raw message bytes (not a prefixed hash).
 */
export function verifySolanaMessageSignature(input: {
  message: string;
  signature: string;
  signatureEncoding: SignatureEncoding;
  publicAddress: string;
}): boolean {
  const publicKey = decodePublicKey(input.publicAddress);
  if (!publicKey || publicKey.length !== 32) {
    return false;
  }

  const signature = decodeSignature(input.signature, input.signatureEncoding);
  if (!signature || signature.length !== 64) {
    return false;
  }

  const messageBytes = new TextEncoder().encode(input.message);

  try {
    return ed25519.verify(signature, messageBytes, publicKey);
  } catch {
    return false;
  }
}
