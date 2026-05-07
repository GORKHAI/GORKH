import {
  hasForbiddenHandoffField,
  ZERION_DEFAULT_MAX_SOL_AMOUNT,
  type GorkhAgentZerionProposalHandoff,
} from '@gorkh/shared';

export interface PrepareZerionHandoffInput {
  intent: string;
  policyName?: string;
  policyDigest?: string;
  walletName?: string;
  /** Default cap = ZERION_DEFAULT_MAX_SOL_AMOUNT ('0.001'). */
  maxSolAmount?: string;
}

const AMOUNT_REGEX = /([0-9]+(?:\.[0-9]+)?)\s*(?:sol|sols|◎)\b/i;
const TINY_REGEX = /(tiny|small|test)/i;

export function detectZerionProposalKind(
  intent: string
): GorkhAgentZerionProposalHandoff['proposalKind'] {
  const lowered = intent.toLowerCase();
  if (/dca/.test(lowered)) return 'zerion_dca';
  return 'zerion_tiny_swap';
}

function clampAmount(requested: string | undefined, cap: string): string {
  if (!requested) return cap;
  const num = Number(requested);
  const capNum = Number(cap);
  if (!Number.isFinite(num) || num <= 0) return cap;
  if (!Number.isFinite(capNum)) return requested;
  if (num > capNum) return cap;
  return requested;
}

export function prepareZerionHandoff(
  input: PrepareZerionHandoffInput
): GorkhAgentZerionProposalHandoff {
  const proposalKind = detectZerionProposalKind(input.intent);
  const cap = input.maxSolAmount ?? ZERION_DEFAULT_MAX_SOL_AMOUNT;
  const requestedAmount = AMOUNT_REGEX.exec(input.intent)?.[1];
  const amountSol = clampAmount(requestedAmount, cap);

  const warnings: string[] = [];
  if (!input.walletName) {
    warnings.push('No Zerion agent wallet selected. Open Zerion Executor to pick a tiny-funded wallet.');
  }
  if (requestedAmount && Number(requestedAmount) > Number(cap)) {
    warnings.push(
      `Requested amount ${requestedAmount} SOL exceeds the ${cap} SOL default cap; clamped to ${cap}.`
    );
  }
  if (!TINY_REGEX.test(input.intent) && !requestedAmount) {
    warnings.push('Defaulted to tiny test amount. Confirm inside Zerion Executor before approval.');
  }
  warnings.push('Zerion execution requires Zerion Executor approval — proposal is draft only.');

  const missingRequired = !input.walletName;

  const handoff: GorkhAgentZerionProposalHandoff = {
    id: `gorkh-zerion-handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    proposalKind,
    fromToken: 'SOL',
    toToken: 'USDC',
    amountSol,
    walletName: input.walletName,
    policyName: input.policyName,
    policyDigest: input.policyDigest,
    targetModule: 'zerion_executor',
    executionBlocked: true,
    handoffStatus: missingRequired ? 'missing_required_fields' : 'ready_for_zerion_review',
    warnings,
    createdAt: Date.now(),
    localOnly: true,
  };

  const violation = hasForbiddenHandoffField(handoff);
  if (violation) {
    throw new Error(
      `Zerion handoff refused: forbidden field "${violation}" present.`
    );
  }
  return handoff;
}

export function summarizeZerionHandoff(handoff: GorkhAgentZerionProposalHandoff): string {
  return `Zerion ${handoff.proposalKind} — ${handoff.amountSol} ${handoff.fromToken} → ${handoff.toToken}${
    handoff.walletName ? ` via ${handoff.walletName}` : ''
  } (${handoff.handoffStatus}).`;
}
