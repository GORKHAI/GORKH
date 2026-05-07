import {
  ZERION_ALLOWED_SWAP_PAIRS,
  ZERION_DEFAULT_BINARY,
  ZERION_FORK_BINARY,
  ZERION_DEFAULT_MAX_SOL_AMOUNT,
  type ZerionAgentPolicy,
  type ZerionAgentProposal,
  type ZerionExecutionApproval,
  type ZerionPolicyCheckResult,
} from '@gorkh/shared';

const SAFE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const DECIMAL_RE = /^(0|[1-9]\d*)(\.\d{1,9})?$/;
const SHELL_META_RE = /[;&|`$<>(){}[\]\\\n\r]/;

export function isAllowedZerionBinary(binary: string): boolean {
  return binary === ZERION_DEFAULT_BINARY || binary === ZERION_FORK_BINARY;
}

export function assertAllowedZerionBinary(binary: string): string {
  if (!isAllowedZerionBinary(binary)) {
    throw new Error('Only zerion or gorkh-zerion binaries are allowed.');
  }
  return binary;
}

export function assertSafeZerionName(value: string, label: string): string {
  if (!SAFE_NAME_RE.test(value) || SHELL_META_RE.test(value)) {
    throw new Error(`${label} must use only letters, numbers, dot, dash, and underscore.`);
  }
  return value;
}

export function assertSafeZerionAddress(value: string): string {
  if (value.length < 16 || value.length > 128 || SHELL_META_RE.test(value)) {
    throw new Error('Zerion address is not valid for a read-only command.');
  }
  return value;
}

export function assertSolAmount(value: string): string {
  if (!DECIMAL_RE.test(value) || decimalToNanos(value) <= 0n) {
    throw new Error('SOL amount must be a positive base-unit decimal with at most 9 decimals.');
  }
  return value;
}

export function decimalToNanos(value: string): bigint {
  if (!DECIMAL_RE.test(value)) return -1n;
  const [whole, fraction = ''] = value.split('.');
  const padded = `${fraction}000000000`.slice(0, 9);
  return BigInt(whole) * 1_000_000_000n + BigInt(padded);
}

export function isAllowedZerionSwapPair(fromToken: string, toToken: string): boolean {
  return ZERION_ALLOWED_SWAP_PAIRS.some((pair) => pair.from === fromToken && pair.to === toToken);
}

export function createDefaultZerionPolicy(now: number = Date.now()): ZerionAgentPolicy {
  return {
    name: 'gorkh-solana-tiny-swap',
    chain: 'solana',
    allowedFromToken: 'SOL',
    allowedToToken: 'USDC',
    maxSolAmount: ZERION_DEFAULT_MAX_SOL_AMOUNT,
    expiresAt: now + 24 * 60 * 60 * 1000,
    maxExecutions: 1,
    executionsUsed: 0,
    bridgeDisabled: true,
    sendDisabled: true,
    denyTransfers: true,
    denyApprovals: true,
    createdAt: now,
  };
}

export function checkZerionProposalPolicy(
  proposal: ZerionAgentProposal,
  policy: ZerionAgentPolicy,
  approval?: ZerionExecutionApproval,
  now: number = Date.now()
): ZerionPolicyCheckResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (proposal.source !== 'agent_zerion_panel') reasons.push('Execution source is not Agent Zerion panel.');
  if (proposal.chain !== 'solana' || policy.chain !== 'solana') reasons.push('Only Solana is allowed.');
  if (!isAllowedZerionSwapPair(proposal.fromToken, proposal.toToken)) {
    reasons.push('Only SOL to USDC swaps are allowed.');
  }
  if (proposal.walletName.length === 0) reasons.push('A Zerion agent wallet is required.');
  if (proposal.policyName !== policy.name) reasons.push('Proposal policy name does not match local policy.');
  if (proposal.localPolicyDigest !== policy.localOnlyDigest) reasons.push('Local policy digest mismatch.');
  if (decimalToNanos(proposal.amountSol) > decimalToNanos(policy.maxSolAmount)) {
    reasons.push('Swap amount exceeds local maximum.');
  }
  if (policy.expiresAt <= now) reasons.push('Local policy has expired.');
  if (policy.executionsUsed >= policy.maxExecutions) reasons.push('Local policy execution limit has been used.');
  if (!policy.bridgeDisabled || !policy.sendDisabled) reasons.push('Bridge and send must stay disabled.');
  if (!policy.denyTransfers) reasons.push('Transfer-deny policy is required.');
  if (!approval?.approved) reasons.push('Explicit manual approval is required.');
  if (approval && approval.source !== 'agent_zerion_panel') reasons.push('Approval source is not Agent Zerion panel.');

  warnings.push('This executes a real onchain transaction through Zerion CLI when submitted.');
  warnings.push('Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet.');

  return { allowed: reasons.length === 0, reasons, warnings };
}

export function rejectShellMetacharacters(args: readonly string[]): void {
  const unsafe = args.find((arg) => SHELL_META_RE.test(arg));
  if (unsafe) {
    throw new Error(`Zerion command argument contains blocked shell metacharacters: ${unsafe}`);
  }
}

