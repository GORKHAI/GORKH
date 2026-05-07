import { z } from 'zod';
import { WorkstationRiskLevelSchema } from './solana-workstation.js';

// ============================================================================
// GORKH Agent Station — Shared Domain Types (v0.1)
// ============================================================================
// Local-first persistent agent runtime metadata. No private keys, no signing,
// no autonomous execution. The station orchestrates safe internal tools that
// produce drafts/proposals which the user must explicitly approve elsewhere.
// ============================================================================

// ----------------------------------------------------------------------------
// Profile
// ----------------------------------------------------------------------------

export const GorkhAgentStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  KILLED: 'killed',
  ERROR: 'error',
} as const;
export type GorkhAgentStatus = (typeof GorkhAgentStatus)[keyof typeof GorkhAgentStatus];

export const GorkhAgentStatusSchema = z.enum([
  GorkhAgentStatus.IDLE,
  GorkhAgentStatus.RUNNING,
  GorkhAgentStatus.PAUSED,
  GorkhAgentStatus.KILLED,
  GorkhAgentStatus.ERROR,
]);

export const GorkhAgentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.literal('GORKH Agent'),
  description: z.string().min(1).max(400),
  version: z.string().min(1).max(32),
  status: GorkhAgentStatusSchema,
  localOnly: z.literal(true),
  enabled: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type GorkhAgentProfile = z.infer<typeof GorkhAgentProfileSchema>;

// ----------------------------------------------------------------------------
// Runtime State
// ----------------------------------------------------------------------------

export const GorkhAgentRuntimeMode = {
  MANUAL: 'manual',
  BACKGROUND_WHILE_APP_OPEN: 'background_while_app_open',
} as const;
export type GorkhAgentRuntimeMode =
  (typeof GorkhAgentRuntimeMode)[keyof typeof GorkhAgentRuntimeMode];

export const GorkhAgentRuntimeModeSchema = z.enum([
  GorkhAgentRuntimeMode.MANUAL,
  GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN,
]);

export const GorkhAgentRuntimeStateSchema = z.object({
  isRunning: z.boolean(),
  isPaused: z.boolean(),
  killSwitchEnabled: z.boolean(),
  lastTickAt: z.number().int().optional(),
  nextTickAt: z.number().int().optional(),
  tickIntervalSeconds: z.number().int().min(15).max(3600),
  activeTaskId: z.string().optional(),
  runtimeMode: GorkhAgentRuntimeModeSchema,
  backgroundAllowed: z.boolean(),
});
export type GorkhAgentRuntimeState = z.infer<typeof GorkhAgentRuntimeStateSchema>;

// ----------------------------------------------------------------------------
// Memory
// ----------------------------------------------------------------------------

export const GorkhAgentMemoryKind = {
  OBSERVATION: 'observation',
  GOAL: 'goal',
  PREFERENCE: 'preference',
  DECISION: 'decision',
  AUDIT_SUMMARY: 'audit_summary',
  WALLET_NOTE: 'wallet_note',
  TOKEN_NOTE: 'token_note',
  PROTOCOL_NOTE: 'protocol_note',
} as const;
export type GorkhAgentMemoryKind =
  (typeof GorkhAgentMemoryKind)[keyof typeof GorkhAgentMemoryKind];

export const GorkhAgentMemoryKindSchema = z.enum([
  GorkhAgentMemoryKind.OBSERVATION,
  GorkhAgentMemoryKind.GOAL,
  GorkhAgentMemoryKind.PREFERENCE,
  GorkhAgentMemoryKind.DECISION,
  GorkhAgentMemoryKind.AUDIT_SUMMARY,
  GorkhAgentMemoryKind.WALLET_NOTE,
  GorkhAgentMemoryKind.TOKEN_NOTE,
  GorkhAgentMemoryKind.PROTOCOL_NOTE,
]);

export const GorkhAgentMemoryEntrySchema = z.object({
  id: z.string().min(1),
  kind: GorkhAgentMemoryKindSchema,
  title: z.string().min(1).max(140),
  content: z.string().max(4000),
  tags: z.array(z.string().max(48)).max(16),
  source: z.string().max(140),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  localOnly: z.literal(true),
  sensitive: z.boolean(),
});
export type GorkhAgentMemoryEntry = z.infer<typeof GorkhAgentMemoryEntrySchema>;

// ----------------------------------------------------------------------------
// Tools
// ----------------------------------------------------------------------------

export const GorkhAgentAllowedToolIdSchema = z.enum([
  'wallet.read_snapshot',
  'wallet.read_portfolio',
  'markets.read_watchlist',
  'markets.fetch_context',
  'shield.decode_transaction',
  'shield.simulate_transaction',
  'cloak.prepare_deposit',
  'cloak.prepare_private_send',
  'zerion.create_proposal',
  'zerion.read_policy',
  'context.create_bundle',
  'builder.inspect_workspace',
  'builder.analyze_logs',
]);
export type GorkhAgentAllowedToolId = z.infer<typeof GorkhAgentAllowedToolIdSchema>;

