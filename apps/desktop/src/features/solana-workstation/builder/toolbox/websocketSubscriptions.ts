import type { ProgramLogEvent, WebsocketSubscriptionProfile } from '@gorkh/shared';

export const BUILDER_TOOLBOX_LOG_BUFFER_LIMIT = 120;
export const BUILDER_TOOLBOX_SUBSCRIPTION_EVENT_LIMIT = 160;

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function capLogEvents(events: ProgramLogEvent[], limit = BUILDER_TOOLBOX_LOG_BUFFER_LIMIT): ProgramLogEvent[] {
  return events.slice(Math.max(0, events.length - limit));
}

export function createProgramLogEvent(logs: string[], signature?: string, slot?: number, err?: unknown): ProgramLogEvent {
  return {
    id: id('builder-log'),
    timestamp: Date.now(),
    signature,
    slot,
    logs,
    err,
  };
}

export function createSubscriptionProfile(
  kind: WebsocketSubscriptionProfile['kind'],
  target?: string
): WebsocketSubscriptionProfile {
  return {
    id: id('builder-ws'),
    kind,
    target,
    status: 'idle',
    eventCount: 0,
    createdAt: Date.now(),
  };
}

export function normalizeWebsocketUrl(rpcUrl: string, websocketUrl?: string): string | null {
  const source = websocketUrl?.trim() || rpcUrl.trim();
  try {
    const parsed = new URL(source);
    if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
    else if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildReadOnlySubscriptionPayload(
  subscription: WebsocketSubscriptionProfile
): { method: 'accountSubscribe' | 'logsSubscribe' | 'slotSubscribe'; params: unknown[] } {
  if (subscription.kind === 'account') {
    return { method: 'accountSubscribe', params: [subscription.target, { encoding: 'base64', commitment: 'confirmed' }] };
  }
  if (subscription.kind === 'program_logs') {
    return { method: 'logsSubscribe', params: [{ mentions: [subscription.target] }, { commitment: 'confirmed' }] };
  }
  return { method: 'slotSubscribe', params: [] };
}

export function isReadOnlySubscriptionMethod(method: string): boolean {
  return method === 'accountSubscribe' || method === 'logsSubscribe' || method === 'slotSubscribe';
}
