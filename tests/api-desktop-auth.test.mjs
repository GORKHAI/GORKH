import assert from 'node:assert/strict';
import test from 'node:test';

test('desktop auth handoff creates a single-use token bound to device, state, nonce, and callback', async () => {
  const { createDesktopAuthStore } = await import('../apps/api/dist/lib/desktop-auth.js');

  let now = 1_000;
  let attemptCounter = 0;
  let handoffCounter = 0;

  const store = createDesktopAuthStore({
    now: () => now,
    createAttemptId: () => `attempt-${++attemptCounter}`,
    createHandoffToken: () => `handoff-${++handoffCounter}`,
  });

  const attempt = store.startAttempt({
    deviceId: 'device-1',
    callbackUrl: 'http://127.0.0.1:43123/auth/callback',
    state: 'state-1',
    nonce: 'nonce-1',
  });

  assert.equal(attempt.attemptId, 'attempt-1');

  const issued = store.issueHandoff({
    attemptId: attempt.attemptId,
    userId: 'user-1',
  });

  assert.equal(issued.ok, true);
  assert.equal(issued.handoffToken, 'handoff-1');
  assert.equal(issued.callbackUrl, 'http://127.0.0.1:43123/auth/callback');
  assert.equal(issued.state, 'state-1');
  assert.equal(issued.deviceId, 'device-1');

  const consumed = store.consumeHandoff({
    handoffToken: issued.handoffToken,
    deviceId: 'device-1',
    state: 'state-1',
    nonce: 'nonce-1',
  });

  assert.deepEqual(consumed, {
    ok: true,
    attemptId: 'attempt-1',
    userId: 'user-1',
    deviceId: 'device-1',
  });

  const reused = store.consumeHandoff({
    handoffToken: issued.handoffToken,
    deviceId: 'device-1',
    state: 'state-1',
    nonce: 'nonce-1',
  });

  assert.deepEqual(reused, {
    ok: false,
    error: 'HANDOFF_ALREADY_USED',
  });
});

test('desktop auth handoff rejects expired tokens', async () => {
  const { createDesktopAuthStore } = await import('../apps/api/dist/lib/desktop-auth.js');

  let now = 5_000;

  const store = createDesktopAuthStore({
    now: () => now,
    createAttemptId: () => 'attempt-expired',
    createHandoffToken: () => 'handoff-expired',
  });

  const attempt = store.startAttempt({
    deviceId: 'device-expired',
    callbackUrl: 'http://127.0.0.1:43123/auth/callback',
    state: 'state-expired',
    nonce: 'nonce-expired',
  });

  const issued = store.issueHandoff({
    attemptId: attempt.attemptId,
    userId: 'user-expired',
    ttlMs: 2_000,
  });

  assert.equal(issued.ok, true);

  now += 2_001;

  const consumed = store.consumeHandoff({
    handoffToken: issued.handoffToken,
    deviceId: 'device-expired',
    state: 'state-expired',
    nonce: 'nonce-expired',
  });

  assert.deepEqual(consumed, {
    ok: false,
    error: 'HANDOFF_EXPIRED',
  });
});

test('desktop auth handoff rejects mismatched state, nonce, and device id', async () => {
  const { createDesktopAuthStore } = await import('../apps/api/dist/lib/desktop-auth.js');

  const store = createDesktopAuthStore({
    createAttemptId: () => 'attempt-mismatch',
    createHandoffToken: () => 'handoff-mismatch',
  });

  const attempt = store.startAttempt({
    deviceId: 'device-expected',
    callbackUrl: 'http://127.0.0.1:43123/auth/callback',
    state: 'state-expected',
    nonce: 'nonce-expected',
  });

  const issued = store.issueHandoff({
    attemptId: attempt.attemptId,
    userId: 'user-expected',
  });

  assert.equal(issued.ok, true);

  const wrongState = store.consumeHandoff({
    handoffToken: issued.handoffToken,
    deviceId: 'device-expected',
    state: 'state-wrong',
    nonce: 'nonce-expected',
  });

  assert.deepEqual(wrongState, {
    ok: false,
    error: 'STATE_MISMATCH',
  });

  const wrongNonce = store.consumeHandoff({
    handoffToken: issued.handoffToken,
    deviceId: 'device-expected',
    state: 'state-expected',
    nonce: 'nonce-wrong',
  });

  assert.deepEqual(wrongNonce, {
    ok: false,
    error: 'NONCE_MISMATCH',
  });

  const wrongDevice = store.consumeHandoff({
    handoffToken: issued.handoffToken,
    deviceId: 'device-wrong',
    state: 'state-expected',
    nonce: 'nonce-expected',
  });

  assert.deepEqual(wrongDevice, {
    ok: false,
    error: 'DEVICE_MISMATCH',
  });
});
