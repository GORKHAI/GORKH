import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

process.env.PORT = process.env.PORT || '3001';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_operator';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
process.env.API_PUBLIC_BASE_URL = process.env.API_PUBLIC_BASE_URL || 'http://localhost:3001';
process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_value';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_value';
process.env.STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_test_value';
process.env.DEFI_FEATURES_ENABLED = 'true';
process.env.DEFI_CACHE_TTL_MS = '1';
process.env.DEFI_REQUEST_TIMEOUT_MS = '500';
process.env.JUPITER_API_BASE = 'https://quote-api.jup.ag?api-key=secret-value';
process.env.BIRDEYE_API_KEY = '';
process.env.KAMINO_API_BASE = '';
process.env.MARGINFI_API_BASE = '';
process.env.ORCA_API_BASE = '';
process.env.RAYDIUM_API_BASE = '';
process.env.METEORA_API_BASE = '';

const { registerDeFiRoutes } = await import('../dist/routes/defi.js');

async function withServer(run) {
  const app = Fastify({ logger: false });
  await registerDeFiRoutes(app);
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

test('DeFi health endpoint redacts env-derived URLs and reports unavailable adapters', async () => {
  await withServer(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/api/defi/health' });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.status, 'loaded');
    const text = JSON.stringify(payload);
    assert.doesNotMatch(text, /secret-value/);
    assert.match(text, /Jupiter Quote API/);
    assert.match(text, /Kamino read-only adapter requires KAMINO_API_BASE/);
  });
});

test('DeFi positions reject invalid wallet public keys', async () => {
  await withServer(async (app) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/defi/positions?wallet=not-a-wallet',
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.body, /wallet must be a valid Solana public key/);
  });
});

test('DeFi LST endpoint returns unavailable instead of crashing when indexer env is missing', async () => {
  await withServer(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/api/defi/lsts' });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.status, 'unavailable');
    assert.match(JSON.stringify(payload), /BIRDEYE_API_KEY is not configured/);
  });
});

test('Jupiter quote endpoint validates amount and slippage', async () => {
  await withServer(async (app) => {
    const badAmount = await app.inject({
      method: 'GET',
      url: '/api/defi/jupiter/quote?inputMint=SOL&outputMint=USDC&amount=0&slippageBps=50',
    });
    assert.equal(badAmount.statusCode, 400);
    assert.match(badAmount.body, /amount must be a positive bounded raw token amount/);

    const badSlippage = await app.inject({
      method: 'GET',
      url: '/api/defi/jupiter/quote?inputMint=SOL&outputMint=USDC&amount=1000&slippageBps=9000',
    });
    assert.equal(badSlippage.statusCode, 400);
    assert.match(badSlippage.body, /Number must be less than or equal to 5000/);
  });
});

test('Jupiter quote endpoint returns summary only and strips executable payload fields', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    inAmount: '1000',
    outAmount: '990',
    priceImpactPct: '0.01',
    routePlan: [
      {
        swapInfo: {
          label: 'Mock route',
          inputMint: 'input',
          outputMint: 'output',
          feeAmount: '1',
        },
      },
    ],
    swapTransaction: 'must-not-return',
    transaction: 'must-not-return',
    instructions: [{ programId: 'must-not-return' }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  try {
    await withServer(async (app) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/defi/jupiter/quote?inputMint=SOL&outputMint=USDC&amount=1000&slippageBps=50',
      });
      assert.equal(response.statusCode, 200);
      const payload = response.json();
      assert.equal(payload.status, 'loaded');
      assert.equal(payload.data.estimatedOutput, '990');
      assert.equal(payload.data.executionLocked, true);
      const text = JSON.stringify(payload);
      for (const forbidden of ['"swapTransaction"', '"transaction"', '"instructions"', 'must-not-return']) {
        assert.doesNotMatch(text, new RegExp(forbidden));
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
