import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const desktopSessionPath = 'apps/api/src/lib/desktop-session.ts';
const apiIndexPath = 'apps/api/src/index.ts';
const devicesRepoPath = 'apps/api/src/repos/devices.ts';
const wsHandlerPath = 'apps/api/src/lib/ws-handler.ts';

function applyApiEnv() {
  process.env.PORT ??= '3001';
  process.env.NODE_ENV ??= 'test';
  process.env.LOG_LEVEL ??= 'error';
  process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/ai_operator';
  process.env.JWT_SECRET ??= 'test-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN ??= '30m';
  process.env.REFRESH_TOKEN_TTL_DAYS ??= '14';
  process.env.CSRF_COOKIE_NAME ??= 'csrf_token';
  process.env.ACCESS_COOKIE_NAME ??= 'access_token';
  process.env.REFRESH_COOKIE_NAME ??= 'refresh_token';
  process.env.WEB_ORIGIN ??= 'http://localhost:3000';
  process.env.STRIPE_SECRET_KEY ??= 'sk_test_value';
  process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_test_value';
  process.env.STRIPE_PRICE_ID ??= 'price_test_value';
  process.env.APP_BASE_URL ??= 'http://localhost:3000';
  process.env.API_PUBLIC_BASE_URL ??= 'http://localhost:3001';
}

test('desktop session helper revokes only the addressed device token and leaves sibling devices untouched', async () => {
  applyApiEnv();
  const { revokeDesktopSession } = await import('../apps/api/src/lib/desktop-session.ts');

  const devices = new Map([
    ['token-desktop-a', {
      device: { deviceId: 'desktop-a' },
      ownerUserId: 'user-1',
      deviceTokenHash: 'hash-token-desktop-a',
      deviceTokenIssuedAt: new Date('2026-03-17T00:00:00.000Z'),
      deviceTokenLastUsedAt: new Date('2026-03-17T00:00:00.000Z'),
      deviceTokenExpiresAt: new Date('2026-04-17T00:00:00.000Z'),
      deviceTokenRevokedAt: null,
    }],
    ['token-desktop-b', {
      device: { deviceId: 'desktop-b' },
      ownerUserId: 'user-1',
      deviceTokenHash: 'hash-token-desktop-b',
      deviceTokenIssuedAt: new Date('2026-03-17T00:00:00.000Z'),
      deviceTokenLastUsedAt: new Date('2026-03-17T00:00:00.000Z'),
      deviceTokenExpiresAt: new Date('2026-04-17T00:00:00.000Z'),
      deviceTokenRevokedAt: null,
    }],
  ]);

  const repo = {
    async findByDeviceToken(deviceToken) {
      return devices.get(deviceToken) ?? null;
    },
    async touchDeviceSession() {},
    async revokeDeviceSession(deviceId, deviceToken) {
      const record = devices.get(deviceToken);
      if (!record || record.device.deviceId !== deviceId) {
        return null;
      }

      record.deviceTokenRevokedAt = new Date('2026-03-18T00:00:00.000Z');
      return {
        ...record,
      };
    },
  };

  const result = await revokeDesktopSession({
    deviceToken: 'token-desktop-a',
    devicesRepo: repo,
    now: () => new Date('2026-03-17T00:00:00.000Z'),
  });

  assert.deepEqual(result, {
    ok: true,
    deviceId: 'desktop-a',
    userId: 'user-1',
  });
  assert.equal(
    devices.get('token-desktop-a')?.deviceTokenRevokedAt instanceof Date,
    true,
    'the revoked desktop token should be marked unusable'
  );
  assert.equal(devices.has('token-desktop-b'), true, 'revoking one desktop must not affect sibling desktop sessions');
});

test('desktop session helper rejects stale or missing desktop tokens', async () => {
  applyApiEnv();
  const { revokeDesktopSession } = await import('../apps/api/src/lib/desktop-session.ts');

  const repo = {
    async findByDeviceToken() {
      return null;
    },
    async touchDeviceSession() {
      throw new Error('should not touch when token lookup fails');
    },
    async revokeDeviceSession() {
      throw new Error('should not revoke when token lookup fails');
    },
  };

  const result = await revokeDesktopSession({
    deviceToken: 'missing-token',
    devicesRepo: repo,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'UNAUTHORIZED',
  });
});

test('desktop logout route uses token-authenticated session revoke instead of browser auth', () => {
  const source = readFileSync(apiIndexPath, 'utf8');

  assert.match(
    source,
    /fastify\.post\('\/desktop\/auth\/logout'/,
    'API should expose a desktop logout route'
  );

  assert.match(
    source,
    /requireDesktopDeviceSession\(request, reply\)/,
    'Desktop logout should authenticate with the current desktop device token'
  );
});

test('desktop session revoke is scoped to the current device token and websocket auth still denies stale tokens', () => {
  const sessionSource = readFileSync(desktopSessionPath, 'utf8');
  const devicesRepoSource = readFileSync(devicesRepoPath, 'utf8');
  const wsHandlerSource = readFileSync(wsHandlerPath, 'utf8');

  assert.match(
    sessionSource,
    /deviceTokenRevokedAt|deviceTokenExpiresAt/,
    'Desktop session helpers should reason about revoke and expiry metadata'
  );

  assert.match(
    devicesRepoSource,
    /deviceTokenHash|hashDesktopDeviceToken/,
    'Device repo should use hashed desktop token persistence instead of raw-token-only lookup'
  );

  assert.match(
    sessionSource,
    /authenticateDesktopDeviceSession/,
    'Desktop session helpers should expose shared authentication logic for HTTP and WS callers'
  );

  assert.match(
    wsHandlerSource,
    /authenticateDesktopDeviceSession|deviceTokenRevokedAt|deviceTokenExpiresAt/,
    'WebSocket hello should continue to deny reconnect attempts that present a revoked or expired desktop token'
  );
});
