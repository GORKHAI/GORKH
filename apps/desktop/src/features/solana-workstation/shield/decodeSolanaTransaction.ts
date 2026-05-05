import {
  SolanaShieldInputKind,
  SolanaTransactionFormat,
  SolanaKnownProgramCategory,
  type SolanaDecodedTransaction,
  type SolanaDecodedInstruction,
  type SolanaDecodedAccountMeta,
  getKnownProgram,
  getProgramDisplayName,
} from '@gorkh/shared';

// ============================================================================
// Pure-TypeScript Solana Transaction Decoder
// ============================================================================
// No external SDK. No RPC. No signing. No polyfills.
// Supports legacy and versioned (v0) transaction formats.
// ============================================================================

class ByteReader {
  private offset = 0;
  constructor(private data: Uint8Array) {}

  get length(): number {
    return this.data.length;
  }

  get remaining(): number {
    return this.data.length - this.offset;
  }

  get position(): number {
    return this.offset;
  }

  readU8(): number {
    if (this.offset >= this.data.length) throw new Error('Unexpected end of data');
    return this.data[this.offset++];
  }

  readBytes(len: number): Uint8Array {
    if (this.offset + len > this.data.length) throw new Error('Unexpected end of data');
    const slice = this.data.slice(this.offset, this.offset + len);
    this.offset += len;
    return slice;
  }

  readShortU16(): number {
    let value = 0;
    let shift = 0;
    while (true) {
      if (this.offset >= this.data.length) throw new Error('Unexpected end of data');
      const byte = this.data[this.offset++];
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
      if (shift >= 21) throw new Error('ShortU16 overflow');
    }
    return value;
  }

  readPubkey(): string {
    return bytesToBase58(this.readBytes(32));
  }