export const GorkhAgentBlockedToolIdSchema = z.enum([
  'wallet.export_private_key',
  'wallet.sign_without_approval',
  'wallet.send_without_approval',
  'cloak.execute_private_send_autonomous',
  'cloak.execute_deposit_autonomous',
  'cloak.export_note_secret',
  'cloak.export_viewing_key',
  'zerion.execute_without_approval',
  'markets.execute_trade_autonomous',
  'dao.vote_autonomous',
  'yield.move_funds_autonomous',
  'copytrade.execute_autonomous',
  'terminal.exec_arbitrary',
  'shell.exec_arbitrary',
]);
export type GorkhAgentBlockedToolId = z.infer<typeof GorkhAgentBlockedToolIdSchema>;

export const GORKH_AGENT_ALLOWED_TOOL_IDS: readonly GorkhAgentAllowedToolId[] =
  GorkhAgentAllowedToolIdSchema.options;
export const GORKH_AGENT_BLOCKED_TOOL_IDS: readonly GorkhAgentBlockedToolId[] =
  GorkhAgentBlockedToolIdSchema.options;

export type GorkhAgentToolId = GorkhAgentAllowedToolId | GorkhAgentBlockedToolId;

export const GorkhAgentToolIdSchema = z.union([
  GorkhAgentAllowedToolIdSchema,
  GorkhAgentBlockedToolIdSchema,
]);

// ----------------------------------------------------------------------------
// Policy
// ----------------------------------------------------------------------------

export const GorkhAgentPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  allowedTools: z.array(GorkhAgentToolIdSchema),
  blockedTools: z.array(GorkhAgentToolIdSchema),
  requireApprovalForTransactions: z.literal(true),
  requireApprovalForCloak: z.literal(true),
  requireApprovalForZerion: z.literal(true),
  maxSpendPerActionLamports: z.number().int().nonnegative().optional(),
  maxSpendPerDayLamports: z.number().int().nonnegative().optional(),
  allowedPrograms: z.array(z.string().max(128)),
  allowedProtocols: z.array(z.string().max(64)),
  allowMainWalletAutonomousExecution: z.literal(false),
  allowAutonomousCloakSend: z.literal(false),
  allowAutonomousTrading: z.literal(false),
  allowAutonomousDaoVoting: z.literal(false),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type GorkhAgentPolicy = z.infer<typeof GorkhAgentPolicySchema>;

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------

export const GorkhAgentTaskKind = {
  PORTFOLIO_ANALYSIS: 'portfolio_analysis',
  TOKEN_ANALYSIS: 'token_analysis',
  TRANSACTION_REVIEW: 'transaction_review',
  CLOAK_PRIVATE_PAYMENT_DRAFT: 'cloak_private_payment_draft',
  ZERION_DCA_PROPOSAL: 'zerion_dca_proposal',
  BUILDER_REVIEW: 'builder_review',
  CONTEXT_SUMMARY: 'context_summary',
  GENERAL_PLANNING: 'general_planning',
} as const;
export type GorkhAgentTaskKind =
  (typeof GorkhAgentTaskKind)[keyof typeof GorkhAgentTaskKind];

export const GorkhAgentTaskKindSchema = z.enum([
  GorkhAgentTaskKind.PORTFOLIO_ANALYSIS,
  GorkhAgentTaskKind.TOKEN_ANALYSIS,
  GorkhAgentTaskKind.TRANSACTION_REVIEW,
  GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT,
  GorkhAgentTaskKind.ZERION_DCA_PROPOSAL,
  GorkhAgentTaskKind.BUILDER_REVIEW,
  GorkhAgentTaskKind.CONTEXT_SUMMARY,
  GorkhAgentTaskKind.GENERAL_PLANNING,
]);

export const GorkhAgentTaskStatus = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  RUNNING: 'running',
  WAITING_FOR_APPROVAL: 'waiting_for_approval',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
} as const;
export type GorkhAgentTaskStatus =
  (typeof GorkhAgentTaskStatus)[keyof typeof GorkhAgentTaskStatus];

export const GorkhAgentTaskStatusSchema = z.enum([
  GorkhAgentTaskStatus.DRAFT,
  GorkhAgentTaskStatus.QUEUED,
  GorkhAgentTaskStatus.RUNNING,
  GorkhAgentTaskStatus.WAITING_FOR_APPROVAL,
  GorkhAgentTaskStatus.COMPLETED,
  GorkhAgentTaskStatus.FAILED,
  GorkhAgentTaskStatus.REJECTED,
  GorkhAgentTaskStatus.BLOCKED,
]);

export const GorkhAgentTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  userIntent: z.string().min(1).max(2000),
  kind: GorkhAgentTaskKindSchema,
  status: GorkhAgentTaskStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type GorkhAgentTask = z.infer<typeof GorkhAgentTaskSchema>;

// ----------------------------------------------------------------------------
// Tool Calls
// ----------------------------------------------------------------------------

export const GorkhAgentToolCallStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;
export type GorkhAgentToolCallStatus =
  (typeof GorkhAgentToolCallStatus)[keyof typeof GorkhAgentToolCallStatus];

