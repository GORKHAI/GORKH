import type {
  GorkhAgentChatMessage,
  GorkhAgentChatMessageStatus,
  GorkhAgentChatRole,
  GorkhAgentTaskKind,
} from '@gorkh/shared';

export interface CreateAgentChatMessageInput {
  threadId: string;
  role: GorkhAgentChatRole;
  content: string;
  status?: GorkhAgentChatMessageStatus;
  intentKind?: GorkhAgentTaskKind;
  relatedTaskId?: string;
  relatedProposalId?: string;
  relatedToolCallIds?: string[];
  safetyNotes?: string[];
  redactionsApplied?: string[];
}

export function createAgentChatMessage(
  input: CreateAgentChatMessageInput,
  now: number = Date.now()
): GorkhAgentChatMessage {
  return {
    id: `gorkh-chat-message-${now}-${Math.random().toString(36).slice(2, 8)}`,
    threadId: input.threadId,
    role: input.role,
    content: input.content.slice(0, 8000),
    createdAt: now,
    status: input.status ?? 'completed',
    intentKind: input.intentKind,
    relatedTaskId: input.relatedTaskId,
    relatedProposalId: input.relatedProposalId,
    relatedToolCallIds: input.relatedToolCallIds ?? [],
    safetyNotes: input.safetyNotes ?? [],
    redactionsApplied: input.redactionsApplied ?? [],
    localOnly: true,
  };
}
