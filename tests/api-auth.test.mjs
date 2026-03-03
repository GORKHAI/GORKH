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

test('cookie-auth mutations require CSRF while auth and bearer requests are skipped', async () => {
  applyApiEnv();
  const { shouldCheckCsrf } = await import('../apps/api/dist/lib/auth.js');

  assert.equal(
    shouldCheckCsrf({
      method: 'POST',
      url: '/devices/device-1/pair',
      headers: {},
      cookies: { access_token: 'cookie-access' },
    }),
    true
  );

  assert.equal(
    shouldCheckCsrf({
      method: 'POST',
      url: '/auth/login',
      headers: {},
      cookies: { access_token: 'cookie-access' },
    }),
    false
  );

  assert.equal(
    shouldCheckCsrf({
      method: 'POST',
      url: '/devices/device-1/pair',
      headers: { authorization: 'Bearer token-value' },
      cookies: {},
    }),
    false
  );
});

test('CSRF validation requires matching header and cookie values', async () => {
  applyApiEnv();
  const { isValidCsrf } = await import('../apps/api/dist/lib/auth.js');

  assert.equal(
    isValidCsrf({
      headers: { 'x-csrf-token': 'csrf-match' },
      cookies: { csrf_token: 'csrf-match' },
    }),
    true
  );

  assert.equal(
    isValidCsrf({
      headers: { 'x-csrf-token': 'csrf-header' },
      cookies: { csrf_token: 'csrf-cookie' },
    }),
    false
  );
});
