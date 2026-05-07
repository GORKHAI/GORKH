import {
  GORKH_AGENT_CHAT_SAFETY_NOTES,
  GorkhAgentAuditEventKind,
  GorkhAgentTaskKind,
  type GorkhAgentChatRun,
  type GorkhAgentChatThread,
  type GorkhAgentChatToolCard,
  type GorkhAgentStationState,
} from '@gorkh/shared';
import { createAuditEvent } from '../agentAudit.js';
import { manualRun, type ManualRunModuleContext, type ManualRunResult } from '../agentRuntime.js';
import { executeToolSafely } from '../agentToolRegistry.js';
import { classifyAgentChatIntent } from './classifyAgentChatIntent.js';
import { createAgentChatMessage } from './createAgentChatMessage.js';
import { createRedactedAgentChatContext } from './createRedactedAgentChatContext.js';
import { redactAgentChatText } from './agentChatRedaction.js';
import { createAgentChatToolCards } from './createAgentChatToolCards.js';
import { formatAgentChatReply } from './formatAgentChatReply.js';
import { planAgentChatWithLlm } from './agentChatLlmBridge.js';
import type { AgentChatStorageState } from './agentChatStorage.js';

export interface RunAgentChatTurnInput {
  stationState: GorkhAgentStationState;
  chatState: AgentChatStorageState;
  userText: string;
  moduleContext: ManualRunModuleContext;
}

export interface RunAgentChatTurnResult {
  stationState: GorkhAgentStationState;
  chatState: AgentChatStorageState;
  run: GorkhAgentChatRun;
  toolCards: GorkhAgentChatToolCard[];
  manualRunResult?: ManualRunResult;
}

function isHelpAllowedWhileKilled(text: string): boolean {
  return /(help|what can you do|status|safety|explain)/i.test(text);
}

