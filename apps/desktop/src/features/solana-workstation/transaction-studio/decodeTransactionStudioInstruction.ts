import type { SolanaDecodedInstruction } from '@gorkh/shared';

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q';
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';
const MEMO_PROGRAM_IDS = new Set([
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
]);

interface InstructionDecode {
  decodedKind?: string;
  summary: string;
  warnings: string[];
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readU32Le(bytes: Uint8Array, offset: number): number | null {
  if (offset + 4 > bytes.length) return null;
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function readU64LeString(bytes: Uint8Array, offset: number): string | null {
  if (offset + 8 > bytes.length) return null;
  let value = BigInt(0);
  for (let index = 0; index < 8; index += 1) {
    value |= BigInt(bytes[offset + index]) << BigInt(index * 8);
  }
  return value.toString();
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function compactAddress(addresses: string[], index: number): string {
  const value = addresses[index];
  if (!value) return `account[${index}]`;
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function decodeSystemInstruction(bytes: Uint8Array, accounts: string[]): InstructionDecode {
  const tag = readU32Le(bytes, 0);
  if (tag === null) {
    return {
      decodedKind: 'system_unknown',
      summary: 'System Program instruction with truncated discriminator.',
      warnings: ['System instruction data is too short to decode safely.'],
    };
  }

  if (tag === 0) {
    const lamports = readU64LeString(bytes, 4);
    const space = readU64LeString(bytes, 12);
    return {
      decodedKind: 'system_create_account',
      summary: `Create account ${compactAddress(accounts, 1)} funded by ${compactAddress(accounts, 0)} with ${lamports ?? 'unknown'} lamports and ${space ?? 'unknown'} byte(s) of space.`,
      warnings: [],
    };
  }

  if (tag === 1) {
    return {
      decodedKind: 'system_assign',
      summary: `Assign ${compactAddress(accounts, 0)} to a new owner program.`,
      warnings: ['Verify the assigned owner program before approval.'],
    };
  }

  if (tag === 2) {
    const lamports = readU64LeString(bytes, 4);
    return {
      decodedKind: 'system_transfer',
      summary: `Transfer ${lamports ?? 'unknown'} lamports from ${compactAddress(accounts, 0)} to ${compactAddress(accounts, 1)}.`,
      warnings: [],
    };
  }

  if (tag === 3) {
    return {
      decodedKind: 'system_create_account_with_seed',
      summary: `Create account with seed for ${compactAddress(accounts, 1)}.`,
      warnings: ['Seed-derived account creation should match the expected owner and base account.'],
    };
  }

  return {
    decodedKind: `system_instruction_${tag}`,
    summary: `System Program instruction ${tag} touching ${accounts.length} account(s).`,
    warnings: ['This System Program instruction is recognized only by discriminator.'],
  };
}

function decodeTokenInstruction(
  bytes: Uint8Array,
  accounts: string[],
  token2022: boolean
): InstructionDecode {
  const tag = bytes[0];
  const prefix = token2022 ? 'token_2022' : 'spl_token';
  const programLabel = token2022 ? 'Token-2022' : 'SPL Token';
  const amount = readU64LeString(bytes, 1);

  switch (tag) {
    case 3:
      return {
        decodedKind: `${prefix}_transfer`,
        summary: `${programLabel} transfer of ${amount ?? 'unknown'} base units from ${compactAddress(accounts, 0)} to ${compactAddress(accounts, 1)}.`,
        warnings: [],
      };
    case 4:
      return {
        decodedKind: `${prefix}_approve`,
        summary: `${programLabel} approve delegate ${compactAddress(accounts, 1)} for ${amount ?? 'unknown'} base units.`,
        warnings: ['Delegate approvals can allow future token movement. Verify delegate and amount.'],
      };
    case 6:
      return {
        decodedKind: `${prefix}_set_authority`,
        summary: `${programLabel} authority change for ${compactAddress(accounts, 0)}.`,
        warnings: ['Token authority changes can transfer control. Verify the new authority.'],
      };
    case 7:
      return {
        decodedKind: `${prefix}_mint_to`,
        summary: `${programLabel} mint ${amount ?? 'unknown'} base units to ${compactAddress(accounts, 1)}.`,
        warnings: ['Mint authority is involved. Verify mint and destination account.'],
      };
    case 8:
      return {
        decodedKind: `${prefix}_burn`,
        summary: `${programLabel} burn ${amount ?? 'unknown'} base units from ${compactAddress(accounts, 0)}.`,
        warnings: [],
      };
    case 12:
      return {
        decodedKind: `${prefix}_transfer_checked`,
        summary: `${programLabel} checked transfer of ${amount ?? 'unknown'} base units from ${compactAddress(accounts, 0)} to ${compactAddress(accounts, 2)}.`,
        warnings: [],
      };
    case 14:
      return {
        decodedKind: `${prefix}_mint_to_checked`,
        summary: `${programLabel} checked mint of ${amount ?? 'unknown'} base units to ${compactAddress(accounts, 1)}.`,
        warnings: ['Mint authority is involved. Verify mint and destination account.'],
      };
    case 15:
      return {
        decodedKind: `${prefix}_burn_checked`,
        summary: `${programLabel} checked burn of ${amount ?? 'unknown'} base units from ${compactAddress(accounts, 1)}.`,
        warnings: [],
      };
    default:
      return {
        decodedKind: `${prefix}_instruction_${tag ?? 'unknown'}`,
        summary: `${programLabel} instruction ${tag ?? 'unknown'} touching ${accounts.length} account(s).`,
        warnings: ['This token instruction is recognized only by discriminator.'],
      };
  }
}

function decodeComputeBudgetInstruction(bytes: Uint8Array): InstructionDecode {
  const tag = bytes[0];
  if (tag === 0) {
    return {
      decodedKind: 'compute_budget_request_units_deprecated',
      summary: 'Deprecated compute budget request instruction.',
      warnings: ['Deprecated compute budget instruction present.'],
    };
  }
  if (tag === 1) {
    return {
      decodedKind: 'compute_budget_request_heap_frame',
      summary: `Request heap frame of ${readU32Le(bytes, 1) ?? 'unknown'} byte(s).`,
      warnings: [],
    };
  }
  if (tag === 2) {
    return {
      decodedKind: 'compute_budget_set_unit_limit',
      summary: `Set compute unit limit to ${readU32Le(bytes, 1) ?? 'unknown'}.`,
      warnings: [],
    };
  }
  if (tag === 3) {
    return {
      decodedKind: 'compute_budget_set_unit_price',
      summary: `Set compute unit price to ${readU64LeString(bytes, 1) ?? 'unknown'} micro-lamports.`,
      warnings: [],
    };
  }
  return {
    decodedKind: `compute_budget_instruction_${tag ?? 'unknown'}`,
    summary: `Compute Budget instruction ${tag ?? 'unknown'}.`,
    warnings: ['Unknown compute budget discriminator.'],
  };
}

function decodeMemoInstruction(bytes: Uint8Array): InstructionDecode {
  const memo = decodeUtf8(bytes);
  return {
    decodedKind: 'memo',
    summary: memo ? `Memo: ${memo.slice(0, 120)}` : 'Memo instruction with undecodable text.',
    warnings: memo && memo.length > 120 ? ['Memo truncated in Transaction Studio summary.'] : [],
  };
}

export function decodeTransactionStudioInstruction(
  instruction: SolanaDecodedInstruction,
  accountAddresses: string[]
): InstructionDecode {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(instruction.dataBase64);
  } catch {
    return {
      decodedKind: undefined,
      summary: `${instruction.programName} instruction with ${instruction.dataLength} byte(s) of data.`,
      warnings: ['Instruction data could not be decoded from base64.'],
    };
  }

  if (instruction.programId === SYSTEM_PROGRAM_ID) {
    return decodeSystemInstruction(bytes, accountAddresses);
  }
  if (instruction.programId === TOKEN_PROGRAM_ID) {
    return decodeTokenInstruction(bytes, accountAddresses, false);
  }
  if (instruction.programId === TOKEN_2022_PROGRAM_ID) {
    return decodeTokenInstruction(bytes, accountAddresses, true);
  }
  if (instruction.programId === COMPUTE_BUDGET_PROGRAM_ID) {
    return decodeComputeBudgetInstruction(bytes);
  }
  if (MEMO_PROGRAM_IDS.has(instruction.programId)) {
    return decodeMemoInstruction(bytes);
  }

  return {
    decodedKind: undefined,
    summary: `${instruction.programName} instruction touching ${accountAddresses.length} account(s), ${instruction.dataLength} byte(s) of data.`,
    warnings: [],
  };
}
