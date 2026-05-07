import {
  GorkhAgentRuntimeMode,
  GorkhAgentStatus,
  GorkhAgentTaskKind,
  GorkhAgentTaskStatus,
  type GorkhAgentApprovalItem,
  type GorkhAgentAuditEvent,
  type GorkhAgentCloakDraftHandoff,
  type GorkhAgentContextBundleResult,
  type GorkhAgentHandoffEntry,
  type GorkhAgentMarketsToolResult,
  type GorkhAgentProposal,
  type GorkhAgentRuntimeState,
  type GorkhAgentShieldToolResult,
  type GorkhAgentStationState,
  type GorkhAgentToolCall,
  type GorkhAgentTask,
  type GorkhAgentWalletToolResult,
  type GorkhAgentZerionProposalHandoff,
  type SolanaMarketsWorkspaceState,
  type SolanaWalletPortfolioSummary,
  type SolanaWalletWorkspaceState,
} from '@gorkh/shared';
import {
  auditAgentKilled,
  auditAgentPaused,
  auditAgentResumed,
  auditAgentStarted,
  auditApprovalRequired,
  auditApprovalRejected,
  auditPolicyBlocked,
  auditProposalCreated,
  auditTaskCreated,
  auditToolCalled,
} from './agentAudit.js';
import { createApprovalItem, transitionApproval } from './agentApprovalQueue.js';
import { computePolicyDigest } from './agentPolicyEngine.js';
import { buildProposal, planTaskFromIntent } from './agentTaskPlanner.js';
import { executeToolSafely } from './agentToolRegistry.js';
import { readWalletToolResult } from './agentWalletTools.js';
import { readMarketsToolResult } from './agentMarketsTools.js';
import { prepareShieldHandoff } from './agentShieldTools.js';
import { prepareCloakHandoff } from './agentCloakHandoff.js';
import { prepareZerionHandoff } from './agentZerionHandoff.js';
import { appendHandoffEntry } from './agentHandoffStorage.js';
import { createAgentContextBundle } from './agentContextTools.js';

export interface RuntimeTransition {
  state: GorkhAgentStationState;
  audit: GorkhAgentAuditEvent[];
}

function withAudit(
  state: GorkhAgentStationState,
  events: GorkhAgentAuditEvent[]
): GorkhAgentStationState {
  const updatedAudit = [...state.audit, ...events].slice(-500);
  return { ...state, audit: updatedAudit, updatedAt: Date.now() };
}

export function startAgent(
  state: GorkhAgentStationState,
  mode: GorkhAgentRuntimeMode = state.runtime.runtimeMode
): RuntimeTransition {
  if (state.runtime.killSwitchEnabled) {
    return { state, audit: [] };
  }
  const event = auditAgentStarted(mode);
  const runtime: GorkhAgentRuntimeState = {
    ...state.runtime,
    isRunning: true,
    isPaused: false,
    runtimeMode: mode,
    backgroundAllowed: mode === GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN,
    nextTickAt: Date.now() + state.runtime.tickIntervalSeconds * 1000,
  };
  const next: GorkhAgentStationState = {
    ...state,
    runtime,
    profile: { ...state.profile, status: GorkhAgentStatus.RUNNING, updatedAt: Date.now() },
  };
  return { state: withAudit(next, [event]), audit: [event] };
}

export function pauseAgent(state: GorkhAgentStationState): RuntimeTransition {
  const event = auditAgentPaused();
  const runtime = { ...state.runtime, isRunning: false, isPaused: true };
  const next = {
    ...state,
    runtime,
    profile: { ...state.profile, status: GorkhAgentStatus.PAUSED, updatedAt: Date.now() },
  };
  return { state: withAudit(next, [event]), audit: [event] };
}

export function resumeAgent(state: GorkhAgentStationState): RuntimeTransition {
  if (state.runtime.killSwitchEnabled) {
    return { state, audit: [] };
  }
  const event = auditAgentResumed();
  const runtime = {
    ...state.runtime,
    isRunning: true,
    isPaused: false,
    nextTickAt: Date.now() + state.runtime.tickIntervalSeconds * 1000,
  };
  const next = {
    ...state,
    runtime,
    profile: { ...state.profile, status: GorkhAgentStatus.RUNNING, updatedAt: Date.now() },
  };
  return { state: withAudit(next, [event]), audit: [event] };
}

