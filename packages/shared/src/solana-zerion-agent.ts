import { z } from 'zod';

export const ZERION_DEFAULT_BINARY = 'zerion';
export const ZERION_FORK_BINARY = 'gorkh-zerion';

export const ZERION_ALLOWED_CHAINS = ['solana'] as const;
export type ZerionAllowedChain = (typeof ZERION_ALLOWED_CHAINS)[number];

export const ZERION_ALLOWED_TOKENS = ['SOL', 'USDC'] as const;
export type ZerionAllowedToken = (typeof ZERION_ALLOWED_TOKENS)[number];

export const ZERION_ALLOWED_SWAP_PAIRS = [{ from: 'SOL', to: 'USDC' }] as const;
export const ZERION_DEFAULT_MAX_SOL_AMOUNT = '0.001';

export const ZERION_BLOCKED_COMMANDS = [
  'bridge',
  'send',
  'wallet backup',
  'wallet delete',
  'wallet import',
  'sign-message',
  'sign-typed-data',
  'config set',
  'x402 private-key',
  'mpp private-key',
] as const;

export const ZERION_PHASE_SAFETY_NOTES = [
  'Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet.',
  'Zerion is an Agent execution adapter; it does not use GORKH local wallet keys.',
  'Cloak notes, viewing keys, and private wallet state are never exposed to Zerion.',
  'Bridge, raw send, sign-message, and arbitrary CLI commands are disabled in this phase.',
  'Every onchain execution requires a typed proposal, local policy pass, and explicit manual approval.',
] as const;

export const ZerionCommandKindSchema = z.enum([
  'detect',
  'version',
  'config_status',
  'api_key_set',
  'api_key_clear',
  'wallet_list',
  'agent_list_policies',
  'agent_create_policy',
  'agent_list_tokens',
  'agent_create_token',
  'portfolio',
  'positions',
  'swap_tokens',
  'swap_execute',
]);
export type ZerionCommandKind = z.infer<typeof ZerionCommandKindSchema>;

export const ZerionCliStatusSchema = z.object({
  binary: z.string().min(1),
  detected: z.boolean(),
  version: z.string().optional(),
  helpAvailable: z.boolean().optional(),
  error: z.string().optional(),
});
export type ZerionCliStatus = z.infer<typeof ZerionCliStatusSchema>;

export const ZerionApiKeyStatusSchema = z.object({
  configured: z.boolean(),
  source: z.enum(['keychain', 'cli_config_or_env', 'missing', 'unknown']),
  redacted: z.literal(true),
  updatedAt: z.number().int().positive().optional(),
});
export type ZerionApiKeyStatus = z.infer<typeof ZerionApiKeyStatusSchema>;

export const ZerionAgentWalletSchema = z.object({
  name: z.string().min(1).max(64),
  address: z.string().min(1).max(128).optional(),
  chain: z.literal('solana').optional(),
  selected: z.boolean().optional(),
  source: z.enum(['zerion_cli', 'manual_metadata']).default('zerion_cli'),
});
export type ZerionAgentWallet = z.infer<typeof ZerionAgentWalletSchema>;

export const ZerionAgentPolicySchema = z.object({
  id: z.string().min(1).max(128).optional(),
  name: z.string().min(1).max(64),
  chain: z.literal('solana'),
  allowedFromToken: z.literal('SOL'),
  allowedToToken: z.literal('USDC'),
  maxSolAmount: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,9})?$/),
  expiresAt: z.number().int().positive(),
  maxExecutions: z.literal(1),
  executionsUsed: z.number().int().min(0).max(1).default(0),
  bridgeDisabled: z.literal(true),
  sendDisabled: z.literal(true),
  denyTransfers: z.literal(true),
  denyApprovals: z.boolean().default(true),
  localOnlyDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  createdAt: z.number().int().positive(),
});
export type ZerionAgentPolicy = z.infer<typeof ZerionAgentPolicySchema>;

export const ZerionAgentTokenStatusSchema = z.object({
  configured: z.boolean(),
  name: z.string().min(1).max(64).optional(),
  walletName: z.string().min(1).max(64).optional(),
  policyName: z.string().min(1).max(64).optional(),
  source: z.enum(['zerion_cli', 'keychain', 'missing', 'unknown']),
  secretRedacted: z.literal(true),
  updatedAt: z.number().int().positive().optional(),
});
export type ZerionAgentTokenStatus = z.infer<typeof ZerionAgentTokenStatusSchema>;

export const ZerionAgentProposalSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('zerion_solana_swap'),
  source: z.literal('agent_zerion_panel'),
  chain: z.literal('solana'),
  walletName: z.string().min(1).max(64),
  amountSol: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,9})?$/),
  fromToken: z.literal('SOL'),
  toToken: z.literal('USDC'),
  policyName: z.string().min(1).max(64),
  localPolicyDigest: z.string().regex(/^[a-f0-9]{64}$/),
  commandPreview: z.array(z.string().min(1)).min(2),
  riskNotes: z.array(z.string()).default([]),
  approvalRequired: z.literal(true),
  createdAt: z.number().int().positive(),
});
export type ZerionAgentProposal = z.infer<typeof ZerionAgentProposalSchema>;

export const ZerionExecutionApprovalSchema = z.object({
  proposalId: z.string().min(1),
  source: z.literal('agent_zerion_panel'),
  approved: z.literal(true),
  approvedAt: z.number().int().positive(),
  approvalText: z.string().min(12).max(280),
});
export type ZerionExecutionApproval = z.infer<typeof ZerionExecutionApprovalSchema>;

export const ZerionExecutionResultSchema = z.object({
  id: z.string().min(1),
  proposalId: z.string().min(1).optional(),
  commandKind: z.literal('swap_execute'),
  ok: z.boolean(),
  chain: z.literal('solana'),
  amountSol: z.string(),
  fromToken: z.literal('SOL'),
  toToken: z.literal('USDC'),
  walletName: z.string().min(1).max(64),
  txHash: z.string().min(1).max(180).optional(),
  stdoutJson: z.unknown().optional(),
  stderrJson: z.unknown().optional(),
  errorCode: z.string().max(120).optional(),
  errorMessage: z.string().max(1000).optional(),
  commandPreview: z.array(z.string()),
  executedAt: z.number().int().positive(),
});
export type ZerionExecutionResult = z.infer<typeof ZerionExecutionResultSchema>;

export const ZerionAuditEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'cli_detected',
    'policy_created',
    'token_created',
    'proposal_created',
    'proposal_rejected',
    'execution_approved',
    'execution_succeeded',
    'execution_failed',
    'policy_blocked',
  ]),
  title: z.string().min(1).max(140),
  description: z.string().min(1).max(1000),
  proposalId: z.string().optional(),
  policyName: z.string().optional(),
  txHash: z.string().optional(),
  commandKind: ZerionCommandKindSchema.optional(),
  createdAt: z.number().int().positive(),
  localOnly: z.literal(true),
});
export type ZerionAuditEvent = z.infer<typeof ZerionAuditEventSchema>;

export const ZerionPolicyCheckResultSchema = z.object({
  allowed: z.boolean(),
  reasons: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
});
export type ZerionPolicyCheckResult = z.infer<typeof ZerionPolicyCheckResultSchema>;

