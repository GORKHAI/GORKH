import assert from 'node:assert/strict';
import test from 'node:test';

test('shared protocol accepts a valid tool lifecycle request payload', async () => {
  const { PROTOCOL_VERSION, parseDeviceMessage } = await import('../packages/shared/dist/index.js');

  const parsed = parseDeviceMessage({
    v: PROTOCOL_VERSION,
    type: 'device.tool.request',
    ts: Date.now(),
    payload: {
      deviceId: 'device-1',
      runId: 'run-1',
      toolEventId: 'tool-event-1',
      toolCallId: 'tool-call-1',
      toolCall: {
        tool: 'terminal.exec',
        cmd: 'pnpm',
        args: [],
      },
      at: Date.now(),
    },
  });

  assert.equal(parsed.success, true);
});

test('shared protocol rejects malformed terminal tool payloads', async () => {
  const { PROTOCOL_VERSION, parseDeviceMessage } = await import('../packages/shared/dist/index.js');

  const parsed = parseDeviceMessage({
    v: PROTOCOL_VERSION,
    type: 'device.tool.request',
    ts: Date.now(),
    payload: {
      deviceId: 'device-1',
      runId: 'run-1',
      toolEventId: 'tool-event-1',
      toolCallId: 'tool-call-1',
      toolCall: {
        tool: 'terminal.exec',
        cmd: 'pnpm',
      },
      at: Date.now(),
    },
  });

  assert.equal(parsed.success, false);
});

test('createServerMessage always stamps the current protocol version', async () => {
  const { PROTOCOL_VERSION, createServerMessage } = await import('../packages/shared/dist/index.js');

  const message = createServerMessage('server.pong', {
    deviceId: 'device-1',
  });

  assert.equal(message.v, PROTOCOL_VERSION);
  assert.equal(message.type, 'server.pong');
  assert.equal(message.payload.deviceId, 'device-1');
});
