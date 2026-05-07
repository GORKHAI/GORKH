import type { GorkhAgentChatThread } from '@gorkh/shared';

export function createAgentChatThread(now: number = Date.now()): GorkhAgentChatThread {
  return {
    id: `gorkh-chat-thread-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'GORKH Agent Chat',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    messages: [],
    localOnly: true,
  };
}
