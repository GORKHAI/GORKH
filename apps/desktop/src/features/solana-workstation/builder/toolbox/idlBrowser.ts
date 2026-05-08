import {
  AnchorIdlSummarySchema,
  type AnchorIdlSummary,
  type IdlAccountSummary,
  type IdlInstructionSummary,
  type SolanaBuilderIdlSummary,
} from '@gorkh/shared';
import { parseIdlJson } from '../parseIdl.js';

function typeLabel(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value ?? 'unknown');
  return JSON.stringify(value);
}

function metadataAddress(idl: SolanaBuilderIdlSummary): string | undefined {
  const metadata = idl.metadata;
  const address = metadata?.address ?? metadata?.programId;
  return typeof address === 'string' ? address : undefined;
}

export function summarizeAnchorIdlJson(content: string): AnchorIdlSummary | null {
  const idl = parseIdlJson(content);
  if (!idl) return null;

  const instructions: IdlInstructionSummary[] = idl.instructions.map((instruction) => ({
    name: instruction.name,
    accounts: instruction.accounts.map((account) => ({
      name: account.name,
      writable: account.isMut,
      signer: account.isSigner,
    })),
    args: instruction.args.map((arg) => ({ name: arg.name, type: arg.type })),
  }));

  const accounts: IdlAccountSummary[] = idl.accounts.map((account) => ({
    name: account.name,
    fields:
      account.type.fields?.map((field) => ({
        name: field.name,
        type: typeLabel(field.type),
      })) ?? [],
  }));

  const candidate: AnchorIdlSummary = {
    name: idl.name,
    version: idl.version,
    programAddress: metadataAddress(idl),
    instructionCount: instructions.length,
    accountCount: accounts.length,
    typeCount: idl.types?.length ?? 0,
    eventCount: idl.events?.length ?? 0,
    errorCount: idl.errors.length,
    instructions,
    accounts,
    types: idl.types?.map((type) => type.name) ?? [],
    events: idl.events?.map((event) => event.name) ?? [],
    errors: idl.errors.map((error) => ({ code: error.code, name: error.name, message: error.msg })),
    warnings: [
      'IDL parsed locally. Raw IDL is not sent to Assistant, Context, or backend services automatically.',
    ],
    localOnly: true,
  };

  const result = AnchorIdlSummarySchema.safeParse(candidate);
  return result.success ? result.data : null;
}

export function createIdlEmptyState(): string {
  return 'No IDL loaded. Paste an Anchor IDL JSON to inspect instructions, accounts, events, errors, and types locally.';
}
