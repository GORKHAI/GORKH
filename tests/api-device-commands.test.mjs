import assert from 'node:assert/strict';
import test from 'node:test';

class FakeRedisClient {
  constructor() {
    this.streams = new Map();
    this.values = new Map();
    this.groups = new Set();
  }

  ensureStream(key) {
    let stream = this.streams.get(key);
    if (!stream) {
      stream = {
        seq: 0,
        entries: [],
        pendingByGroup: new Map(),
      };
      this.streams.set(key, stream);
    }
    return stream;
  }

  async xgroupCreateMkstream(_redisUrl, streamKey, groupName) {
    const stream = this.ensureStream(streamKey);
    if (!stream.pendingByGroup.has(groupName)) {
      stream.pendingByGroup.set(groupName, new Set());
    }
    this.groups.add(`${streamKey}:${groupName}`);
    return true;
  }

  async xadd(_redisUrl, streamKey, fields) {
    const stream = this.ensureStream(streamKey);
    stream.seq += 1;
    const id = `${stream.seq}-0`;
    stream.entries.push({
      id,
      fields: { ...fields },
      pendingConsumers: new Map(),
    });
    return id;
  }

  async xreadgroup(_redisUrl, groupName, consumerName, streamKey, id, count = 1) {
    const stream = this.ensureStream(streamKey);
    const pending = stream.pendingByGroup.get(groupName) ?? new Set();
    const matches = [];

    if (id === '>') {
      for (const entry of stream.entries) {
        if (entry.pendingConsumers.size > 0) {
          continue;
        }
        entry.pendingConsumers.set(groupName, consumerName);
        pending.add(entry.id);
        matches.push({ id: entry.id, fields: { ...entry.fields } });
        if (matches.length >= count) {
          break;
        }
      }
    } else {
      for (const entry of stream.entries) {
        if (entry.pendingConsumers.get(groupName) !== consumerName) {
          continue;
        }
        matches.push({ id: entry.id, fields: { ...entry.fields } });
        if (matches.length >= count) {
          break;
        }
      }
    }

    stream.pendingByGroup.set(groupName, pending);

    if (matches.length === 0) {
      return null;
    }

    return [
      {
        stream: streamKey,
        messages: matches,
      },
    ];
  }

  async xrange(_redisUrl, streamKey, _start, _end, count = 100) {
    const stream = this.ensureStream(streamKey);
    return stream.entries.slice(0, count).map((entry) => ({
      id: entry.id,
      fields: { ...entry.fields },
    }));
  }

  async xack(_redisUrl, streamKey, groupName, ids) {
    const stream = this.ensureStream(streamKey);
    const pending = stream.pendingByGroup.get(groupName) ?? new Set();
    let acked = 0;
    for (const id of ids) {
      const entry = stream.entries.find((candidate) => candidate.id === id);
      if (!entry) {
        continue;
      }
      if (entry.pendingConsumers.delete(groupName)) {
        pending.delete(id);
        acked += 1;
      }
    }
    stream.pendingByGroup.set(groupName, pending);
    return acked;
  }

  async xdel(_redisUrl, streamKey, ids) {
    const stream = this.ensureStream(streamKey);
    const before = stream.entries.length;
    stream.entries = stream.entries.filter((entry) => !ids.includes(entry.id));
    for (const pending of stream.pendingByGroup.values()) {
      for (const id of ids) {
        pending.delete(id);
      }
    }
    return before - stream.entries.length;
  }

  async xlen(_redisUrl, streamKey) {
    return this.ensureStream(streamKey).entries.length;
  }

  async set(_redisUrl, key, value) {
    this.values.set(key, value);
    return true;
  }

  async get(_redisUrl, key) {
    return this.values.get(key) ?? null;
  }

  async del(_redisUrl, key) {
    this.values.delete(key);
  }
}