export function killAgent(state: GorkhAgentStationState): RuntimeTransition {
  const event = auditAgentKilled();
  const runtime: GorkhAgentRuntimeState = {
    ...state.runtime,
    isRunning: false,
    isPaused: false,
    killSwitchEnabled: true,
  };
  const approvals = state.approvals.map((a) =>
    a.approvalState === 'pending' ? transitionApproval(a, 'blocked') : a
  );
  const next = {
    ...state,
    runtime,
    approvals,
    profile: { ...state.profile, status: GorkhAgentStatus.KILLED, updatedAt: Date.now() },
  };
  return { state: withAudit(next, [event]), audit: [event] };
}

export function tickAgent(state: GorkhAgentStationState): RuntimeTransition {
  if (state.runtime.killSwitchEnabled) {
    return { state, audit: [] };
  }
  if (!state.runtime.isRunning || state.runtime.isPaused) {
    return { state, audit: [] };
  }
  const now = Date.now();
  const runtime: GorkhAgentRuntimeState = {
    ...state.runtime,
    lastTickAt: now,
    nextTickAt: now + state.runtime.tickIntervalSeconds * 1000,
  };
  // Heartbeat-only tick. v0.1 ticks never sign or execute.
  return { state: { ...state, runtime, updatedAt: now }, audit: [] };
}

export interface ManualRunInput {
  intent: string;
}

export interface ManualRunModuleContext {
  walletWorkspace?: SolanaWalletWorkspaceState | null;
  marketsWorkspace?: SolanaMarketsWorkspaceState | null;
  walletPortfolioSummary?: SolanaWalletPortfolioSummary | null;
  marketsProviderContexts?: string[];
  marketsSampleData?: boolean;
  marketsBirdeyeContext?: boolean;
  zerionWalletName?: string;
  zerionPolicyName?: string;
  zerionPolicyDigest?: string;
}

export interface ManualRunResult {
  state: GorkhAgentStationState;
  task: GorkhAgentTask;
  toolCall: GorkhAgentToolCall;
  proposal: GorkhAgentProposal;
  approval?: GorkhAgentApprovalItem;
  walletResult?: GorkhAgentWalletToolResult;
  marketsResult?: GorkhAgentMarketsToolResult;
  shieldResult?: GorkhAgentShieldToolResult;
  cloakHandoff?: GorkhAgentCloakDraftHandoff;
  zerionHandoff?: GorkhAgentZerionProposalHandoff;
  contextBundle?: GorkhAgentContextBundleResult;
  handoffEntry?: GorkhAgentHandoffEntry;
}