export const GorkhAgentToolCallStatusSchema = z.enum([
  GorkhAgentToolCallStatus.PENDING,
  GorkhAgentToolCallStatus.RUNNING,
  GorkhAgentToolCallStatus.COMPLETED,
  GorkhAgentToolCallStatus.FAILED,
  GorkhAgentToolCallStatus.BLOCKED,
]);

export const GorkhAgentToolCallSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  toolId: GorkhAgentToolIdSchema,
  inputSummary: z.string().max(1000),
  outputSummary: z.string().max(2000),
  status: GorkhAgentToolCallStatusSchema,
  startedAt: z.number().int().optional(),
  completedAt: z.number().int().optional(),
  error: z.string().max(2000).optional(),
});
export type GorkhAgentToolCall = z.infer<typeof GorkhAgentToolCallSchema>;

// ----------------------------------------------------------------------------
// Proposals
// ----------------------------------------------------------------------------

export const GorkhAgentProposalKind = {
  INFORMATIONAL: 'informational',
  WALLET_OBSERVATION: 'wallet_observation',
  CLOAK_DRAFT: 'cloak_draft',
  ZERION_PROPOSAL: 'zerion_proposal',
  BUILDER_ACTION: 'builder_action',
  CONTEXT_EXPORT: 'context_export',
} as const;
export type GorkhAgentProposalKind =
  (typeof GorkhAgentProposalKind)[keyof typeof GorkhAgentProposalKind];

export const GorkhAgentProposalKindSchema = z.enum([
  GorkhAgentProposalKind.INFORMATIONAL,
  GorkhAgentProposalKind.WALLET_OBSERVATION,
  GorkhAgentProposalKind.CLOAK_DRAFT,
  GorkhAgentProposalKind.ZERION_PROPOSAL,
  GorkhAgentProposalKind.BUILDER_ACTION,
  GorkhAgentProposalKind.CONTEXT_EXPORT,
]);

export const GorkhAgentProposalSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  kind: GorkhAgentProposalKindSchema,
  summary: z.string().min(1).max(2000),
  requiresApproval: z.boolean(),
  executionBlocked: z.literal(true),
  blockedReasons: z.array(z.string().max(280)),
  policyDigest: z.string().min(1).max(128),
  relatedWalletId: z.string().max(140).optional(),
  relatedProtocol: z.string().max(64).optional(),
  createdAt: z.number().int(),
});
export type GorkhAgentProposal = z.infer<typeof GorkhAgentProposalSchema>;

// ----------------------------------------------------------------------------
// Approvals
// ----------------------------------------------------------------------------

export const GorkhAgentApprovalState = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  BLOCKED: 'blocked',
} as const;
export type GorkhAgentApprovalState =
  (typeof GorkhAgentApprovalState)[keyof typeof GorkhAgentApprovalState];

export const GorkhAgentApprovalStateSchema = z.enum([
  GorkhAgentApprovalState.PENDING,
  GorkhAgentApprovalState.APPROVED,
  GorkhAgentApprovalState.REJECTED,
  GorkhAgentApprovalState.EXPIRED,
  GorkhAgentApprovalState.BLOCKED,
]);

export const GorkhAgentApprovalItemSchema = z.object({
  id: z.string().min(1),
  proposalId: z.string().min(1),
  title: z.string().min(1).max(140),
  description: z.string().max(2000),
  riskLevel: WorkstationRiskLevelSchema,
  approvalState: GorkhAgentApprovalStateSchema,
  approvalRequired: z.literal(true),
  createdAt: z.number().int(),
  expiresAt: z.number().int().optional(),
});
export type GorkhAgentApprovalItem = z.infer<typeof GorkhAgentApprovalItemSchema>;

// ----------------------------------------------------------------------------
// Audit
// ----------------------------------------------------------------------------

export const GorkhAgentAuditEventKind = {
  AGENT_STARTED: 'agent_started',
  AGENT_PAUSED: 'agent_paused',
  AGENT_RESUMED: 'agent_resumed',
  AGENT_KILLED: 'agent_killed',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TOOL_CALLED: 'tool_called',
  PROPOSAL_CREATED: 'proposal_created',
  APPROVAL_REQUIRED: 'approval_required',
  APPROVAL_REJECTED: 'approval_rejected',
  POLICY_BLOCKED: 'policy_blocked',
  MEMORY_CREATED: 'memory_created',
  ROADMAP_TEMPLATE_VIEWED: 'roadmap_template_viewed',
} as const;
export type GorkhAgentAuditEventKind =
  (typeof GorkhAgentAuditEventKind)[keyof typeof GorkhAgentAuditEventKind];

export const GorkhAgentAuditEventKindSchema = z.enum([
  GorkhAgentAuditEventKind.AGENT_STARTED,
  GorkhAgentAuditEventKind.AGENT_PAUSED,
  GorkhAgentAuditEventKind.AGENT_RESUMED,
  GorkhAgentAuditEventKind.AGENT_KILLED,
  GorkhAgentAuditEventKind.TASK_CREATED,
  GorkhAgentAuditEventKind.TASK_COMPLETED,
  GorkhAgentAuditEventKind.TOOL_CALLED,
  GorkhAgentAuditEventKind.PROPOSAL_CREATED,
  GorkhAgentAuditEventKind.APPROVAL_REQUIRED,
  GorkhAgentAuditEventKind.APPROVAL_REJECTED,
  GorkhAgentAuditEventKind.POLICY_BLOCKED,
  GorkhAgentAuditEventKind.MEMORY_CREATED,
  GorkhAgentAuditEventKind.ROADMAP_TEMPLATE_VIEWED,
]);

