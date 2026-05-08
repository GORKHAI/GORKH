import type { AccountDecodeInput, AccountDecodeResult, AnchorIdlSummary, IdlAccountSummary } from '@gorkh/shared';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeBase64(input: string): Uint8Array | null {
  try {
    const binary = atob(input.trim());
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function decodeHex(input: string): Uint8Array | null {
  const normalized = input.trim().replace(/^0x/i, '');
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) return null;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function decodeBase58(input: string): Uint8Array | null {
  const source = input.trim();
  if (!source || /[^1-9A-HJ-NP-Za-km-z]/.test(source)) return null;
  const bytes = [0];
  for (const char of source) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value < 0) return null;
    let carry = value;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of source) {
    if (char === '1') bytes.push(0);
    else break;
  }
  return Uint8Array.from(bytes.reverse());
}

export function detectAccountDataEncoding(rawInput: string): AccountDecodeInput['encoding'] {
  const value = rawInput.trim();
  if (!value) return 'unknown';
  if (/^(0x)?[0-9a-f]+$/i.test(value) && value.replace(/^0x/i, '').length % 2 === 0) return 'hex';
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0) return 'base64';
  if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) return 'base58';
  return 'unknown';
}

export function decodeAccountBytes(rawInput: string, encoding = detectAccountDataEncoding(rawInput)): Uint8Array | null {
  if (encoding === 'hex') return decodeHex(rawInput);
  if (encoding === 'base64') return decodeBase64(rawInput);
  if (encoding === 'base58') return decodeBase58(rawInput);
  return null;
}

function readPrimitive(bytes: Uint8Array, offset: number, type: unknown): { value: string; nextOffset: number; supported: boolean } {
  const label = typeof type === 'string' ? type : '';
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (label === 'u8' && offset + 1 <= bytes.length) return { value: String(view.getUint8(offset)), nextOffset: offset + 1, supported: true };
  if (label === 'u16' && offset + 2 <= bytes.length) return { value: String(view.getUint16(offset, true)), nextOffset: offset + 2, supported: true };
  if (label === 'u32' && offset + 4 <= bytes.length) return { value: String(view.getUint32(offset, true)), nextOffset: offset + 4, supported: true };
  if (label === 'i32' && offset + 4 <= bytes.length) return { value: String(view.getInt32(offset, true)), nextOffset: offset + 4, supported: true };
  if ((label === 'u64' || label === 'i64') && offset + 8 <= bytes.length) {
    const value = view.getBigUint64(offset, true);
    return { value: String(label === 'i64' && value > BigInt('9223372036854775807') ? value - BigInt('18446744073709551616') : value), nextOffset: offset + 8, supported: true };
  }
  if (label === 'bool' && offset + 1 <= bytes.length) return { value: view.getUint8(offset) === 1 ? 'true' : 'false', nextOffset: offset + 1, supported: true };
  if (label === 'publicKey' && offset + 32 <= bytes.length) return { value: bytesToHex(bytes.slice(offset, offset + 32)), nextOffset: offset + 32, supported: true };
  return { value: 'unsupported', nextOffset: offset, supported: false };
}

function findAccount(summary: AnchorIdlSummary | null, accountTypeName?: string): IdlAccountSummary | null {
  if (!summary?.accounts.length) return null;
  if (accountTypeName) {
    return summary.accounts.find((account) => account.name === accountTypeName) ?? null;
  }
  return summary.accounts[0] ?? null;
}

export function decodeAccountData(input: AccountDecodeInput, idlSummary: AnchorIdlSummary | null): AccountDecodeResult {
  if (!input.rawInput.trim()) {
    return { status: 'empty', byteLength: 0, encoding: 'unknown', fields: [], warnings: ['No account data provided.'], localOnly: true };
  }
  const encoding = input.encoding === 'unknown' ? detectAccountDataEncoding(input.rawInput) : input.encoding;
  const bytes = decodeAccountBytes(input.rawInput, encoding);
  if (!bytes) {
    return { status: 'invalid', byteLength: 0, encoding, fields: [], warnings: ['Account data could not be decoded.'], localOnly: true };
  }

  const account = findAccount(idlSummary, input.accountTypeName);
  const discriminatorHex = bytes.length >= 8 ? bytesToHex(bytes.slice(0, 8)) : undefined;
  if (!account) {
    return {
      status: 'unsupported',
      byteLength: bytes.length,
      encoding,
      discriminatorHex,
      fields: [],
      warnings: ['No IDL account type selected. Raw bytes are preserved locally and were not sent anywhere.'],
      localOnly: true,
    };
  }

  let offset = 8;
  const fields: AccountDecodeResult['fields'] = [];
  const warnings: string[] = [];
  for (const field of account.fields) {
    const decoded = readPrimitive(bytes, offset, field.type);
    if (!decoded.supported) {
      warnings.push(`Field "${field.name}" uses an unsupported v0.1 decoder type.`);
      break;
    }
    fields.push({ name: field.name, type: field.type, value: decoded.value });
    offset = decoded.nextOffset;
  }

  return {
    status: warnings.length > 0 ? 'unsupported' : 'decoded',
    byteLength: bytes.length,
    encoding,
    discriminatorHex,
    expectedDiscriminatorHex: account.discriminator,
    discriminatorMatched: account.discriminator ? account.discriminator === discriminatorHex : undefined,
    accountTypeName: account.name,
    fields,
    warnings: warnings.length
      ? warnings
      : ['Account data decoded locally with the v0.1 primitive decoder. No signing or RPC execution was used.'],
    localOnly: true,
  };
}