export function manualRun(
  state: GorkhAgentStationState,
  input: ManualRunInput,
  context: ManualRunModuleContext = {}
): ManualRunResult {
  if (state.runtime.killSwitchEnabled) {
    throw new Error('Kill switch is engaged. Disable the kill switch before running tasks.');
  }
  const trimmed = input.intent.trim();
  if (!trimmed) {
    throw new Error('Intent cannot be empty.');
  }

  const plan = planTaskFromIntent(trimmed);
  const policyDigest = computePolicyDigest(state.policy);

  const taskCreatedEvent = auditTaskCreated(plan.task.id, plan.task.title, plan.task.kind);
  const events: GorkhAgentAuditEvent[] = [taskCreatedEvent];

  const { toolCall, evaluation } = executeToolSafely(plan.toolId, {
    policy: state.policy,
    runtime: state.runtime,
    taskId: plan.task.id,
    inputSummary: trimmed,
    protocol: plan.protocol,
  });

  events.push(auditToolCalled(plan.task.id, toolCall.toolId, toolCall.status));
  if (!evaluation.allowed) {
    events.push(auditPolicyBlocked(plan.toolId, evaluation.blockedReasons));
  }

  // v0.2 — produce real tool results / handoffs based on planned kind.
  let walletResult: GorkhAgentWalletToolResult | undefined;
  let marketsResult: GorkhAgentMarketsToolResult | undefined;
  let shieldResult: GorkhAgentShieldToolResult | undefined;
  let cloakHandoff: GorkhAgentCloakDraftHandoff | undefined;
  let zerionHandoff: GorkhAgentZerionProposalHandoff | undefined;
  let contextBundle: GorkhAgentContextBundleResult | undefined;

  if (evaluation.allowed) {
    switch (plan.task.kind) {
      case GorkhAgentTaskKind.PORTFOLIO_ANALYSIS:
      case GorkhAgentTaskKind.GENERAL_PLANNING:
        walletResult = readWalletToolResult({
          workspace: context.walletWorkspace ?? null,
          portfolioSummary: context.walletPortfolioSummary,
        });
        break;
      case GorkhAgentTaskKind.TOKEN_ANALYSIS:
        marketsResult = readMarketsToolResult({
          workspace: context.marketsWorkspace ?? null,
          providerContexts: context.marketsProviderContexts,
          sampleDataPresent: context.marketsSampleData,
          birdeyeContextPresent: context.marketsBirdeyeContext,
        });
        break;
      case GorkhAgentTaskKind.TRANSACTION_REVIEW:
        shieldResult = prepareShieldHandoff({ intent: trimmed });
        break;
      case GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT:
        walletResult = readWalletToolResult({
          workspace: context.walletWorkspace ?? null,
          portfolioSummary: context.walletPortfolioSummary,
        });
        cloakHandoff = prepareCloakHandoff({
          intent: trimmed,
          walletResult,
        });
        break;
      case GorkhAgentTaskKind.ZERION_DCA_PROPOSAL:
        zerionHandoff = prepareZerionHandoff({
          intent: trimmed,
          walletName: context.zerionWalletName,
          policyName: context.zerionPolicyName,
          policyDigest: context.zerionPolicyDigest,
        });
        break;
      case GorkhAgentTaskKind.CONTEXT_SUMMARY:
        walletResult = readWalletToolResult({
          workspace: context.walletWorkspace ?? null,
          portfolioSummary: context.walletPortfolioSummary,
        });
        marketsResult = readMarketsToolResult({
          workspace: context.marketsWorkspace ?? null,
          providerContexts: context.marketsProviderContexts,
          sampleDataPresent: context.marketsSampleData,
          birdeyeContextPresent: context.marketsBirdeyeContext,
        });
        contextBundle = createAgentContextBundle({
          profile: state.profile,
          runtime: state.runtime,
          policy: state.policy,
          tasks: state.tasks,
          proposals: state.proposals,
          approvals: state.approvals,
          audit: state.audit,
          memory: state.memory,
          walletResult,
          marketsResult,
          shieldResult,
          cloakHandoffs: [],
          zerionHandoffs: [],
        });
        break;
      default:
        break;
    }
  }

  const enrichedSummary = enrichSummary(plan.baseSummary, {
    walletResult,
    marketsResult,
    shieldResult,
    cloakHandoff,
    zerionHandoff,
    contextBundle,
  });

  const proposal: GorkhAgentProposal = {
    ...buildProposal(plan, policyDigest, evaluation.blockedReasons, evaluation.requiresApproval),
    summary: enrichedSummary,
  };
  events.push(auditProposalCreated(proposal.id, plan.task.id, proposal.kind));

  let approval: GorkhAgentApprovalItem | undefined;
  if (evaluation.requiresApproval) {
    approval = createApprovalItem(proposal, evaluation.riskLevel);
    events.push(auditApprovalRequired(proposal.id, evaluation.riskLevel));
  }

  const updatedTask: GorkhAgentTask = {
    ...plan.task,
    status: evaluation.allowed
      ? evaluation.requiresApproval
        ? GorkhAgentTaskStatus.WAITING_FOR_APPROVAL
        : GorkhAgentTaskStatus.COMPLETED
      : GorkhAgentTaskStatus.BLOCKED,
    updatedAt: Date.now(),
  };

  const handoffEntry: GorkhAgentHandoffEntry | undefined = createHandoffEntry({
    taskId: plan.task.id,
    walletResult,
    marketsResult,
    shieldResult,
    cloakHandoff,
    zerionHandoff,
    contextBundle,
  });

  if (handoffEntry) {
    try {
      appendHandoffEntry(handoffEntry);
    } catch {
      // Storage rejection (e.g. forbidden field) — surface as warning only.
    }
  }

  const next: GorkhAgentStationState = withAudit(
    {
      ...state,
      tasks: [...state.tasks, updatedTask].slice(-200),
      toolCalls: [...state.toolCalls, toolCall].slice(-500),
      proposals: [...state.proposals, proposal].slice(-200),
      approvals: approval ? [...state.approvals, approval].slice(-200) : state.approvals,
    },
    events
  );

  return {
    state: next,
    task: updatedTask,
    toolCall,
    proposal,
    approval,
    walletResult,
    marketsResult,
    shieldResult,
    cloakHandoff,
    zerionHandoff,
    contextBundle,
    handoffEntry,
  };
}