export const GorkhAgentAuditEventSchema = z.object({
  id: z.string().min(1),
  kind: GorkhAgentAuditEventKindSchema,
  summary: z.string().min(1).max(280),
  metadata: z.record(z.string(), z.string().max(500)).optional(),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
});
export type GorkhAgentAuditEvent = z.infer<typeof GorkhAgentAuditEventSchema>;

// ----------------------------------------------------------------------------
// Templates (active / coming soon / blocked)
// ----------------------------------------------------------------------------

export const GorkhAgentTemplateCategory = {
  ACTIVE: 'active',
  COPY_TRADE: 'copy_trade',
  MOMENTUM: 'momentum',
  YIELD: 'yield',
  GOVERNANCE: 'governance',
  LIQUIDITY: 'liquidity',
  LENDING: 'lending',
  PRIVACY: 'privacy',
  WALLET: 'wallet',
} as const;
export type GorkhAgentTemplateCategory =
  (typeof GorkhAgentTemplateCategory)[keyof typeof GorkhAgentTemplateCategory];

export const GorkhAgentTemplateCategorySchema = z.enum([
  GorkhAgentTemplateCategory.ACTIVE,
  GorkhAgentTemplateCategory.COPY_TRADE,
  GorkhAgentTemplateCategory.MOMENTUM,
  GorkhAgentTemplateCategory.YIELD,
  GorkhAgentTemplateCategory.GOVERNANCE,
  GorkhAgentTemplateCategory.LIQUIDITY,
  GorkhAgentTemplateCategory.LENDING,
  GorkhAgentTemplateCategory.PRIVACY,
  GorkhAgentTemplateCategory.WALLET,
]);

export const GorkhAgentTemplateStatus = {
  ACTIVE: 'active',
  COMING_SOON: 'coming_soon',
  BLOCKED: 'blocked',
} as const;
export type GorkhAgentTemplateStatus =
  (typeof GorkhAgentTemplateStatus)[keyof typeof GorkhAgentTemplateStatus];

export const GorkhAgentTemplateStatusSchema = z.enum([
  GorkhAgentTemplateStatus.ACTIVE,
  GorkhAgentTemplateStatus.COMING_SOON,
  GorkhAgentTemplateStatus.BLOCKED,
]);

export const GorkhAgentTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  category: GorkhAgentTemplateCategorySchema,
  status: GorkhAgentTemplateStatusSchema,
  riskLevel: WorkstationRiskLevelSchema,
  requiredProtocols: z.array(z.string().max(64)),
  safetyNotes: z.array(z.string().max(280)),
  unavailableReason: z.string().max(280).optional(),
});
export type GorkhAgentTemplate = z.infer<typeof GorkhAgentTemplateSchema>;

// ----------------------------------------------------------------------------
// Workspace State Aggregate
// ----------------------------------------------------------------------------

export const GorkhAgentStationStateSchema = z.object({
  profile: GorkhAgentProfileSchema,
  runtime: GorkhAgentRuntimeStateSchema,
  policy: GorkhAgentPolicySchema,
  memory: z.array(GorkhAgentMemoryEntrySchema),
  tasks: z.array(GorkhAgentTaskSchema),
  toolCalls: z.array(GorkhAgentToolCallSchema),
  proposals: z.array(GorkhAgentProposalSchema),
  approvals: z.array(GorkhAgentApprovalItemSchema),
  audit: z.array(GorkhAgentAuditEventSchema),
  templatesViewed: z.array(z.string().max(140)),
  updatedAt: z.number().int(),
});
export type GorkhAgentStationState = z.infer<typeof GorkhAgentStationStateSchema>;

// ----------------------------------------------------------------------------
// Default Constants
// ----------------------------------------------------------------------------

export const GORKH_AGENT_VERSION = '0.1.0';

export const GORKH_AGENT_DEFAULT_TICK_INTERVAL_SECONDS = 60;

export const GORKH_AGENT_DEFAULT_DESCRIPTION =
  'GORKH Agent is the main persistent Solana agent inside the desktop app. It can analyze, plan, draft, monitor, and coordinate tools, but never has direct unsafe wallet access.';

export const GORKH_AGENT_BACKGROUND_COPY =
  'GORKH Agent can run in the background while the desktop app is open. It does not run after the app is fully quit.';

