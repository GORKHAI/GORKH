import {
  GorkhAgentToolCallStatus,
  type GorkhAgentToolCall,
  type GorkhAgentToolId,
} from '@gorkh/shared';
import { evaluateAgentToolRequest, type AgentToolEvaluation } from './agentPolicyEngine.js';
import type { GorkhAgentPolicy, GorkhAgentRuntimeState } from '@gorkh/shared';

export interface ToolExecutionContext {
  policy: GorkhAgentPolicy;
  runtime: GorkhAgentRuntimeState;
  taskId: string;
  inputSummary: string;
  protocol?: string;
}

export interface ToolExecutionRecord {
  toolCall: GorkhAgentToolCall;
  evaluation: AgentToolEvaluation;
}

const TOOL_DEFAULT_OUTPUTS: Record<GorkhAgentToolId, string> = {
  // Allowed (v0.2 — real module data is layered on by the runtime; these are
  // the baseline honest summaries when no enriched module context is provided)
  'wallet.read_snapshot':
    'Read selected wallet profile + latest read-only snapshot. No RPC fetched, no signing.',
  'wallet.read_portfolio':
    'Read selected wallet profile + portfolio summary if present. No RPC fetched, no signing.',
  'markets.read_watchlist':
    'Read Markets watchlist + analyses already stored locally. No API key used, no trade.',
  'markets.fetch_context':
    'Read existing Markets analyses if present. No automatic Birdeye/API fetch in v0.2.',
  'shield.decode_transaction':
    'Prepared Shield decode handoff. Open Shield to run analyze manually.',
  'shield.simulate_transaction':
    'Prepared Shield simulation handoff. Open Shield to run simulate manually.',
  'cloak.prepare_deposit':
    'Cloak deposit draft prepared. Execution stays in Wallet → Cloak Private with explicit approval.',
  'cloak.prepare_private_send':
    'Cloak private-send draft prepared. Execution stays in Wallet → Cloak Private with explicit approval.',
  'zerion.create_proposal':
    'Zerion swap proposal handoff prepared. Execution requires Zerion Executor approval.',
  'zerion.read_policy':
    'Zerion local policy snapshot read.',
  'context.create_bundle':
    'Sanitized context bundle assembled. Secrets redacted.',
  'builder.inspect_workspace':
    'Builder workspace inspection summary prepared.',
  'builder.analyze_logs':
    'Builder log analysis prepared. No deploys executed.',
  // Blocked (returned only when blocked path is exercised)
  'wallet.export_private_key': 'Refused: blocked tool.',
  'wallet.sign_without_approval': 'Refused: blocked tool.',
  'wallet.send_without_approval': 'Refused: blocked tool.',
  'cloak.execute_private_send_autonomous': 'Refused: blocked tool.',
  'cloak.execute_deposit_autonomous': 'Refused: blocked tool.',
  'cloak.export_note_secret': 'Refused: blocked tool.',
  'cloak.export_viewing_key': 'Refused: blocked tool.',
  'zerion.execute_without_approval': 'Refused: blocked tool.',
  'zerion_cli_swap_execute': 'Refused: blocked tool.',
  'markets.execute_trade_autonomous': 'Refused: blocked tool.',
  'dao.vote_autonomous': 'Refused: blocked tool.',
  'yield.move_funds_autonomous': 'Refused: blocked tool.',
  'copytrade.execute_autonomous': 'Refused: blocked tool.',
  'terminal.exec_arbitrary': 'Refused: blocked tool.',
  'shell.exec_arbitrary': 'Refused: blocked tool.',
};

export function executeToolSafely(
  toolId: GorkhAgentToolId,
  context: ToolExecutionContext
): ToolExecutionRecord {
  const evaluation = evaluateAgentToolRequest(context.policy, context.runtime, {
    toolId,
    isProposalDraft: true,
    protocol: context.protocol,
  });

  const now = Date.now();
  const status: GorkhAgentToolCallStatus = evaluation.allowed
    ? GorkhAgentToolCallStatus.COMPLETED
    : GorkhAgentToolCallStatus.BLOCKED;

  const outputSummary = evaluation.allowed
    ? TOOL_DEFAULT_OUTPUTS[toolId] ?? 'Tool completed.'
    : `Tool blocked. ${evaluation.blockedReasons.slice(0, 2).join(' ')}`;

  const toolCall: GorkhAgentToolCall = {
    id: `gorkh-toolcall-${now}-${Math.random().toString(36).slice(2, 8)}`,
    taskId: context.taskId,
    toolId,
    inputSummary: context.inputSummary.slice(0, 1000),
    outputSummary: outputSummary.slice(0, 2000),
    status,
    startedAt: now,
    completedAt: now,
    error: evaluation.allowed ? undefined : evaluation.blockedReasons.join('; ').slice(0, 2000),
  };

  return { toolCall, evaluation };
}