interface CreateHandoffEntryInput {
  taskId: string;
  walletResult?: GorkhAgentWalletToolResult;
  marketsResult?: GorkhAgentMarketsToolResult;
  shieldResult?: GorkhAgentShieldToolResult;
  cloakHandoff?: GorkhAgentCloakDraftHandoff;
  zerionHandoff?: GorkhAgentZerionProposalHandoff;
  contextBundle?: GorkhAgentContextBundleResult;
}

function createHandoffEntry(input: CreateHandoffEntryInput): GorkhAgentHandoffEntry | undefined {
  let kind: GorkhAgentHandoffEntry['kind'] | undefined;
  if (input.contextBundle) kind = 'context_bundle';
  else if (input.cloakHandoff) kind = 'cloak_draft';
  else if (input.zerionHandoff) kind = 'zerion_proposal';
  else if (input.shieldResult) kind = 'shield_review';
  else if (input.marketsResult) kind = 'markets_summary';
  else if (input.walletResult) kind = 'wallet_summary';
  if (!kind) return undefined;

  return {
    id: `gorkh-handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskId: input.taskId,
    kind,
    walletResult: input.walletResult,
    marketsResult: input.marketsResult,
    shieldResult: input.shieldResult,
    cloakHandoff: input.cloakHandoff,
    zerionHandoff: input.zerionHandoff,
    contextBundle: input.contextBundle,
    createdAt: Date.now(),
  };
}

function enrichSummary(
  base: string,
  parts: {
    walletResult?: GorkhAgentWalletToolResult;
    marketsResult?: GorkhAgentMarketsToolResult;
    shieldResult?: GorkhAgentShieldToolResult;
    cloakHandoff?: GorkhAgentCloakDraftHandoff;
    zerionHandoff?: GorkhAgentZerionProposalHandoff;
    contextBundle?: GorkhAgentContextBundleResult;
  }
): string {
  const extras: string[] = [];
  if (parts.walletResult) {
    extras.push(
      parts.walletResult.hasSnapshot
        ? `wallet snapshot read: ${parts.walletResult.selectedProfileLabel ?? 'profile'}`
        : 'wallet has no snapshot yet'
    );
  }
  if (parts.marketsResult) {
    extras.push(`markets watchlist: ${parts.marketsResult.watchlistCount} items`);
  }
  if (parts.shieldResult) {
    extras.push(`shield handoff (${parts.shieldResult.inputKind}) ready for manual review`);
  }
  if (parts.cloakHandoff) {
    extras.push(`cloak ${parts.cloakHandoff.draftKind} (${parts.cloakHandoff.handoffStatus})`);
  }
  if (parts.zerionHandoff) {
    extras.push(`zerion ${parts.zerionHandoff.proposalKind} ${parts.zerionHandoff.amountSol} SOL→USDC (${parts.zerionHandoff.handoffStatus})`);
  }
  if (parts.contextBundle) {
    extras.push(
      `context bundle ready: ${parts.contextBundle.sources.length} source(s), ${parts.contextBundle.redactionsApplied.length} redaction rule(s)`
    );
  }
  if (extras.length === 0) return base;
  return `${base} | ${extras.join(' · ')}`.slice(0, 2000);
}

export function rejectApproval(
  state: GorkhAgentStationState,
  approvalId: string
): RuntimeTransition {
  const approval = state.approvals.find((a) => a.id === approvalId);
  if (!approval) return { state, audit: [] };
  const updated = transitionApproval(approval, 'rejected');
  const event = auditApprovalRejected(approval.proposalId);
  const next = {
    ...state,
    approvals: state.approvals.map((a) => (a.id === approvalId ? updated : a)),
  };
  return { state: withAudit(next, [event]), audit: [event] };
}

export function approveLocally(
  state: GorkhAgentStationState,
  approvalId: string
): RuntimeTransition {
  const approval = state.approvals.find((a) => a.id === approvalId);
  if (!approval) return { state, audit: [] };
  const updated = transitionApproval(approval, 'approved');
  const next = {
    ...state,
    approvals: state.approvals.map((a) => (a.id === approvalId ? updated : a)),
  };
  return { state: withAudit(next, []), audit: [] };
}
