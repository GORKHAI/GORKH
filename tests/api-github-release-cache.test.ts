import assert from 'node:assert/strict';
import test from 'node:test';

function applyApiEnv() {
  process.env.PORT ??= '3001';
  process.env.NODE_ENV ??= 'test';
  process.env.LOG_LEVEL ??= 'error';
  process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/ai_operator';
  process.env.JWT_SECRET ??= 'test-secret';
  process.env.WEB_ORIGIN ??= 'http://localhost:3000';
  process.env.APP_BASE_URL ??= 'http://localhost:3000';
  process.env.API_PUBLIC_BASE_URL ??= 'http://localhost:3001';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
}

test('desktop GitHub release cache clamps to five minutes without a GitHub token', async () => {
  applyApiEnv();
  const { getDesktopReleaseCacheTtlSeconds } = await import('../apps/api/src/lib/releases/github.ts');

  assert.equal(getDesktopReleaseCacheTtlSeconds(60, ''), 300);
  assert.equal(getDesktopReleaseCacheTtlSeconds(60, '   '), 300);
});

test('desktop GitHub release cache honors explicit TTL when a GitHub token is configured', async () => {
  applyApiEnv();
  const { getDesktopReleaseCacheTtlSeconds } = await import('../apps/api/src/lib/releases/github.ts');

  assert.equal(getDesktopReleaseCacheTtlSeconds(60, 'ghp_test_token'), 60);
  assert.equal(getDesktopReleaseCacheTtlSeconds(900, 'ghp_test_token'), 900);
});
