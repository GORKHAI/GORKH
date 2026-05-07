import {
  GorkhAgentChatRunSchema,
  GorkhAgentChatThreadSchema,
  GorkhAgentChatToolCardSchema,
  type GorkhAgentChatRun,
  type GorkhAgentChatSettings,
  type GorkhAgentChatThread,
  type GorkhAgentChatToolCard,
} from '@gorkh/shared';
import { assertNoSensitiveAgentChatContent } from './agentChatRedaction.js';
import {
  createDefaultAgentChatSettings,
  normalizeAgentChatSettings,
} from './agentChatSettings.js';
import { createAgentChatThread } from './createAgentChatThread.js';

export const AGENT_CHAT_STORAGE_KEY = 'gorkh.solana.agentStation.chat.v1';
export const MAX_AGENT_CHAT_THREADS = 20;
export const MAX_AGENT_CHAT_MESSAGES_PER_THREAD = 200;

export interface AgentChatStorageState {
  threads: GorkhAgentChatThread[];
  activeThreadId: string;
  toolCardsByMessageId: Record<string, GorkhAgentChatToolCard[]>;
  runs: GorkhAgentChatRun[];
  redactedContextSummaries: Record<string, string>;
  settings: GorkhAgentChatSettings;
  updatedAt: number;
  localOnly: true;
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createEmptyAgentChatStorageState(now: number = Date.now()): AgentChatStorageState {
  const thread = createAgentChatThread(now);
  return {
    threads: [thread],
    activeThreadId: thread.id,
    toolCardsByMessageId: {},
    runs: [],
    redactedContextSummaries: {},
    settings: createDefaultAgentChatSettings(),
    updatedAt: now,
    localOnly: true,
  };
}

export function normalizeAgentChatStorageState(value: unknown): AgentChatStorageState {
  if (!value || typeof value !== 'object') return createEmptyAgentChatStorageState();
  const candidate = value as Partial<AgentChatStorageState>;
  const threads = (candidate.threads ?? [])
    .map((thread) => {
      const rawThread = thread as Partial<GorkhAgentChatThread>;
      return GorkhAgentChatThreadSchema.safeParse({
        ...rawThread,
        messages: Array.isArray(rawThread.messages)
          ? rawThread.messages.slice(-MAX_AGENT_CHAT_MESSAGES_PER_THREAD)
          : [],
      });
    })
    .filter((result) => result.success)
    .map((result) => ({
      ...result.data,
      messages: result.data.messages.slice(-MAX_AGENT_CHAT_MESSAGES_PER_THREAD),
    }))
    .slice(-MAX_AGENT_CHAT_THREADS);
  const normalized = threads.length > 0 ? threads : [createAgentChatThread()];
  const activeThreadId =
    candidate.activeThreadId && normalized.some((thread) => thread.id === candidate.activeThreadId)
      ? candidate.activeThreadId
      : normalized[0].id;
  const toolCardsByMessageId: Record<string, GorkhAgentChatToolCard[]> = {};
  for (const [messageId, cards] of Object.entries(candidate.toolCardsByMessageId ?? {})) {
    toolCardsByMessageId[messageId] = (Array.isArray(cards) ? cards : [])
      .map((card) => GorkhAgentChatToolCardSchema.safeParse(card))
      .filter((result) => result.success)
      .map((result) => result.data)
      .slice(0, 8);
  }
  return {
    threads: normalized,
    activeThreadId,
    toolCardsByMessageId,
    runs: (candidate.runs ?? [])
      .map((run) => GorkhAgentChatRunSchema.safeParse(run))
      .filter((result) => result.success)
      .map((result) => result.data)
      .slice(-200),
    redactedContextSummaries: candidate.redactedContextSummaries ?? {},
    settings: normalizeAgentChatSettings(candidate.settings),
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
    localOnly: true,
  };
}

export function loadAgentChatStorageState(): AgentChatStorageState {
  const storage = getStorage();
  if (!storage) return createEmptyAgentChatStorageState();
  const raw = storage.getItem(AGENT_CHAT_STORAGE_KEY);
  if (!raw) return createEmptyAgentChatStorageState();
  try {
    return normalizeAgentChatStorageState(JSON.parse(raw));
  } catch {
    return createEmptyAgentChatStorageState();
  }
}

export function saveAgentChatStorageState(state: AgentChatStorageState): void {
  const normalized = normalizeAgentChatStorageState({ ...state, updatedAt: Date.now() });
  assertNoSensitiveAgentChatContent(normalized);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AGENT_CHAT_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearAgentChatStorageState(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(AGENT_CHAT_STORAGE_KEY);
}