test('device commands enqueue into the stream and terminal ack removes them', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  const fakeRedis = new FakeRedisClient();

  queue.__setRedisClientForTests(fakeRedis);
  queue.__setNowProviderForTests(() => 1_700_000_000_000);
  queue.__resetDeviceCommandsForTests();

  const { commandId, queued } = await queue.enqueueDeviceCommand(
    'redis',
    'redis://localhost:6379',
    'device-1',
    'action.request',
    { actionId: 'action-1' }
  );

  assert.equal(queued, true);
  assert.equal(typeof commandId, 'string');
  assert.equal(await queue.getQueueDepth('redis', 'redis://localhost:6379', 'device-1'), 1);

  const pending = await queue.readPendingDeviceCommands('redis', 'redis://localhost:6379', 'device-1', 'device-1');
  assert.equal(pending.length, 0);

  const fresh = await queue.readNewDeviceCommands('redis', 'redis://localhost:6379', 'device-1', 'device-1');
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].command.commandId, commandId);

  const outcome = await queue.ackDeviceCommand('redis', 'redis://localhost:6379', {
    deviceId: 'device-1',
    commandId,
    ok: true,
  });

  assert.equal(outcome.status, 'acked');
  assert.equal(await queue.getQueueDepth('redis', 'redis://localhost:6379', 'device-1'), 0);

  queue.__restoreRedisClientForTests();
  queue.__resetNowProviderForTests();
  queue.__resetDeviceCommandsForTests();
});

test('device commands keep retryable nacks in the queue with backoff metadata', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  const fakeRedis = new FakeRedisClient();
  let now = 1_700_000_000_000;

  queue.__setRedisClientForTests(fakeRedis);
  queue.__setNowProviderForTests(() => now);
  queue.__resetDeviceCommandsForTests();

  const { commandId } = await queue.enqueueDeviceCommand(
    'redis',
    'redis://localhost:6379',
    'device-1',
    'run.start',
    { runId: 'run-1' }
  );

  await queue.readNewDeviceCommands('redis', 'redis://localhost:6379', 'device-1', 'device-1');

  const outcome = await queue.ackDeviceCommand('redis', 'redis://localhost:6379', {
    deviceId: 'device-1',
    commandId,
    ok: false,
    errorCode: 'DEVICE_BUSY',
    retryable: true,
  });

  assert.equal(outcome.status, 'retry');
  assert.equal(await queue.getQueueDepth('redis', 'redis://localhost:6379', 'device-1'), 1);

  const retryState = await queue.getDeviceCommandRetryState('redis', 'redis://localhost:6379', 'device-1', commandId);
  assert.equal(retryState?.attempts, 1);
  assert.equal(retryState?.availableAt > now, true);

  now = retryState.availableAt;
  const pending = await queue.readPendingDeviceCommands('redis', 'redis://localhost:6379', 'device-1', 'device-1');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].command.commandId, commandId);

  queue.__restoreRedisClientForTests();
  queue.__resetNowProviderForTests();
  queue.__resetDeviceCommandsForTests();
});

test('device commands cleanup expired entries', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  const fakeRedis = new FakeRedisClient();
  let now = 1_700_000_000_000;

  queue.__setRedisClientForTests(fakeRedis);
  queue.__setNowProviderForTests(() => now);
  queue.__resetDeviceCommandsForTests();

  await queue.enqueueDeviceCommand(
    'redis',
    'redis://localhost:6379',
    'device-1',
    'device.token',
    { deviceToken: 'token-1' }
  );

  assert.equal(await queue.getQueueDepth('redis', 'redis://localhost:6379', 'device-1'), 1);

  now += queue.DEVICE_COMMAND_TTL_MS + 1;

  const cleaned = await queue.cleanupExpiredDeviceCommands('redis', 'redis://localhost:6379', 'device-1');
  assert.equal(cleaned, 1);
  assert.equal(await queue.getQueueDepth('redis', 'redis://localhost:6379', 'device-1'), 0);

  queue.__restoreRedisClientForTests();
  queue.__resetNowProviderForTests();
  queue.__resetDeviceCommandsForTests();
});