  peekU8(): number {
    if (this.offset >= this.data.length) throw new Error('Unexpected end of data');
    return this.data[this.offset];
  }
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function bytesToBase58(bytes: Uint8Array): string {
  const alphabet = BASE58_ALPHABET;
  const base = BigInt(58);
  let num = BigInt(0);
  for (const byte of bytes) {
    num = (num << BigInt(8)) | BigInt(byte);
  }

  let result = '';
  if (num === BigInt(0)) {
    let zeros = 0;
    for (const byte of bytes) {
      if (byte === 0) zeros++;
      else break;
    }
    return '1'.repeat(zeros);
  }

  while (num > BigInt(0)) {
    result = alphabet[Number(num % base)] + result;
    num = num / base;
  }

  let leadingZeros = 0;
  for (const byte of bytes) {
    if (byte === 0) leadingZeros++;
    else break;
  }

  return '1'.repeat(leadingZeros) + result;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function signatureBytesToBase58(sigBytes: Uint8Array): string {
  return bytesToBase58(sigBytes);
}

function parseMessage(
  reader: ByteReader,
  isVersioned: boolean,
  _signatures: Uint8Array[]
): {
  format: typeof SolanaTransactionFormat.LEGACY | typeof SolanaTransactionFormat.VERSIONED;
  requiredSignatureCount: number;
  readonlySignedCount: number;
  readonlyUnsignedCount: number;
  accountKeys: string[];
  recentBlockhash: string;
  instructions: SolanaDecodedInstruction[];
  addressTableLookups: {
    accountKey: string;
    writableIndexes: number[];
    readonlyIndexes: number[];
  }[];
  warnings: string[];
} {
  const warnings: string[] = [];

  if (isVersioned) {
    const versionByte = reader.readU8();
    const version = versionByte & 0x7f;
    if (version !== 0) {
      warnings.push(`Versioned transaction version ${version} detected. Only v0 is fully supported.`);
    }
  }

  const numRequiredSignatures = reader.readU8();
  const numReadonlySignedAccounts = reader.readU8();
  const numReadonlyUnsignedAccounts = reader.readU8();

  const numAccounts = reader.readShortU16();
  const accountKeys: string[] = [];
  for (let i = 0; i < numAccounts; i++) {
    accountKeys.push(reader.readPubkey());
  }

  const recentBlockhash = reader.readPubkey();

  const numInstructions = reader.readShortU16();
  const instructions: SolanaDecodedInstruction[] = [];

  for (let i = 0; i < numInstructions; i++) {
    const programIdIndex = reader.readU8();
    const numAccountIndexes = reader.readShortU16();
    const accountIndexes: number[] = [];
    for (let j = 0; j < numAccountIndexes; j++) {
      accountIndexes.push(reader.readU8());
    }
    const dataLen = reader.readShortU16();
    const dataBytes = reader.readBytes(dataLen);

    const programId = accountKeys[programIdIndex] ?? 'UNKNOWN';
    const known = getKnownProgram(programId);
    const accounts: SolanaDecodedAccountMeta[] = accountIndexes.map((idx) => {
      const isSigner = idx < numRequiredSignatures;
      const isWritable =
        idx < numRequiredSignatures - numReadonlySignedAccounts ||
        (idx >= numRequiredSignatures &&
          idx < numAccounts - numReadonlyUnsignedAccounts);
      return {
        index: idx,
        address: accountKeys[idx] ?? 'UNKNOWN',
        isSigner,
        isWritable,
        source: 'static' as const,
      };
    });

    instructions.push({
      index: i,
      programId,
      programName: known?.name ?? getProgramDisplayName(programId),
      programCategory: known?.category ?? SolanaKnownProgramCategory.UNKNOWN,
      accountIndexes,
      accounts,
      dataBase64: btoa(String.fromCharCode(...dataBytes)),
      dataLength: dataLen,
      isKnownProgram: !!known,
    });
  }

  const addressTableLookups: {
    accountKey: string;
    writableIndexes: number[];
    readonlyIndexes: number[];
  }[] = [];

  if (isVersioned) {
    const numLookups = reader.readShortU16();
    for (let i = 0; i < numLookups; i++) {
      const accountKey = reader.readPubkey();
      const numWritable = reader.readShortU16();
      const writableIndexes: number[] = [];
      for (let j = 0; j < numWritable; j++) writableIndexes.push(reader.readU8());
      const numReadonly = reader.readShortU16();
      const readonlyIndexes: number[] = [];
      for (let j = 0; j < numReadonly; j++) readonlyIndexes.push(reader.readU8());
      addressTableLookups.push({ accountKey, writableIndexes, readonlyIndexes });
    }
  }

  return {
    format: isVersioned ? SolanaTransactionFormat.VERSIONED : SolanaTransactionFormat.LEGACY,
    requiredSignatureCount: numRequiredSignatures,
    readonlySignedCount: numReadonlySignedAccounts,
    readonlyUnsignedCount: numReadonlyUnsignedAccounts,
    accountKeys,
    recentBlockhash,
    instructions,
    addressTableLookups,
    warnings,
  };
}

/**
 * Decode a base64-encoded serialized Solana transaction offline.
 * No RPC. No signing. No network calls.
 */
export function decodeSolanaTransaction(base64Input: string): SolanaDecodedTransaction {
  const trimmed = base64Input.trim();
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(trimmed);
  } catch {
    throw new Error('Invalid base64 input');
  }

  let reader = new ByteReader(bytes);

  // Signatures
  const numSignatures = reader.readShortU16();
  const signatures: string[] = [];
  const signatureBytesList: Uint8Array[] = [];
  for (let i = 0; i < numSignatures; i++) {
    const sig = reader.readBytes(64);
    signatureBytesList.push(sig);
    signatures.push(signatureBytesToBase58(sig));
  }

  // Detect versioned transaction by checking first byte of message
  const isVersioned = (reader.peekU8() & 0x80) !== 0;

  const message = parseMessage(reader, isVersioned, signatureBytesList);

  if (reader.remaining > 0) {
    message.warnings.push(`Unexpected trailing bytes (${reader.remaining} bytes) after message.`);
  }

  return {
    inputKind: SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64,
    format: message.format,
    signatureCount: numSignatures,
    requiredSignatureCount: message.requiredSignatureCount,
    signatures,
    recentBlockhash: message.recentBlockhash,
    accountKeys: message.accountKeys,
    instructions: message.instructions,
    addressTableLookups: message.addressTableLookups,
    warnings: message.warnings,
  };
}
