import { z } from 'zod';

export const BuilderToolboxTab = {
  OVERVIEW: 'overview',
  IDL_BROWSER: 'idl_browser',
  ACCOUNT_DECODER: 'account_decoder',
  PROGRAM_LOGS: 'program_logs',
  RPC_NODES: 'rpc_nodes',
  NETWORK_MONITOR: 'network_monitor',
  COMPUTE_ESTIMATOR: 'compute_estimator',
  LOCKED_ACTIONS: 'locked_actions',
} as const;
export type BuilderToolboxTab = (typeof BuilderToolboxTab)[keyof typeof BuilderToolboxTab];

export const BuilderToolboxCluster = z.enum(['localnet', 'devnet', 'testnet', 'mainnet', 'custom']);
export type BuilderToolboxCluster = z.infer<typeof BuilderToolboxCluster>;

export const AnchorIdlInstructionAccountSummarySchema = z.object({
  name: z.string(),
  writable: z.boolean().optional(),
  signer: z.boolean().optional(),
});

export const IdlInstructionSummarySchema = z.object({
  name: z.string(),
  accounts: z.array(AnchorIdlInstructionAccountSummarySchema),
  args: z.array(z.object({ name: z.string(), type: z.unknown() })),
});
export type IdlInstructionSummary = z.infer<typeof IdlInstructionSummarySchema>;

export const IdlAccountSummarySchema = z.object({
  name: z.string(),
  fields: z.array(z.object({ name: z.string(), type: z.unknown() })),
  discriminator: z.string().optional(),
});
export type IdlAccountSummary = z.infer<typeof IdlAccountSummarySchema>;

export const AnchorIdlSummarySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  programAddress: z.string().optional(),
  instructionCount: z.number().int().nonnegative(),
  accountCount: z.number().int().nonnegative(),
  typeCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  instructions: z.array(IdlInstructionSummarySchema),
  accounts: z.array(IdlAccountSummarySchema),
  types: z.array(z.string()),
  events: z.array(z.string()),
  errors: z.array(z.object({ code: z.number().optional(), name: z.string(), message: z.string().optional() })),
  warnings: z.array(z.string()),
  localOnly: z.literal(true),
});
export type AnchorIdlSummary = z.infer<typeof AnchorIdlSummarySchema>;

export const AccountDecodeInputSchema = z.object({
  accountAddress: z.string().optional(),
  encoding: z.enum(['base64', 'hex', 'base58', 'unknown']),
  rawInput: z.string(),
  accountTypeName: z.string().optional(),
  idlName: z.string().optional(),
  localOnly: z.literal(true),
});
export type AccountDecodeInput = z.infer<typeof AccountDecodeInputSchema>;

export const AccountDecodeResultSchema = z.object({
  status: z.enum(['empty', 'decoded', 'unsupported', 'invalid']),
  byteLength: z.number().int().nonnegative(),
  encoding: z.enum(['base64', 'hex', 'base58', 'unknown']),
  discriminatorHex: z.string().optional(),
  expectedDiscriminatorHex: z.string().optional(),
  discriminatorMatched: z.boolean().optional(),
  accountTypeName: z.string().optional(),
  fields: z.array(z.object({ name: z.string(), type: z.unknown(), value: z.string() })),
  warnings: z.array(z.string()),
  localOnly: z.literal(true),
});
export type AccountDecodeResult = z.infer<typeof AccountDecodeResultSchema>;

export const ProgramLogSubscriptionSchema = z.object({
  id: z.string(),
  programId: z.string(),
  status: z.enum(['idle', 'connecting', 'streaming', 'paused', 'stopped', 'error']),
  startedAt: z.number().optional(),
  error: z.string().optional(),
});
export type ProgramLogSubscription = z.infer<typeof ProgramLogSubscriptionSchema>;

export const ProgramLogEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  signature: z.string().optional(),
  slot: z.number().optional(),
  logs: z.array(z.string()),
  err: z.unknown().optional(),
});
export type ProgramLogEvent = z.infer<typeof ProgramLogEventSchema>;

export const RpcEndpointProfileSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string().url(),
  websocketUrl: z.string().url().optional(),
  redactedUrl: z.string(),
  cluster: BuilderToolboxCluster,
  enabled: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type RpcEndpointProfile = z.infer<typeof RpcEndpointProfileSchema>;

export const RpcEndpointRedactedViewSchema = RpcEndpointProfileSchema.omit({ url: true, websocketUrl: true });
export type RpcEndpointRedactedView = z.infer<typeof RpcEndpointRedactedViewSchema>;

