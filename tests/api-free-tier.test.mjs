import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiIndexPath = 'apps/api/src/index.ts';
const freeRoutePath = 'apps/api/src/routes/free.ts';
const limiterPath = 'apps/api/src/lib/freeTierLimiter.ts';

test('free tier routes exist with proper safeguards', () => {
  const indexSource = readFileSync(apiIndexPath, 'utf8');
  const freeSource = readFileSync(freeRoutePath, 'utf8');

  assert.match(
    indexSource,
    /registerFreeTierRoutes/,
    'API should register free tier routes'
  );
  assert.match(
    freeSource,
    /fastify\.post\('\/llm\/free\/chat'/,
    'Free tier module should expose POST /llm/free/chat'
  );
  assert.match(
    freeSource,
    /fastify\.get\('\/llm\/free\/usage'/,
    'Free tier module should expose GET /llm/free/usage'
  );

  assert.match(
    freeSource,
    /FREE_TIER_ENABLED/,
    'Free tier route should check kill switch'
  );
  assert.match(
    freeSource,
    /checkIpRateLimit/,
    'Free tier route should enforce IP rate limit'
  );
  assert.match(
    freeSource,
    /checkAndIncrement/,
    'Free tier route should check user quota'
  );
  assert.match(
    freeSource,
    /429/,
    'Free tier route should return 429 when quota exhausted'
  );
  assert.match(
    freeSource,
    /recordCompletion/,
    'Free tier route should record usage to Postgres'
  );
});

test('free tier limiter exports constants', () => {
  const source = readFileSync(limiterPath, 'utf8');
  assert.match(source, /FREE_TIER_DAILY_LIMIT = 5/, 'Daily limit should be 5');
  assert.match(source, /FREE_TIER_WINDOW_SECONDS = 24 \* 60 \* 60/, 'Window should be 24 hours');
  assert.match(source, /FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK = 2048/, 'Output cap should be 2048');
  assert.match(source, /FREE_TIER_MAX_INPUT_TOKENS_PER_TASK = 16000/, 'Input cap should be 16000');
  assert.match(source, /FREE_TIER_IP_HOURLY_LIMIT = 100/, 'IP hourly limit should be 100');
});

test('calculateDeepSeekCost returns correct pricing', async () => {
  // Need to set minimal env so config import doesn't fail
  process.env.PORT ??= '3001';
  process.env.NODE_ENV ??= 'test';
  process.env.LOG_LEVEL ??= 'error';
  process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/ai_operator';
  process.env.JWT_SECRET ??= 'test-secret';

  const { calculateDeepSeekCost } = await import('../apps/api/dist/lib/freeTierLimiter.js');

  // DeepSeek pricing: $0.27 per 1M input tokens, $1.10 per 1M output tokens
  const cost1 = calculateDeepSeekCost(1_000_000, 0);
  assert.ok(Math.abs(cost1 - 0.27) < 0.001, `Expected ~0.27 for 1M input, got ${cost1}`);

  const cost2 = calculateDeepSeekCost(0, 1_000_000);
  assert.ok(Math.abs(cost2 - 1.10) < 0.001, `Expected ~1.10 for 1M output, got ${cost2}`);

  const cost3 = calculateDeepSeekCost(1_000_000, 1_000_000);
  assert.ok(Math.abs(cost3 - 1.37) < 0.001, `Expected ~1.37 for 1M each, got ${cost3}`);

  const cost4 = calculateDeepSeekCost(1000, 500);
  const expected = (1000 * 0.27 + 500 * 1.10) / 1_000_000;
  assert.ok(Math.abs(cost4 - expected) < 0.000_001, `Expected ${expected}, got ${cost4}`);
});

test('free tier route validates max_tokens cap', () => {
  const source = readFileSync(freeRoutePath, 'utf8');
  assert.match(
    source,
    /FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK/,
    'Route should cap max_tokens to FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK'
  );
});

test('free tier route rejects oversized input', () => {
  const source = readFileSync(freeRoutePath, 'utf8');
  assert.match(
    source,
    /16000|FREE_TIER_MAX_INPUT_TOKENS_PER_TASK/,
    'Route should reject input exceeding 16k token estimate'
  );
});