export const GORKH_AGENT_TEMPLATES: GorkhAgentTemplate[] = [
  {
    id: 'gorkh_agent',
    name: 'GORKH Agent',
    description:
      'Persistent local Solana agent that can analyze, plan, draft, and coordinate safe internal tools. Never executes wallet transactions autonomously.',
    category: GorkhAgentTemplateCategory.ACTIVE,
    status: GorkhAgentTemplateStatus.ACTIVE,
    riskLevel: 'low',
    requiredProtocols: [],
    safetyNotes: [
      'Local-first runtime. Runs only while the desktop app is open.',
      'Read tools and draft/proposal tools only — execution remains in module-specific approval flows.',
      'No private key access, no autonomous transactions.',
    ],
  },
  {
    id: 'copy_trader',
    name: 'Copy Trader',
    description:
      'Mirror watched-wallet activity with delay, size scaling, and risk checks.',
    category: GorkhAgentTemplateCategory.COPY_TRADE,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'high',
    requiredProtocols: ['jupiter'],
    safetyNotes: [
      'Execution disabled. Requires copy-trade policy, simulation, and approval gates.',
    ],
    unavailableReason:
      'Coming Soon. No autonomous trade execution in v0.1.',
  },
  {
    id: 'momentum_bot',
    name: 'Momentum Bot',
    description:
      'React to price/volume momentum signals with policy-bound proposals.',
    category: GorkhAgentTemplateCategory.MOMENTUM,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'high',
    requiredProtocols: ['jupiter', 'pyth'],
    safetyNotes: ['Execution disabled. No autonomous trading in v0.1.'],
    unavailableReason: 'Coming Soon. No autonomous trading in v0.1.',
  },
  {
    id: 'yield_optimizer',
    name: 'Yield Optimizer',
    description: 'Compare yield venues and draft movement plans.',
    category: GorkhAgentTemplateCategory.YIELD,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'medium',
    requiredProtocols: ['kamino', 'meteora'],
    safetyNotes: ['Funds movement disabled.'],
    unavailableReason: 'Coming Soon. No autonomous fund movement in v0.1.',
  },
  {
    id: 'dao_auto_voter',
    name: 'DAO Auto-Voting Agent',
    description:
      'Monitor governance proposals and draft votes from rules.',
    category: GorkhAgentTemplateCategory.GOVERNANCE,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'medium',
    requiredProtocols: ['squads'],
    safetyNotes: ['Auto-voting disabled. Manual approval required.'],
    unavailableReason: 'Coming Soon. Manual approval required.',
  },
  {
    id: 'lp_manager',
    name: 'LP Manager',
    description:
      'Monitor concentrated liquidity positions and draft rebalance actions.',
    category: GorkhAgentTemplateCategory.LIQUIDITY,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'medium',
    requiredProtocols: ['orca', 'meteora'],
    safetyNotes: ['LP add/remove disabled.'],
    unavailableReason: 'Coming Soon. Liquidity adjustments disabled.',
  },
  {
    id: 'health_factor_auto_repay',
    name: 'Health Factor Auto-Repay Agent',
    description:
      'Monitor lending risk and draft repay/collateral actions.',
    category: GorkhAgentTemplateCategory.LENDING,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'high',
    requiredProtocols: ['kamino'],
    safetyNotes: ['Autonomous repay disabled.'],
    unavailableReason: 'Coming Soon. No autonomous repay in v0.1.',
  },
  {
    id: 'autonomous_cloak_private_send',
    name: 'Autonomous Cloak Private Send',
    description:
      'Private transfer automation for pre-approved routines.',
    category: GorkhAgentTemplateCategory.PRIVACY,
    status: GorkhAgentTemplateStatus.COMING_SOON,
    riskLevel: 'high',
    requiredProtocols: ['cloak'],
    safetyNotes: [
      'Disabled. Private sends require explicit Wallet approval.',
    ],
    unavailableReason:
      'Coming Soon. Cloak sends always require explicit Wallet approval.',
  },
  {
    id: 'main_wallet_without_approval',
    name: 'Main-Wallet Autonomous Execution',
    description:
      'Allow an agent to use the main wallet without approval.',
    category: GorkhAgentTemplateCategory.WALLET,
    status: GorkhAgentTemplateStatus.BLOCKED,
    riskLevel: 'high',
    requiredProtocols: [],
    safetyNotes: [
      'Blocked. Main wallet actions require explicit policy and approval. GORKH will not provide god-mode wallet access.',
    ],
    unavailableReason:
      'Disabled. Main wallet actions require explicit policy and approval. No god-mode wallet access.',
  },
];

export function getGorkhAgentTemplate(
  id: string
): GorkhAgentTemplate | undefined {
  return GORKH_AGENT_TEMPLATES.find((t) => t.id === id);
}

export const GORKH_AGENT_STATION_SAFETY_NOTES: string[] = [
  'GORKH Agent is local-first and runs only while the desktop app is open.',
  'No private key access, no autonomous wallet signing, no autonomous Cloak sends.',
  'Zerion proposals must be executed via the Zerion Executor approval flow.',
  'Cloak drafts must be executed via the Wallet → Cloak Private approval flow.',
  'Kill switch instantly halts all proposals, ticks, and tool calls.',
  'No Telegram, WhatsApp, or Discord control surfaces.',
  'No cloud background agents.',
];

// ----------------------------------------------------------------------------
// Factories
// ----------------------------------------------------------------------------

