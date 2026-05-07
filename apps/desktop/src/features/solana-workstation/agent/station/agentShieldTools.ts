import type {
  GorkhAgentShieldInputKind,
  GorkhAgentShieldToolResult,
} from '@gorkh/shared';

export interface PrepareShieldHandoffInput {
  intent: string;
  /** Pre-extracted candidate (e.g. signature pulled from intent). */
  candidate?: string;
}

export function classifyShieldInput(text: string): GorkhAgentShieldInputKind {
  const t = text.trim();
  if (!t) return 'unknown';
  // Solana base58 signatures are 87-88 chars, Pubkeys 32-44 chars.
  if (/^[1-9A-HJ-NP-Za-km-z]{86,90}$/.test(t)) return 'transaction_signature';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return 'address';
  if (/^[A-Za-z0-9+/=]{40,}$/.test(t) && t.length % 4 === 0) return 'base64_transaction';
  if (/^[1-9A-HJ-NP-Za-km-z]{40,}$/.test(t)) return 'base58_transaction';
  return 'unknown';
}

const SIGNATURE_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{86,90}\b/;
const ADDRESS_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

export function extractShieldCandidate(intent: string): string | undefined {
  const sig = SIGNATURE_REGEX.exec(intent);
  if (sig) return sig[0];
  const addr = ADDRESS_REGEX.exec(intent);
  if (addr) return addr[0];
  return undefined;
}

export function prepareShieldHandoff(
  input: PrepareShieldHandoffInput
): GorkhAgentShieldToolResult {
  const candidate = input.candidate ?? extractShieldCandidate(input.intent) ?? '';
  const inputKind = candidate ? classifyShieldInput(candidate) : 'unknown';
  const warnings: string[] = [];

  if (!candidate) {
    warnings.push(
      'No transaction signature or address detected. Open Shield and paste the input manually.'
    );
  } else if (inputKind === 'unknown') {
    warnings.push('Could not classify the Shield input. Manual review required.');
  }

  return {
    inputKind,
    decodedAvailable: false,
    riskFindingCount: 0,
    simulationAvailable: false,
    prefilledInput: candidate.slice(0, 8192),
    targetModule: 'shield',
    handoffStatus: 'ready_for_manual_review',
    warnings,
    source: 'shield_context',
    localOnly: true,
  };
}

export function summarizeShieldResult(result: GorkhAgentShieldToolResult): string {
  if (!result.prefilledInput) {
    return 'Shield handoff prepared without a candidate. Open Shield and paste input manually.';
  }
  return `Shield handoff prepared (${result.inputKind}). Open Shield to decode/simulate manually.`;
}
