import assert from 'node:assert/strict';
import test from 'node:test';
import { WsClient } from '../apps/desktop/src/lib/wsClient.ts';

test('manual ws disconnect suppresses reconnect scheduling for sign-out flows', () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  const scheduled: number[] = [];
  const sockets: FakeWebSocket[] = [];

  class FakeWebSocket {
    static OPEN = 1;
    readyState = FakeWebSocket.OPEN;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(_url: string) {
      sockets.push(this);
    }

    send(_message: string) {}

    close() {
      this.readyState = 3;
      this.onclose?.();
    }
  }

  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  globalThis.setTimeout = ((fn: (...args: unknown[]) => void, delay?: number) => {
    scheduled.push(Number(delay ?? 0));
    return { fn, delay } as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = (() => {}) as typeof clearTimeout;

  try {
    const client = new WsClient({
      deviceId: 'desktop-1',
      platform: 'linux',
    });

    client.connect('ws://localhost:3001/ws');
    assert.equal(sockets.length, 1, 'expected the client to open one websocket connection');

    client.disconnect();

    assert.deepEqual(scheduled, [], 'manual disconnect should not schedule reconnect backoff');
  } finally {
    globalThis.WebSocket = originalWebSocket;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