export function createDefaultGorkhAgentProfile(now: number = Date.now()): GorkhAgentProfile {
  return {
    id: `gorkh-agent-${now}`,
    name: 'GORKH Agent',
    description: GORKH_AGENT_DEFAULT_DESCRIPTION,
    version: GORKH_AGENT_VERSION,
    status: GorkhAgentStatus.IDLE,
    localOnly: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultGorkhAgentRuntimeState(): GorkhAgentRuntimeState {
  return {
    isRunning: false,
    isPaused: false,
    killSwitchEnabled: false,
    tickIntervalSeconds: GORKH_AGENT_DEFAULT_TICK_INTERVAL_SECONDS,
    runtimeMode: GorkhAgentRuntimeMode.MANUAL,
    backgroundAllowed: false,
  };
}

export function createDefaultGorkhAgentPolicy(now: number = Date.now()): GorkhAgentPolicy {
  return {
    id: `gorkh-agent-policy-${now}`,
    name: 'GORKH Agent v0.1 Default Policy',
    allowedTools: [...GORKH_AGENT_ALLOWED_TOOL_IDS],
    blockedTools: [...GORKH_AGENT_BLOCKED_TOOL_IDS],
    requireApprovalForTransactions: true,
    requireApprovalForCloak: true,
    requireApprovalForZerion: true,
    maxSpendPerActionLamports: 0,
    maxSpendPerDayLamports: 0,
    allowedPrograms: [],
    allowedProtocols: ['jupiter', 'kamino', 'orca', 'meteora', 'cloak', 'zerion_cli'],
    allowMainWalletAutonomousExecution: false,
    allowAutonomousCloakSend: false,
    allowAutonomousTrading: false,
    allowAutonomousDaoVoting: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyGorkhAgentStationState(now: number = Date.now()): GorkhAgentStationState {
  return {
    profile: createDefaultGorkhAgentProfile(now),
    runtime: createDefaultGorkhAgentRuntimeState(),
    policy: createDefaultGorkhAgentPolicy(now),
    memory: [],
    tasks: [],
    toolCalls: [],
    proposals: [],
    approvals: [],
    audit: [],
    templatesViewed: [],
    updatedAt: now,
  };
}

// ----------------------------------------------------------------------------
// Tool helpers
// ----------------------------------------------------------------------------

const ALLOWED_SET: ReadonlySet<GorkhAgentAllowedToolId> = new Set(GORKH_AGENT_ALLOWED_TOOL_IDS);
const BLOCKED_SET: ReadonlySet<GorkhAgentBlockedToolId> = new Set(GORKH_AGENT_BLOCKED_TOOL_IDS);

export function isGorkhAgentAllowedToolId(value: unknown): value is GorkhAgentAllowedToolId {
  return typeof value === 'string' && ALLOWED_SET.has(value as GorkhAgentAllowedToolId);
}

export function isGorkhAgentBlockedToolId(value: unknown): value is GorkhAgentBlockedToolId {
  return typeof value === 'string' && BLOCKED_SET.has(value as GorkhAgentBlockedToolId);
}

export function getGorkhAgentTaskKindForIntent(intent: string): GorkhAgentTaskKind {
  const lowered = intent.toLowerCase();
  // Cloak / private payment must beat the generic wallet matcher because
  // "private send" and "cloak deposit" mention wallets too.
  if (/(cloak|deposit privately|private\s+send|shield(ed)?\s+send)/.test(lowered)) {
    return GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT;
  }
  // Zerion / DCA / SOL→USDC must beat "swap" / "jupiter" general patterns.
  if (
    /(\bdca\b|\bzerion\b|swap\s+tiny|sol\s*(?:->|→|to)\s*usdc|swap.*sol.*usdc|jupiter\s+swap)/.test(
      lowered
    )
  ) {
    return GorkhAgentTaskKind.ZERION_DCA_PROPOSAL;
  }
  if (/(transaction|signature|^tx\b|\btx\b|simulate|decode|explain\s+tx)/.test(lowered)) {
    return GorkhAgentTaskKind.TRANSACTION_REVIEW;
  }
  if (/(token|mint|risk\s+signal|analyze\s+token|review\s+token)/.test(lowered)) {
    return GorkhAgentTaskKind.TOKEN_ANALYSIS;
  }
  if (/(wallet|portfolio|balance|holdings|check\s+my)/.test(lowered)) {
    return GorkhAgentTaskKind.PORTFOLIO_ANALYSIS;
  }
  if (/(anchor|\bidl\b|\blogs?\b|program\s+error|build(er)?)/.test(lowered)) {
    return GorkhAgentTaskKind.BUILDER_REVIEW;
  }
  if (/(bundle|context\s+summary|export\s+context|workstation\s+context)/.test(lowered)) {
    return GorkhAgentTaskKind.CONTEXT_SUMMARY;
  }
  return GorkhAgentTaskKind.GENERAL_PLANNING;
}

export function getGorkhAgentTaskKindLabel(kind: GorkhAgentTaskKind): string {
  const labels: Record<GorkhAgentTaskKind, string> = {
    portfolio_analysis: 'Portfolio Analysis',
    token_analysis: 'Token Analysis',
    transaction_review: 'Transaction Review',
    cloak_private_payment_draft: 'Cloak Private Payment Draft',
    zerion_dca_proposal: 'Zerion DCA Proposal',
    builder_review: 'Builder Review',
    context_summary: 'Context Summary',
    general_planning: 'General Planning',
  };
  return labels[kind] ?? kind;
}

export function getGorkhAgentStatusLabel(status: GorkhAgentStatus): string {
  const labels: Record<GorkhAgentStatus, string> = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    killed: 'Kill Switch Engaged',
    error: 'Error',
  };
  return labels[status] ?? status;
}

export function getGorkhAgentTemplateStatusLabel(status: GorkhAgentTemplateStatus): string {
  const labels: Record<GorkhAgentTemplateStatus, string> = {
    active: 'Active',
    coming_soon: 'Coming Soon',
    blocked: 'Blocked',
  };
  return labels[status] ?? status;
}

// ============================================================================
// v0.2 — Real Tool Result + Cross-Module Handoff Schemas
// ============================================================================
// These schemas describe what the safe tool router returns when GORKH Agent
// reads real module data and prepares cross-module handoffs. Every result is
// `localOnly` and must remain free of private keys, seed phrases, raw notes,
// viewing keys, Zerion API keys, and Zerion agent tokens.
// ============================================================================

// --- Wallet ---

export const GorkhAgentWalletToolResultSchema = z.object({
  selectedProfileId: z.string().max(140).optional(),
  selectedProfileLabel: z.string().max(140).optional(),
  publicAddress: z.string().max(128).optional(),
  network: z.string().max(32).optional(),
  hasSnapshot: z.boolean(),
  solBalanceUi: z.string().max(64).optional(),
  tokenAccountCount: z.number().int().nonnegative().optional(),
  portfolioHoldingCount: z.number().int().nonnegative().optional(),
  ownershipStatus: z.string().max(64).optional(),
  snapshotFetchedAt: z.number().int().optional(),
  warnings: z.array(z.string().max(280)).default([]),
  source: z.literal('wallet_workspace'),
  localOnly: z.literal(true),
});
export type GorkhAgentWalletToolResult = z.infer<typeof GorkhAgentWalletToolResultSchema>;

// --- Markets ---

export const GorkhAgentMarketsSelectedItemSchema = z.object({
  id: z.string().max(140),
  address: z.string().max(128),
  label: z.string().max(140).optional(),
  kind: z.string().max(32),
  riskSignalCount: z.number().int().nonnegative().default(0),
});
export type GorkhAgentMarketsSelectedItem = z.infer<
  typeof GorkhAgentMarketsSelectedItemSchema
>;

export const GorkhAgentMarketsToolResultSchema = z.object({
  watchlistCount: z.number().int().nonnegative(),
  selectedItems: z.array(GorkhAgentMarketsSelectedItemSchema).default([]),
  availableProviderContexts: z.array(z.string().max(64)).default([]),
  sampleDataPresent: z.boolean(),
  birdeyeContextPresent: z.boolean(),
  warnings: z.array(z.string().max(280)).default([]),
  source: z.literal('markets_workspace'),
  localOnly: z.literal(true),
});
export type GorkhAgentMarketsToolResult = z.infer<
  typeof GorkhAgentMarketsToolResultSchema
>;

// --- Shield ---

export const GorkhAgentShieldInputKindSchema = z.enum([
  'transaction_signature',
  'base58_transaction',
  'base64_transaction',
  'address',
  'unknown',
]);
export type GorkhAgentShieldInputKind = z.infer<
  typeof GorkhAgentShieldInputKindSchema
>;

export const GorkhAgentShieldToolResultSchema = z.object({
  inputKind: GorkhAgentShieldInputKindSchema,
  decodedAvailable: z.boolean(),
  riskFindingCount: z.number().int().nonnegative().default(0),
  highestRiskLevel: WorkstationRiskLevelSchema.optional(),
  simulationAvailable: z.boolean(),
  prefilledInput: z.string().max(8192),
  targetModule: z.literal('shield'),
  handoffStatus: z.literal('ready_for_manual_review'),
  warnings: z.array(z.string().max(280)).default([]),
  source: z.literal('shield_context'),
  localOnly: z.literal(true),
});
export type GorkhAgentShieldToolResult = z.infer<
  typeof GorkhAgentShieldToolResultSchema
>;

// --- Cloak handoff ---

export const GorkhAgentCloakDraftKindSchema = z.enum([
  'cloak_private_send',
  'cloak_deposit',
]);
export type GorkhAgentCloakDraftKind = z.infer<
  typeof GorkhAgentCloakDraftKindSchema
>;

export const GorkhAgentCloakHandoffStatusSchema = z.enum([
  'ready_for_wallet_review',
  'missing_required_fields',
  'blocked',
]);
export type GorkhAgentCloakHandoffStatus = z.infer<
  typeof GorkhAgentCloakHandoffStatusSchema
>;

export const GorkhAgentCloakDraftHandoffSchema = z.object({
  id: z.string().min(1),
  draftKind: GorkhAgentCloakDraftKindSchema,
  walletId: z.string().max(140).optional(),
  walletLabel: z.string().max(140).optional(),
  asset: z.string().max(32).optional(),
  amountLamports: z.string().regex(/^\d{0,20}$/).optional(),
  amountUi: z.string().max(64).optional(),
  recipient: z.string().max(128).optional(),
  network: z.string().max(32).optional(),
  targetModule: z.literal('wallet_cloak'),
  executionBlocked: z.literal(true),
  handoffStatus: GorkhAgentCloakHandoffStatusSchema,
  warnings: z.array(z.string().max(280)).default([]),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
});
export type GorkhAgentCloakDraftHandoff = z.infer<
  typeof GorkhAgentCloakDraftHandoffSchema
>;

// --- Zerion handoff ---

export const GorkhAgentZerionProposalKindSchema = z.enum([
  'zerion_tiny_swap',
  'zerion_dca',
]);
export type GorkhAgentZerionProposalKindV2 = z.infer<
  typeof GorkhAgentZerionProposalKindSchema
>;

export const GorkhAgentZerionHandoffStatusSchema = z.enum([
  'ready_for_zerion_review',
  'missing_required_fields',
  'blocked',
]);
export type GorkhAgentZerionHandoffStatus = z.infer<
  typeof GorkhAgentZerionHandoffStatusSchema
>;

export const GorkhAgentZerionProposalHandoffSchema = z.object({
  id: z.string().min(1),
  proposalKind: GorkhAgentZerionProposalKindSchema,
  fromToken: z.literal('SOL'),
  toToken: z.literal('USDC'),
  amountSol: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,9})?$/),
  walletName: z.string().max(64).optional(),
  policyName: z.string().max(64).optional(),
  policyDigest: z.string().max(128).optional(),
  targetModule: z.literal('zerion_executor'),
  executionBlocked: z.literal(true),
  handoffStatus: GorkhAgentZerionHandoffStatusSchema,
  warnings: z.array(z.string().max(280)).default([]),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
});
export type GorkhAgentZerionProposalHandoff = z.infer<
  typeof GorkhAgentZerionProposalHandoffSchema
