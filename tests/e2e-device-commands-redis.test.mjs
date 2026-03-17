import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';

function applyApiEnv() {
  process.env.PORT = process.env.PORT || '3001';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/ai_operator_test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '30m';
  process.env.REFRESH_TOKEN_TTL_DAYS = process.env.REFRESH_TOKEN_TTL_DAYS || '14';
  process.env.CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token';
  process.env.ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || 'access_token';
  process.env.REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
  process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000';
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_value';
  process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_value';
  process.env.STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_test_value';
  process.env.APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
  process.env.API_PUBLIC_BASE_URL = process.env.API_PUBLIC_BASE_URL || 'http://127.0.0.1:3001';
  process.env.REDIS_URL = process.env.REDIS_URL || '';
  process.env.RATE_LIMIT_BACKEND = process.env.RATE_LIMIT_BACKEND || 'redis';
}

function waitFor(predicate, timeoutMs = 5_000, intervalMs = 50) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const result = await predicate();
        if (result) {
          resolve(result);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out after ${timeoutMs}ms`));
        return;
      }

      setTimeout(attempt, intervalMs);
    };

    void attempt();
  });
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  test('redis device command e2e requires REDIS_URL', { skip: true }, () => {});
} else {
  applyApiEnv();

  const [
    wsHandlerModule,
    deviceCommandsModule,
    devicesRepoModule,
    auditRepoModule,
  ] = await Promise.all([
    import('../apps/api/dist/lib/ws-handler.js'),
    import('../apps/api/dist/lib/device-commands.js'),
    import('../apps/api/dist/repos/devices.js'),
    import('../apps/api/dist/repos/audit.js'),
  ]);

  const { setupWebSocket } = wsHandlerModule;
  const {
    enqueueDeviceCommand,
    getQueueDepth,
    waitForEmptyQueue,
  } = deviceCommandsModule;
  const { devicesRepo } = devicesRepoModule;
  const { auditRepo } = auditRepoModule;

  class MockQueueDevice {
    constructor(deviceId, wsUrl, options = {}) {
      this.deviceId = deviceId;
      this.wsUrl = wsUrl;
      this.options = options;
      this.ws = null;
      this.helloAckResolver = null;
      this.helloAckPromise = null;
      this.receivedCounts = new Map();
      this.processCounts = new Map();
      this.storedAcks = new Map();
      this.commandLog = [];
    }

    async connect() {
      this.ws = new WebSocket(this.wsUrl);
      this.helloAckPromise = new Promise((resolve) => {
        this.helloAckResolver = resolve;
      });

      this.ws.addEventListener('open', () => {
        this.send('device.hello', {
          deviceId: this.deviceId,
          deviceName: `Queue Test ${this.deviceId.slice(0, 6)}`,
          platform: 'linux',
          appVersion: 'test',
        });
      });

      this.ws.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data));
        void this.handleMessage(message);
      });

      await this.helloAckPromise;
    }

    async disconnect() {
      if (!this.ws) {
        return;
      }

      const ws = this.ws;
      this.ws = null;

      await new Promise((resolve) => {
        ws.addEventListener('close', () => resolve(), { once: true });
        ws.close();
      });
    }

    getDeliveryCount(commandId) {
      return this.receivedCounts.get(commandId) ?? 0;
    }

    getProcessCount(commandId) {
      return this.processCounts.get(commandId) ?? 0;
    }

    async waitForDelivery(commandId, expectedCount = 1, timeoutMs = 6_000) {
      await waitFor(() => this.getDeliveryCount(commandId) >= expectedCount, timeoutMs);
      return this.commandLog.filter((entry) => entry.payload.commandId === commandId);
    }

    send(type, payload) {
      this.ws?.send(JSON.stringify({
        v: 1,
        type,
        ts: Date.now(),
        payload,
      }));
    }

    sendCommandAck(payload) {
      this.send('device.command.ack', payload);
    }

    async handleMessage(message) {
      if (message.type === 'server.hello_ack') {
        this.helloAckResolver?.();
        this.helloAckResolver = null;
        return;
      }

      if (message.type !== 'server.command') {
        return;
      }

      const commandId = message?.payload?.commandId;
      if (!commandId) {
        return;
      }

      this.commandLog.push(message);
      this.receivedCounts.set(commandId, this.getDeliveryCount(commandId) + 1);

      const storedAck = this.storedAcks.get(commandId);
      if (storedAck) {
        this.sendCommandAck(storedAck);
        return;
      }

      this.processCounts.set(commandId, this.getProcessCount(commandId) + 1);
      const behavior = await this.options.onCommand?.(message, {
        deliveryCount: this.getDeliveryCount(commandId),
        processCount: this.getProcessCount(commandId),
      }) ?? { kind: 'ack', ok: true };

      if (behavior.kind === 'disconnect_before_ack') {
        this.storedAcks.set(commandId, {
          deviceId: this.deviceId,
          commandId,
          ok: behavior.ok,
          ...(behavior.ok ? {} : { errorCode: behavior.errorCode, retryable: behavior.retryable }),
        });
        await this.disconnect();
        return;
      }

      const ackPayload = {
        deviceId: this.deviceId,
        commandId,
        ok: behavior.ok,
        ...(behavior.ok ? {} : { errorCode: behavior.errorCode, retryable: behavior.retryable }),
      };

      if (behavior.storeForReplay !== false) {
        this.storedAcks.set(commandId, ackPayload);
      }

      this.sendCommandAck(ackPayload);
    }
  }

  async function withWsGateway(run) {
    const originalDevicesUpsertHello = devicesRepo.upsertHello;
    const originalDevicesUpdateLastSeen = devicesRepo.updateLastSeen;
    const originalAuditCreateEvent = auditRepo.createEvent;

    devicesRepo.upsertHello = async () => null;
    devicesRepo.updateLastSeen = async () => {};
    auditRepo.createEvent = async () => {};

    const server = createServer((_request, response) => {
      response.writeHead(404);
      response.end();
    });

    const fakeFastify = {
      server,
      log: {
        info() {},
        warn() {},
        error() {},
        debug() {},
      },
    };

    setupWebSocket(fakeFastify);

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    if (!port) {
      throw new Error('Failed to determine ephemeral port');
    }

    const wsUrl = `ws://127.0.0.1:${port}/ws`;

    try {
      await run({ wsUrl });
    } finally {
      await new Promise((resolve) => server.close(() => resolve()));
      devicesRepo.upsertHello = originalDevicesUpsertHello;
      devicesRepo.updateLastSeen = originalDevicesUpdateLastSeen;
      auditRepo.createEvent = originalAuditCreateEvent;
    }
  }

  test('offline queued command is delivered after device connect and acked away', async () => {
    const deviceId = `e2e-device-${randomUUID()}`;
    const { commandId } = await enqueueDeviceCommand(
      'redis',
      redisUrl,
      deviceId,
      'action.request',
      {
        actionId: `action-${randomUUID()}`,
        action: { kind: 'click', x: 0.4, y: 0.6, button: 'left' },
        requestedAt: Date.now(),
      }
    );

    assert.equal(await getQueueDepth('redis', redisUrl, deviceId), 1);

    await withWsGateway(async ({ wsUrl }) => {
      const device = new MockQueueDevice(deviceId, wsUrl);
      await device.connect();
      await device.waitForDelivery(commandId, 1);
      await waitForEmptyQueue('redis', redisUrl, deviceId, 6_000);
      assert.equal(device.getProcessCount(commandId), 1);
      await device.disconnect();
    });

    assert.equal(await getQueueDepth('redis', redisUrl, deviceId), 0);
  });

  test('retryable nack keeps queued command and re-delivers it before terminal success', async () => {
    const deviceId = `e2e-device-${randomUUID()}`;
    const { commandId } = await enqueueDeviceCommand(
      'redis',
      redisUrl,
      deviceId,
      'action.request',
      {
        actionId: `action-${randomUUID()}`,
        action: { kind: 'click', x: 0.5, y: 0.5, button: 'left' },
        requestedAt: Date.now(),
      }
    );

    await withWsGateway(async ({ wsUrl }) => {
      const device = new MockQueueDevice(deviceId, wsUrl, {
        onCommand: async (_message, meta) => {
          if (meta.deliveryCount === 1) {
            return {
              kind: 'ack',
              ok: false,
              errorCode: 'DEVICE_BUSY',
              retryable: true,
              storeForReplay: false,
            };
          }

          return { kind: 'ack', ok: true };
        },
      });

      await device.connect();
      await device.waitForDelivery(commandId, 2, 8_000);
      await waitForEmptyQueue('redis', redisUrl, deviceId, 8_000);
      assert.equal(device.getProcessCount(commandId), 2);
      await device.disconnect();
    });

    assert.equal(await getQueueDepth('redis', redisUrl, deviceId), 0);
  });

  test('terminal nack removes queued command and prevents re-delivery', async () => {
    const deviceId = `e2e-device-${randomUUID()}`;
    const { commandId } = await enqueueDeviceCommand(
      'redis',
      redisUrl,
      deviceId,
      'action.request',
      {
        actionId: `action-${randomUUID()}`,
        action: { kind: 'click', x: 0.2, y: 0.3, button: 'left' },
        requestedAt: Date.now(),
      }
    );

    await withWsGateway(async ({ wsUrl }) => {
      const device = new MockQueueDevice(deviceId, wsUrl, {
        onCommand: async () => ({
          kind: 'ack',
          ok: false,
          errorCode: 'UNKNOWN_COMMAND',
          retryable: false,
        }),
      });

      await device.connect();
      await device.waitForDelivery(commandId, 1);
      await waitForEmptyQueue('redis', redisUrl, deviceId, 6_000);
      await waitFor(async () => device.getDeliveryCount(commandId) === 1, 1_500);
      assert.equal(device.getProcessCount(commandId), 1);
      await device.disconnect();
    });

    assert.equal(await getQueueDepth('redis', redisUrl, deviceId), 0);
  });

  test('duplicate delivery is deduped on device side by re-acking without replay', async () => {
    const deviceId = `e2e-device-${randomUUID()}`;
    const { commandId } = await enqueueDeviceCommand(
      'redis',
      redisUrl,
      deviceId,
      'action.request',
      {
        actionId: `action-${randomUUID()}`,
        action: { kind: 'click', x: 0.7, y: 0.1, button: 'left' },
        requestedAt: Date.now(),
      }
    );

    await withWsGateway(async ({ wsUrl }) => {
      const device = new MockQueueDevice(deviceId, wsUrl, {
        onCommand: async (_message, meta) => {
          if (meta.deliveryCount === 1) {
            return {
              kind: 'disconnect_before_ack',
              ok: true,
            };
          }

          return { kind: 'ack', ok: true };
        },
      });

      await device.connect();
      await device.waitForDelivery(commandId, 1);
      await waitFor(async () => device.ws === null, 2_000);

      await device.connect();
      await device.waitForDelivery(commandId, 2, 8_000);
      await waitForEmptyQueue('redis', redisUrl, deviceId, 8_000);
      assert.equal(device.getProcessCount(commandId), 1);
      assert.equal(device.getDeliveryCount(commandId), 2);
      await device.disconnect();
    });

    assert.equal(await getQueueDepth('redis', redisUrl, deviceId), 0);
  });

  test('pending pairing follow-up commands do not block later run.start delivery after reconnect', async () => {
    const deviceId = `e2e-device-${randomUUID()}`;
    const firstCommand = await enqueueDeviceCommand(
      'redis',
      redisUrl,
      deviceId,
      'device.token',
      {
        deviceToken: `token-${randomUUID()}`,
      }
    );

    await withWsGateway(async ({ wsUrl }) => {
      const device = new MockQueueDevice(deviceId, wsUrl, {
        onCommand: async (message, meta) => {
          if (message.payload.commandType === 'chat.message' && meta.deliveryCount === 1) {
            return {
              kind: 'disconnect_before_ack',
              ok: true,
            };
          }

          return { kind: 'ack', ok: true };
        },
      });

      await device.connect();
      await device.waitForDelivery(firstCommand.commandId, 1);
      await waitForEmptyQueue('redis', redisUrl, deviceId, 6_000);

      const pendingAcrossReconnect = await enqueueDeviceCommand(
        'redis',
        redisUrl,
        deviceId,
        'chat.message',
        {
          message: {
            role: 'agent',
            text: 'paired',
            createdAt: Date.now(),
          },
        }
      );

      await device.waitForDelivery(pendingAcrossReconnect.commandId, 1, 8_000);
      await waitFor(async () => device.ws === null, 2_000);

      await device.connect();

      const postReconnectRun = await enqueueDeviceCommand(
        'redis',
        redisUrl,
        deviceId,
        'run.start',
        {
          runId: `run-${randomUUID()}`,
          goal: 'manual smoke run',
          mode: 'manual',
        }
      );

      await device.waitForDelivery(pendingAcrossReconnect.commandId, 2, 8_000);
      await device.waitForDelivery(postReconnectRun.commandId, 1, 8_000);
      await waitForEmptyQueue('redis', redisUrl, deviceId, 8_000);
      await device.disconnect();
    });

    assert.equal(await getQueueDepth('redis', redisUrl, deviceId), 0);
  });
}
