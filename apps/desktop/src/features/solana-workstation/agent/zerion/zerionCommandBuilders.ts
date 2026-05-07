import type { ZerionAgentPolicy, ZerionAgentProposal } from '@gorkh/shared';
import {
  assertAllowedZerionBinary,
  assertSafeZerionAddress,
  assertSafeZerionName,
  assertSolAmount,
  checkZerionProposalPolicy,
  rejectShellMetacharacters,
} from './zerionPolicyGuards.js';

export interface ZerionBuiltCommand {
  binary: string;
  args: string[];
  preview: string[];
}

function build(binary: string, args: string[]): ZerionBuiltCommand {
  const safeBinary = assertAllowedZerionBinary(binary);
  rejectShellMetacharacters([safeBinary, ...args]);
  return { binary: safeBinary, args, preview: [safeBinary, ...args] };
}

export function buildZerionDetectCommand(binary: string): ZerionBuiltCommand {
  return build(binary, ['--help']);
}

export function buildZerionVersionCommand(binary: string): ZerionBuiltCommand {
  return build(binary, ['--version']);
}

export function buildZerionWalletListCommand(binary: string): ZerionBuiltCommand {
  return build(binary, ['wallet', 'list', '--json']);
}

export function buildZerionPortfolioCommand(binary: string, address: string): ZerionBuiltCommand {
  return build(binary, ['portfolio', assertSafeZerionAddress(address), '--json']);
}

export function buildZerionPositionsCommand(binary: string, address: string): ZerionBuiltCommand {
  return build(binary, ['positions', assertSafeZerionAddress(address), '--json']);
}

export function buildZerionListPoliciesCommand(binary: string): ZerionBuiltCommand {
  return build(binary, ['agent', 'list-policies', '--json']);
}

export function buildZerionCreatePolicyCommand(
  binary: string,
  policy: Pick<ZerionAgentPolicy, 'name'>
): ZerionBuiltCommand {
  return build(binary, [
    'agent',
    'create-policy',
    '--name',
    assertSafeZerionName(policy.name, 'Policy name'),
    '--chains',
    'solana',
    '--expires',
    '24h',
    '--deny-transfers',
    '--json',
  ]);
}

export function buildZerionListTokensCommand(binary: string): ZerionBuiltCommand {
  return build(binary, ['agent', 'list-tokens', '--json']);
}

export function buildZerionCreateTokenCommand(
  binary: string,
  input: { tokenName: string; walletName: string; policyName: string }
): ZerionBuiltCommand {
  return build(binary, [
    'agent',
    'create-token',
    '--name',
    assertSafeZerionName(input.tokenName, 'Token name'),
    '--wallet',
    assertSafeZerionName(input.walletName, 'Wallet name'),
    '--policy',
    assertSafeZerionName(input.policyName, 'Policy name'),
    '--json',
  ]);
}

export function buildZerionSwapTokensCommand(binary: string): ZerionBuiltCommand {
  return build(binary, ['swap', 'tokens', 'solana', '--json']);
}

export function buildZerionSwapExecuteCommand(
  binary: string,
  proposal: ZerionAgentProposal,
  policy: ZerionAgentPolicy
): ZerionBuiltCommand {
  const check = checkZerionProposalPolicy(proposal, policy, {
    proposalId: proposal.id,
    source: 'agent_zerion_panel',
    approved: true,
    approvedAt: Date.now(),
    approvalText: 'preview only for command construction',
  });
  if (!check.allowed) {
    throw new Error(`Zerion swap command blocked: ${check.reasons.join(' ')}`);
  }
  assertSolAmount(proposal.amountSol);
  return build(binary, [
    'swap',
    'solana',
    proposal.amountSol,
    'SOL',
    'USDC',
    '--wallet',
    assertSafeZerionName(proposal.walletName, 'Wallet name'),
    '--json',
  ]);
}

