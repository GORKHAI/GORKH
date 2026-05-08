import {
  TransactionStudioInputKind,
  type SolanaDecodedTransaction,
  type TransactionStudioAccountMeta,
  type TransactionStudioDecodedTransaction,
  type TransactionStudioInput,
  type TransactionStudioInstruction,
} from '@gorkh/shared';
import { decodeSolanaTransaction } from '../shield/decodeSolanaTransaction.js';
import { decodeTransactionStudioInstruction } from './decodeTransactionStudioInstruction.js';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapFormat(format: SolanaDecodedTransaction['format']): TransactionStudioDecodedTransaction['format'] {
  if (format === 'legacy') return 'legacy';
  if (format === 'versioned') return 'versioned_v0';
  return 'unknown';
}

function buildAccounts(decoded: SolanaDecodedTransaction): TransactionStudioAccountMeta[] {
  return decoded.accountKeys.map((address, index) => {
    const signer = index < decoded.requiredSignatureCount;
    const writable = decoded.instructions.some((ix) =>
      ix.accounts?.some((account) => account.index === index && account.isWritable)
    );
    const warnings: string[] = [];
    if (signer && writable) warnings.push('Signer account is writable.');
    if (address === 'UNKNOWN') warnings.push('Account could not be resolved offline.');

    return {
      index,
      address,
      signer,
      writable,
      source: 'static',
      label: signer ? 'Required signer' : undefined,
      warnings,
    };
  });
}

function buildInstructions(
  decoded: SolanaDecodedTransaction
): TransactionStudioInstruction[] {
  return decoded.instructions.map((ix) => {
    const accountAddresses =
      ix.accounts?.map((account) => account.address) ??
      ix.accountIndexes.map((accountIndex) => decoded.accountKeys[accountIndex] ?? 'UNKNOWN');
    const warnings: string[] = [];
    if (!ix.isKnownProgram) warnings.push('Unknown program; instruction data is not fully decoded.');
    if (accountAddresses.includes('UNKNOWN')) warnings.push('One or more account indexes are unresolved.');
    const decodedInstruction = decodeTransactionStudioInstruction(ix, accountAddresses);

    return {
      index: ix.index,
      programId: ix.programId,
      programName: ix.programName,
      knownProgram: ix.isKnownProgram,
      accountIndexes: ix.accountIndexes,
      accountAddresses,
      dataLength: ix.dataLength,
      decodedKind: decodedInstruction.decodedKind,
      summary: decodedInstruction.summary,
      warnings: [...warnings, ...decodedInstruction.warnings],
    };
  });
}

export function decodeTransactionStudioInput(
  input: TransactionStudioInput
): TransactionStudioDecodedTransaction | null {
  if (input.kind !== TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64) {
    return null;
  }

  const decoded = decodeSolanaTransaction(input.rawInput);
  const accounts = buildAccounts(decoded);
  const instructions = buildInstructions(decoded);
  const programIds = Array.from(new Set(instructions.map((ix) => ix.programId)));
  const knownProgramCount = programIds.filter((programId) =>
    instructions.some((ix) => ix.programId === programId && ix.knownProgram)
  ).length;
  const signerCount = accounts.filter((account) => account.signer).length;
  const writableAccountCount = accounts.filter((account) => account.writable).length;

  return {
    id: id('txs-decoded'),
    inputId: input.id,
    format: mapFormat(decoded.format),
    signatureCount: decoded.signatureCount,
    requiredSignatureCount: decoded.requiredSignatureCount,
    recentBlockhash: decoded.recentBlockhash,
    accountCount: decoded.accountKeys.length,
    instructionCount: decoded.instructions.length,
    programIds,
    knownProgramCount,
    unknownProgramCount: Math.max(0, programIds.length - knownProgramCount),
    signerCount,
    writableAccountCount,
    usesAddressLookupTables: decoded.addressTableLookups.length > 0,
    instructions,
    accounts,
    createdAt: Date.now(),
    warnings: [
      ...decoded.warnings,
      ...(decoded.addressTableLookups.length > 0
        ? ['Address lookup tables are referenced; offline decode may not resolve all accounts.']
        : []),
    ],
  };
}