export const RpcBenchmarkResultSchema = z.object({
  endpointId: z.string(),
  label: z.string(),
  redactedUrl: z.string(),
  status: z.enum(['idle', 'running', 'healthy', 'failed']),
  latencyMs: z.number().optional(),
  slot: z.number().optional(),
  blockHeight: z.number().optional(),
  checkedAt: z.number().optional(),
  error: z.string().optional(),
});
export type RpcBenchmarkResult = z.infer<typeof RpcBenchmarkResultSchema>;

export const NetworkHealthSnapshotSchema = z.object({
  selectedCluster: BuilderToolboxCluster,
  selectedEndpointLabel: z.string().optional(),
  selectedEndpointRedactedUrl: z.string().optional(),
  websocketStatus: z.enum(['connected', 'disconnected', 'error', 'idle']),
  currentSlot: z.number().optional(),
  blockHeight: z.number().optional(),
  epoch: z.number().optional(),
  epochProgress: z.number().optional(),
  latencyMs: z.number().optional(),
  subscriptionEventCount: z.number().int().nonnegative(),
  status: z.enum(['idle', 'loading', 'healthy', 'degraded', 'error']),
  checkedAt: z.number().optional(),
  warnings: z.array(z.string()),
});
export type NetworkHealthSnapshot = z.infer<typeof NetworkHealthSnapshotSchema>;

export const WebsocketSubscriptionProfileSchema = z.object({
  id: z.string(),
  kind: z.enum(['account', 'program_logs', 'slot']),
  target: z.string().optional(),
  status: z.enum(['idle', 'connecting', 'active', 'paused', 'stopped', 'error']),
  eventCount: z.number().int().nonnegative(),
  createdAt: z.number().int(),
  error: z.string().optional(),
});
export type WebsocketSubscriptionProfile = z.infer<typeof WebsocketSubscriptionProfileSchema>;

export const ComputeEstimateInputSchema = z.object({
  serializedTransactionBase64: z.string(),
  source: z.enum(['pasted', 'transaction_studio_handoff']),
  localOnly: z.literal(true),
});
export type ComputeEstimateInput = z.infer<typeof ComputeEstimateInputSchema>;

export const ComputeEstimateResultSchema = z.object({
  status: z.enum(['idle', 'running', 'success', 'failed', 'unavailable']),
  computeUnitsConsumed: z.number().optional(),
  logs: z.array(z.string()),
  err: z.unknown().optional(),
  replacementBlockhash: z.string().optional(),
  warnings: z.array(z.string()),
  estimatedAt: z.number().optional(),
});
export type ComputeEstimateResult = z.infer<typeof ComputeEstimateResultSchema>;

export const DeveloperToolboxContextSnapshotSchema = z.object({
  selectedCluster: BuilderToolboxCluster,
  selectedEndpointLabel: z.string().optional(),
  selectedEndpointRedactedUrl: z.string().optional(),
  latestSlot: z.number().optional(),
  epoch: z.number().optional(),
  idlSummary: z.string().optional(),
  accountDecodeSummary: z.string().optional(),
  activeSubscriptionsCount: z.number().int().nonnegative(),
  recentLogSummary: z.string().optional(),
  computeEstimateSummary: z.string().optional(),
  updatedAt: z.number().int(),
  redactionsApplied: z.array(z.string()),
  localOnly: z.literal(true),
});
export type DeveloperToolboxContextSnapshot = z.infer<typeof DeveloperToolboxContextSnapshotSchema>;

export const BUILDER_TOOLBOX_ALLOWED_RPC_METHODS = [
  'getHealth',
  'getVersion',
  'getSlot',
  'getBlockHeight',
  'getEpochInfo',
  'getLeaderSchedule',
  'getBalance',
  'getAccountInfo',
  'getProgramAccounts',
  'getParsedAccountInfo',
  'getParsedTokenAccountsByOwner',
  'getTransaction',
  'getSignatureStatuses',
  'simulateTransaction',
] as const;

export const BUILDER_TOOLBOX_FORBIDDEN_RPC_METHODS = [
  'sendTransaction',
  'sendRawTransaction',
  'requestAirdrop',
  'deploy',
  'upgrade',
  'setUpgradeAuthority',
] as const;

export const BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS = [
  'Program Deployment',
  'Program Upgrade',
  'Close Program',
  'Set Upgrade Authority',
  'Transfer Upgrade Authority',
  'Revoke Upgrade Authority',
  'Arbitrary RPC Playground',
  'Offline Signing',
  'Hardware Wallet Developer Signing',
  'Local Validator Process Manager',
  'Dev Faucet',
] as const;
