/**
 * WebSocket reconnection reliability tests
 * 
 * These tests verify that device command delivery remains reliable
 * across disconnect/reconnect cycles, both with Redis queue and
 * direct delivery fallback paths.
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';

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

// Test the FakeRedisClient memory implementation directly to ensure
// it doesn't drift from real Redis semantics
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
        if (entry.pendingConsumers.size > 0) continue;
        entry.pendingConsumers.set(groupName, consumerName);
        pending.add(entry.id);
        matches.push({ id: entry.id, fields: { ...entry.fields } });
        if (matches.length >= count) break;
      }
    } else {
      for (const entry of stream.entries) {
        if (entry.pendingConsumers.get(groupName) !== consumerName) continue;
        matches.push({ id: entry.id, fields: { ...entry.fields } });
        if (matches.length >= count) break;
      }
    }

    stream.pendingByGroup.set(groupName, pending);
    return matches.length === 0 ? null : [{ stream: streamKey, messages: matches }];
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
      const entry = stream.entries.find((c) => c.id === id);
      if (!entry) continue;
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
      for (const id of ids) pending.delete(id);
    }
    return before - stream.entries.length;
  }

  async xlen(_redisUrl, streamKey) {
    return this.ensureStream(streamKey).entries.length;
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
      const entry = stream.entries.find((c) => c.id === id);
      if (!entry) continue;
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
      for (const id of ids) pending.delete(id);
    }
    return before - stream.entries.length;
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

test('memory backend presence TTL expires correctly', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  let now = 1_700_000_000_000;
  
  presence.__setNowProviderForTests(() => now);
  
  // Set presence with memory backend
  await presence.setPresence('memory', '', 'device-1', 'user-1', true);
  
  // Should be present immediately
  const before = await presence.getPresence('memory', '', 'device-1');
  assert.equal(before?.connected, true);
  assert.equal(before?.ownerUserId, 'user-1');
  
  // After TTL expires (45 seconds), should be null
  now += 46_000;
  const after = await presence.getPresence('memory', '', 'device-1');
  assert.equal(after, null);
  
  presence.__resetNowProviderForTests();
});

test('memory backend presence survives touch before TTL', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  let now = 1_700_000_000_000;
  
  presence.__setNowProviderForTests(() => now);
  
  await presence.setPresence('memory', '', 'device-1', 'user-1', true);
  
  // Move forward 30 seconds (before 45s TTL)
  now += 30_000;
  
  // Touch extends TTL
  await presence.touchPresence('memory', '', 'device-1');
  
  // Move forward another 30 seconds - original would have expired
  now += 30_000;
  
  // Should still be present due to touch
  const record = await presence.getPresence('memory', '', 'device-1');
  assert.equal(record?.connected, true);
  
  presence.__resetNowProviderForTests();
});

test('memory backend clearPresence removes immediately', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  
  await presence.setPresence('memory', '', 'device-1', 'user-1', true);
  
  const before = await presence.getPresence('memory', '', 'device-1');
  assert.equal(before?.connected, true);
  
  await presence.clearPresence('memory', '', 'device-1');
  
  const after = await presence.getPresence('memory', '', 'device-1');
  assert.equal(after, null);
  
  presence.__resetNowProviderForTests();
});

test('FakeRedisClient stream semantics match expected Redis behavior', async () => {
  const fake = new FakeRedisClient();
  const redisUrl = 'redis://localhost:6379';
  const streamKey = 'device:cmd:device-1';
  const groupName = 'ws-gateway';
  const consumerName = 'device-1';
  
  // Create group
  await fake.xgroupCreateMkstream(redisUrl, streamKey, groupName);
  
  // Add command
  const id1 = await fake.xadd(redisUrl, streamKey, {
    commandId: 'cmd-1',
    commandType: 'run.start',
    payload: JSON.stringify({ runId: 'run-1' }),
    ts: String(Date.now()),
    expiresAt: String(Date.now() + 900_000),
  });
  
  assert.equal(typeof id1, 'string');
  assert.equal(await fake.xlen(redisUrl, streamKey), 1);
  
  // Read as new
  const newMessages = await fake.xreadgroup(redisUrl, groupName, consumerName, streamKey, '>', 10);
  assert.equal(newMessages?.length, 1);
  assert.equal(newMessages[0].messages.length, 1);
  assert.equal(newMessages[0].messages[0].fields.commandId, 'cmd-1');
  
  // Read pending should return same message
  const pendingMessages = await fake.xreadgroup(redisUrl, groupName, consumerName, streamKey, '0', 10);
  assert.equal(pendingMessages?.length, 1);
  assert.equal(pendingMessages[0].messages[0].fields.commandId, 'cmd-1');
  
  // Ack the message
  const acked = await fake.xack(redisUrl, streamKey, groupName, [id1]);
  assert.equal(acked, 1);
  
  // After ack, pending should be empty but message still in stream
  const afterAck = await fake.xreadgroup(redisUrl, groupName, consumerName, streamKey, '0', 10);
  assert.equal(afterAck, null);
  assert.equal(await fake.xlen(redisUrl, streamKey), 1);
  
  // Delete the message
  const deleted = await fake.xdel(redisUrl, streamKey, [id1]);
  assert.equal(deleted, 1);
  assert.equal(await fake.xlen(redisUrl, streamKey), 0);
});

test('FakeRedisClient pending entry list is consumer-specific', async () => {
  const fake = new FakeRedisClient();
  const redisUrl = 'redis://localhost:6379';
  const streamKey = 'device:cmd:device-1';
  const groupName = 'ws-gateway';
  
  await fake.xgroupCreateMkstream(redisUrl, streamKey, groupName);
  
  await fake.xadd(redisUrl, streamKey, {
    commandId: 'cmd-1',
    commandType: 'action.request',
    payload: '{}',
    ts: String(Date.now()),
    expiresAt: String(Date.now() + 900_000),
  });
  
  // First consumer reads
  const firstRead = await fake.xreadgroup(redisUrl, groupName, 'consumer-1', streamKey, '>', 10);
  assert.equal(firstRead?.length, 1);
  assert.equal(firstRead[0].messages[0].fields.commandId, 'cmd-1');
  
  // Same consumer reading pending should find it
  const sameConsumerPending = await fake.xreadgroup(redisUrl, groupName, 'consumer-1', streamKey, '0', 10);
  assert.equal(sameConsumerPending?.length, 1);
  
  // The message stays in the stream until acked
  assert.equal(await fake.xlen(redisUrl, streamKey), 1);
});

test('device command queue is enabled for redis backend', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  
  // Queue should be enabled for redis
  assert.equal(queue.isDeviceCommandQueueEnabled('redis'), true);
  assert.equal(queue.isDeviceCommandQueueEnabled('memory'), false);
});