>;

// --- Context bundle ---

export const GorkhAgentContextBundleResultSchema = z.object({
  id: z.string().min(1),
  markdown: z.string().max(64_000),
  sources: z.array(z.string().max(64)),
  redactionsApplied: z.array(z.string().max(64)),
  warnings: z.array(z.string().max(280)).default([]),
  createdAt: z.number().int(),
  localOnly: z.literal(true),
});
export type GorkhAgentContextBundleResult = z.infer<
  typeof GorkhAgentContextBundleResultSchema
>;

// --- Aggregate handoff store entry ---

export const GorkhAgentHandoffEntrySchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  kind: z.enum([
    'wallet_summary',
    'markets_summary',
    'shield_review',
    'cloak_draft',
    'zerion_proposal',
    'context_bundle',
  ]),
  walletResult: GorkhAgentWalletToolResultSchema.optional(),
  marketsResult: GorkhAgentMarketsToolResultSchema.optional(),
  shieldResult: GorkhAgentShieldToolResultSchema.optional(),
  cloakHandoff: GorkhAgentCloakDraftHandoffSchema.optional(),
  zerionHandoff: GorkhAgentZerionProposalHandoffSchema.optional(),
  contextBundle: GorkhAgentContextBundleResultSchema.optional(),
  createdAt: z.number().int(),
});
export type GorkhAgentHandoffEntry = z.infer<typeof GorkhAgentHandoffEntrySchema>;

