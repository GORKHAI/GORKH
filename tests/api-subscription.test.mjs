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

function createReply() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    async send(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test('requireActiveSubscription rejects inactive users with 402', async () => {
  applyApiEnv();
  const { requireActiveSubscription } = await import('../apps/api/dist/lib/subscription.js');
  const { usersRepo } = await import('../apps/api/dist/repos/users.js');
  const originalGetBilling = usersRepo.getBilling;

  usersRepo.getBilling = async () => ({ subscriptionStatus: 'inactive' });

  try {
    const reply = createReply();
    const allowed = await requireActiveSubscription({}, reply, {
      id: 'user-1',
      email: 'test@example.com',
    });

    assert.equal(allowed, false);
    assert.equal(reply.statusCode, 402);
    assert.deepEqual(reply.payload, {
      error: 'An active subscription is required',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  } finally {
    usersRepo.getBilling = originalGetBilling;
  }
});

test('requireActiveSubscription allows active users', async () => {
  applyApiEnv();
  const { requireActiveSubscription } = await import('../apps/api/dist/lib/subscription.js');
  const { usersRepo } = await import('../apps/api/dist/repos/users.js');
  const originalGetBilling = usersRepo.getBilling;

  usersRepo.getBilling = async () => ({ subscriptionStatus: 'active' });

  try {
    const reply = createReply();
    const allowed = await requireActiveSubscription({}, reply, {
      id: 'user-2',
      email: 'active@example.com',
    });

    assert.equal(allowed, true);
    assert.equal(reply.statusCode, 200);
    assert.equal(reply.payload, undefined);
  } finally {
    usersRepo.getBilling = originalGetBilling;
  }
});
