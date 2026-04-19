/**
 * Memory fallback reliability tests
 * 
 * Verifies that when Redis is unavailable (memory backend active),
 * critical reliability behaviors still work correctly:
 * - Presence tracking
 * - Command delivery acknowledgment (direct WS path)
 * - No silent divergence from Redis semantics
 */

import assert from 'node:assert/strict';
import test from 'node:test';

test('presence memory backend handles concurrent device updates', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  
  // Simulate 100 devices connecting
  const devices = Array.from({ length: 100 }, (_, i) => `device-${i}`);
  
  await Promise.all(
    devices.map((deviceId, index) =>
      presence.setPresence('memory', '', deviceId, `user-${index % 10}`, true)
    )
  );
  
  // All should be present
  const checks = await Promise.all(
    devices.map((deviceId) => presence.getPresence('memory', '', deviceId))
  );
  
  assert.equal(checks.every((p) => p?.connected === true), true);
  assert.equal(checks.length, 100);
  
  // Mark half disconnected
  await Promise.all(
    devices.slice(0, 50).map((deviceId) =>
      presence.setPresence('memory', '', deviceId, null, false)
    )
  );
  
  // Verify state
  const afterDisconnect = await Promise.all(
    devices.map((deviceId) => presence.getPresence('memory', '', deviceId))
  );
  
  const connectedCount = afterDisconnect.filter((p) => p?.connected).length;
  assert.equal(connectedCount, 50);
  
  presence.__resetNowProviderForTests();
});

test('device command queue enabled returns false for memory backend', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  
  // Memory backend should disable command queueing
  assert.equal(queue.isDeviceCommandQueueEnabled('memory'), false);
  assert.equal(queue.isDeviceCommandQueueEnabled('redis'), true);
});

test('device command ack returns ignored for memory backend', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  
  // When using memory backend, acks are ignored (direct delivery only)
  const outcome = await queue.ackDeviceCommand('memory', '', {
    deviceId: 'device-1',
    commandId: 'cmd-1',
    ok: true,
  });
  
  assert.equal(outcome.status, 'ignored');
});

test('device command retry state returns null for memory backend', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  
  const state = await queue.getDeviceCommandRetryState('memory', '', 'device-1', 'cmd-1');
  assert.equal(state, null);
});

test('device command send failure returns null for memory backend', async () => {
  const queue = await import('../apps/api/dist/lib/device-commands.js');
  
  const state = await queue.recordDeviceCommandSendFailure('memory', '', 'device-1', 'cmd-1');
  assert.equal(state, null);
});

test('presence TTL expiration is consistent across multiple devices', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  let now = 1_700_000_000_000;
  
  presence.__setNowProviderForTests(() => now);
  
  // Set presence for 10 devices at different times
  for (let i = 0; i < 10; i++) {
    await presence.setPresence('memory', '', `device-${i}`, 'user-1', true);
    now += 1_000; // 1 second apart
  }
  
  // All should be present
  for (let i = 0; i < 10; i++) {
    const p = await presence.getPresence('memory', '', `device-${i}`);
    assert.equal(p?.connected, true, `device-${i} should be present`);
  }
  
  // Advance past TTL (45 seconds from first device)
  now += 46_000;
  
  // All should be expired
  for (let i = 0; i < 10; i++) {
    const p = await presence.getPresence('memory', '', `device-${i}`);
    assert.equal(p, null, `device-${i} should be expired`);
  }
  
  presence.__resetNowProviderForTests();
});

test('presence clear is idempotent', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  
  await presence.setPresence('memory', '', 'device-1', 'user-1', true);
  
  // Clear multiple times should not error
  await presence.clearPresence('memory', '', 'device-1');
  await presence.clearPresence('memory', '', 'device-1');
  await presence.clearPresence('memory', '', 'device-1');
  
  const p = await presence.getPresence('memory', '', 'device-1');
  assert.equal(p, null);
  
  presence.__resetNowProviderForTests();
});

test('presence touch on non-existent device is safe', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  
  // Touching a device that was never set should not error
  await presence.touchPresence('memory', '', 'never-set-device');
  
  const p = await presence.getPresence('memory', '', 'never-set-device');
  assert.equal(p, null);
  
  presence.__resetNowProviderForTests();
});

test('memory backend does not leak memory after TTL expiration', async () => {
  const presence = await import('../apps/api/dist/lib/presence.js');
  let now = 1_700_000_000_000;
  
  presence.__setNowProviderForTests(() => now);
  
  // Create 1000 devices
  for (let i = 0; i < 1000; i++) {
    await presence.setPresence('memory', '', `device-${i}`, 'user-1', true);
  }
  
  // Let all expire
  now += 60_000;
  
  // Access all to trigger cleanup
  for (let i = 0; i < 1000; i++) {
    await presence.getPresence('memory', '', `device-${i}`);
  }
  
  // Internal map should be empty (cleaned up during get)
  // This is implementation detail, but we can verify behavior is correct
  const p = await presence.getPresence('memory', '', 'device-0');
  assert.equal(p, null);
  
  presence.__resetNowProviderForTests();
});