// --- New v0.2 task / proposal kinds (additive enum constants) ---

export const GorkhAgentTaskKindV2 = {
  WALLET_SNAPSHOT_SUMMARY: 'wallet_snapshot_summary',
  PORTFOLIO_SUMMARY: 'portfolio_summary',
  MARKETS_CONTEXT_SUMMARY: 'markets_context_summary',
  CLOAK_HANDOFF: 'cloak_handoff',
  ZERION_HANDOFF: 'zerion_handoff',
  SHIELD_HANDOFF: 'shield_handoff',
} as const;
export type GorkhAgentTaskKindV2 =
  (typeof GorkhAgentTaskKindV2)[keyof typeof GorkhAgentTaskKindV2];

// --- Helpers ---

export const GORKH_AGENT_FORBIDDEN_HANDOFF_FIELDS: readonly string[] = [
  'privateKey',
  'private_key',
  'seedPhrase',
  'seed_phrase',
  'mnemonic',
  'walletJson',
  'wallet_json',
  'walletBackup',
  'cloakNoteSecret',
  'cloak_note_secret',
  'noteSecret',
  'note_secret',
  'viewingKey',
  'viewing_key',
  'apiKey',
  'api_key',
  'agentToken',
  'agent_token',
  'rawSignature',
  'raw_signature',
];

export function hasForbiddenHandoffField(value: unknown): string | null {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    return null;
  }
  for (const key of GORKH_AGENT_FORBIDDEN_HANDOFF_FIELDS) {
    if (new RegExp(`"${key}"\\s*:`).test(text)) {
      return key;
    }
  }
  return null;
}