export async function runAgentChatTurn(
  input: RunAgentChatTurnInput
): Promise<RunAgentChatTurnResult> {
  const now = Date.now();
  const thread = input.chatState.threads.find((candidate) => candidate.id === input.chatState.activeThreadId)
    ?? input.chatState.threads[0];
  const redactedUser = redactAgentChatText(input.userText);
  const classification = classifyAgentChatIntent(redactedUser.text);
  const userMessage = createAgentChatMessage({
    threadId: thread.id,
    role: 'user',
    content: redactedUser.text,
    status: 'completed',
    intentKind: classification.intentKind,
    redactionsApplied: redactedUser.redactionsApplied,
    safetyNotes: redactedUser.redactionsApplied.length > 0 ? ['Sensitive-looking content was redacted before storage.'] : [],
  }, now);

  const redactedContext = createRedactedAgentChatContext({
    stationState: input.stationState,
    settings: input.chatState.settings,
    walletWorkspace: input.moduleContext.walletWorkspace,
    marketsWorkspace: input.moduleContext.marketsWorkspace,
    lastModuleContext: input.moduleContext.lastModuleContext,
    marketsSampleData: input.moduleContext.marketsSampleData,
  });
  await planAgentChatWithLlm(input.chatState.settings, redactedContext, redactedUser.text);

  let stationState = input.stationState;
  let manualRunResult: ManualRunResult | undefined;
  let toolCards: GorkhAgentChatToolCard[] = [];
  let status: GorkhAgentChatRun['status'] = 'completed';
  let replyIntentKind = classification.intentKind;

  if (
    stationState.runtime.killSwitchEnabled &&
    !isHelpAllowedWhileKilled(redactedUser.text)
  ) {
    const audit = createAuditEvent(
      GorkhAgentAuditEventKind.POLICY_BLOCKED,
      'Chat request blocked because the kill switch is engaged.',
      { source: 'gorkh_agent_chat' }
    );
    stationState = { ...stationState, audit: [...stationState.audit, audit].slice(-500), updatedAt: now };
    status = 'blocked';
    toolCards = [{
      id: `gorkh-chat-card-policy-${now}`,
      kind: 'policy_block',
      title: 'Policy Blocked',
      summary: 'Kill switch is engaged. Chat can only explain status or safety until the station is reset.',
      status: 'blocked',
      localOnly: true,
    }];
  } else if (classification.blockedToolId) {
    const record = executeToolSafely(classification.blockedToolId, {
      policy: stationState.policy,
      runtime: stationState.runtime,
      taskId: `gorkh-chat-blocked-${now}`,
      inputSummary: redactedUser.text,
    });
    const audit = createAuditEvent(
      GorkhAgentAuditEventKind.POLICY_BLOCKED,
      classification.blockedReason ?? record.toolCall.outputSummary,
      { source: 'gorkh_agent_chat', toolId: classification.blockedToolId }
    );
    stationState = {
      ...stationState,
      toolCalls: [...stationState.toolCalls, record.toolCall].slice(-500),
      audit: [...stationState.audit, audit].slice(-500),
      updatedAt: now,
    };
    status = 'blocked';
    toolCards = [{
      id: `gorkh-chat-card-policy-${now}`,
      kind: 'policy_block',
      title: 'Policy Blocked',
      summary: classification.blockedReason ?? record.toolCall.outputSummary,
      status: 'blocked',
      localOnly: true,
    }];
  } else if (classification.intentKind !== GorkhAgentTaskKind.GENERAL_PLANNING || !/(what can you do|help|safety)/i.test(redactedUser.text)) {
    manualRunResult = manualRun(stationState, { intent: redactedUser.text }, input.moduleContext);
    stationState = manualRunResult.state;
    replyIntentKind = manualRunResult.task.kind;
    toolCards = createAgentChatToolCards(manualRunResult);
    status = manualRunResult.toolCall.status === 'blocked' ? 'blocked' : 'completed';
  }

  const reply =
    status === 'blocked'
      ? 'I blocked this request because it requires autonomous wallet execution, which GORKH does not allow.'
      : formatAgentChatReply(replyIntentKind, manualRunResult ?? null, redactedContext);
  const agentMessage = createAgentChatMessage({
    threadId: thread.id,
    role: 'agent',
    content: reply,
    status: status === 'blocked' ? 'blocked' : 'completed',
    intentKind: replyIntentKind,
    relatedTaskId: manualRunResult?.task.id,
    relatedProposalId: manualRunResult?.proposal.id,
    relatedToolCallIds: manualRunResult ? [manualRunResult.toolCall.id] : [],
    safetyNotes: [...GORKH_AGENT_CHAT_SAFETY_NOTES],
    redactionsApplied: redactedContext.redactionsApplied,
  });

  const updatedThread: GorkhAgentChatThread = {
    ...thread,
    title: thread.messages.length === 0 ? redactedUser.text.slice(0, 64) || thread.title : thread.title,
    messages: [...thread.messages, userMessage, agentMessage].slice(-200),
    updatedAt: Date.now(),
  };
  const run: GorkhAgentChatRun = {
    id: `gorkh-chat-run-${now}-${Math.random().toString(36).slice(2, 8)}`,
    threadId: thread.id,
    userMessageId: userMessage.id,
    status,
    intentKind: replyIntentKind,
    toolCallIds: manualRunResult ? [manualRunResult.toolCall.id] : [],
    proposalIds: manualRunResult ? [manualRunResult.proposal.id] : [],
    auditEventIds: stationState.audit.slice(-6).map((event) => event.id),
    createdAt: now,
    completedAt: Date.now(),
  };
  const chatState: AgentChatStorageState = {
    ...input.chatState,
    threads: input.chatState.threads.map((candidate) =>
      candidate.id === updatedThread.id ? updatedThread : candidate
    ),
    toolCardsByMessageId: {
      ...input.chatState.toolCardsByMessageId,
      [agentMessage.id]: toolCards,
    },
    redactedContextSummaries: {
      ...input.chatState.redactedContextSummaries,
      [run.id]: redactedContext.markdown.slice(0, 2000),
    },
    runs: [...input.chatState.runs, run].slice(-200),
    updatedAt: Date.now(),
  };

  return { stationState, chatState, run, toolCards, manualRunResult };
}
