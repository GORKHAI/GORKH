import assert from 'node:assert/strict';
import test from 'node:test';

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

test('authenticateDesktopDeviceSession accepts active token-backed sessions and tracks use', async () => {
  applyApiEnv();

  const {
    authenticateDesktopDeviceSession,
    hashDesktopDeviceToken,
    getDesktopDeviceSessionExpiryDate,
  } = await import('../apps/api/src/lib/desktop-session.ts');

  const touched: Array<{ deviceId: string; at: Date }> = [];
  const repo = {
    async findByDeviceToken(deviceToken: string) {
      return {
        device: { deviceId: 'desktop-a' },
        ownerUserId: 'user-1',
        deviceTokenHash: hashDesktopDeviceToken(deviceToken),
        deviceTokenIssuedAt: new Date('2026-03-17T00:00:00.000Z'),
        deviceTokenLastUsedAt: new Date('2026-03-17T00:00:00.000Z'),
        deviceTokenExpiresAt: getDesktopDeviceSessionExpiryDate(new Date('2026-03-17T00:00:00.000Z')),
        deviceTokenRevokedAt: null,
      };
    },
    async touchDeviceSession(deviceId: string, at: Date) {
      touched.push({ deviceId, at });
    },
  };

  const result = await authenticateDesktopDeviceSession({
    deviceToken: 'desktop-token-active',
    devicesRepo: repo,
    now: () => new Date('2026-03-18T12:00:00.000Z'),
  });

  assert.deepEqual(result, {
    ok: true,
    deviceId: 'desktop-a',
    userId: 'user-1',
    deviceToken: 'desktop-token-active',
  });
  assert.equal(touched.length, 1);
  assert.equal(touched[0]?.deviceId, 'desktop-a');
});

test('authenticateDesktopDeviceSession rejects revoked, expired, or missing sessions', async () => {
  applyApiEnv();

  const {
    authenticateDesktopDeviceSession,
    hashDesktopDeviceToken,
  } = await import('../apps/api/src/lib/desktop-session.ts');

  const now = new Date('2026-03-18T12:00:00.000Z');
  const records = new Map<string, {
    device: { deviceId: string };
    ownerUserId: string | null;
    deviceTokenHash: string;
    deviceTokenIssuedAt: Date;
    deviceTokenLastUsedAt: Date;
    deviceTokenExpiresAt: Date;
    deviceTokenRevokedAt: Date | null;
  }>([
    ['active-token', {
      device: { deviceId: 'desktop-active' },
      ownerUserId: 'user-1',
      deviceTokenHash: hashDesktopDeviceToken('active-token'),
      deviceTokenIssuedAt: new Date('2026-03-17T00:00:00.000Z'),
      deviceTokenLastUsedAt: new Date('2026-03-17T06:00:00.000Z'),
      deviceTokenExpiresAt: new Date('2026-04-17T00:00:00.000Z'),
      deviceTokenRevokedAt: null,
    }],
    ['revoked-token', {
      device: { deviceId: 'desktop-revoked' },
      ownerUserId: 'user-1',
      deviceTokenHash: hashDesktopDeviceToken('revoked-token'),
      deviceTokenIssuedAt: new Date('2026-03-17T00:00:00.000Z'),
      deviceTokenLastUsedAt: new Date('2026-03-17T06:00:00.000Z'),
      deviceTokenExpiresAt: new Date('2026-04-17T00:00:00.000Z'),
      deviceTokenRevokedAt: new Date('2026-03-18T11:00:00.000Z'),
    }],
    ['expired-token', {
      device: { deviceId: 'desktop-expired' },
      ownerUserId: 'user-1',
      deviceTokenHash: hashDesktopDeviceToken('expired-token'),
      deviceTokenIssuedAt: new Date('2026-02-01T00:00:00.000Z'),
      deviceTokenLastUsedAt: new Date('2026-02-02T00:00:00.000Z'),
      deviceTokenExpiresAt: new Date('2026-03-18T11:59:59.000Z'),
      deviceTokenRevokedAt: null,
    }],
  ]);

  const repo = {
    async findByDeviceToken(deviceToken: string) {
      return records.get(deviceToken) ?? null;
    },
    async touchDeviceSession() {
      throw new Error('expired or revoked sessions should not be touched');
    },
  };

  assert.deepEqual(
    await authenticateDesktopDeviceSession({
      deviceToken: 'revoked-token',
      devicesRepo: repo,
      now: () => now,
    }),
    {
      ok: false,
      error: 'UNAUTHORIZED',
    },
  );

  assert.deepEqual(
    await authenticateDesktopDeviceSession({
      deviceToken: 'expired-token',
      devicesRepo: repo,
      now: () => now,
    }),
    {
      ok: false,
      error: 'UNAUTHORIZED',
    },
  );

  assert.deepEqual(
    await authenticateDesktopDeviceSession({
      deviceToken: 'missing-token',
      devicesRepo: repo,
      now: () => now,
    }),
    {
      ok: false,
      error: 'UNAUTHORIZED',
    },
  );
});
