import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  fetchBirdeyePrice,
  fetchBirdeyeTokenOverview,
  fetchBirdeyeMarketContext,
} from './birdeyeClient.js';
import { SolanaMarketDataFetchStatus, SolanaBirdeyeFetchMode } from '@gorkh/shared';

const VALID_MINT = 'So11111111111111111111111111111111111111112';
const API_KEY = 'test-api-key-1234';

let originalFetch;

function mockFetch(response, status = 200) {
  globalThis.fetch = async () => ({
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    ok: status >= 200 && status < 300,
    json: async () => response,
  });
}

function mockFetchError(message) {
  globalThis.fetch = async () => {
    throw new Error(message);
  };
}

describe('birdeyeClient', () => {
  before(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchBirdeyePrice', () => {
    it('returns price context on success', async () => {
      mockFetch({ data: { value: 123.45, priceChange24hPercent: 2.5, v24hUSD: 1000000 } });
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.SUCCESS);
      assert.strictEqual(result.provider, 'birdeye_read_only');
      assert.strictEqual(result.priceContext?.priceUsd, '123.45');
      assert.strictEqual(result.priceContext?.priceChange24hPct, '2.5');
      assert.strictEqual(result.priceContext?.volume24hUsd, '1000000');
      assert.strictEqual(result.apiKeyStored, false);
      assert.ok(Array.isArray(result.safetyNotes));
    });

    it('returns error for invalid mint address', async () => {
      const result = await fetchBirdeyePrice(API_KEY, 'bad', 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error);
    });

    it('returns error on 401 unauthorized', async () => {
      mockFetch({}, 401);
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('unauthorized'));
    });

    it('returns error on 403 forbidden', async () => {
      mockFetch({}, 403);
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('unauthorized'));
    });

    it('returns error on 429 rate limited', async () => {
      mockFetch({}, 429);
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('Rate limited'));
    });

    it('returns error on malformed JSON', async () => {
      globalThis.fetch = async () => ({
        status: 200,
        statusText: 'OK',
        ok: true,
        json: async () => { throw new Error('bad json'); },
      });
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('Malformed'));
    });

    it('returns error on network failure', async () => {
      mockFetchError('ECONNREFUSED');
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('Network error'));
    });

    it('respects abort signal', async () => {
      globalThis.fetch = originalFetch;
      const controller = new AbortController();
      controller.abort();
      const result = await fetchBirdeyePrice(API_KEY, VALID_MINT, 'devnet', controller.signal);
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('timed out') || result.error?.includes('abort') || result.error?.includes('Abort'));
    });
  });

  describe('fetchBirdeyeTokenOverview', () => {
    it('returns overview with summary on success', async () => {
      mockFetch({ data: { price: 99.99, name: 'Wrapped SOL', symbol: 'wSOL', marketCap: 5000000000 } });
      const result = await fetchBirdeyeTokenOverview(API_KEY, VALID_MINT, 'mainnet-beta');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.SUCCESS);
      assert.ok(result.rawOverviewSummary);
      assert.ok(result.rawOverviewSummary.includes('Wrapped SOL'));
      assert.ok(result.rawOverviewSummary.includes('wSOL'));
      assert.strictEqual(result.priceContext?.priceUsd, '99.99');
    });

    it('returns error for invalid mint address', async () => {
      const result = await fetchBirdeyeTokenOverview(API_KEY, '', 'devnet');
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
    });
  });

  describe('fetchBirdeyeMarketContext', () => {
    it('fetches price only when mode is price', async () => {
      mockFetch({ data: { value: 50 } });
      const result = await fetchBirdeyeMarketContext(API_KEY, VALID_MINT, 'devnet', SolanaBirdeyeFetchMode.PRICE);
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.SUCCESS);
      assert.strictEqual(result.priceContext?.priceUsd, '50');
      assert.strictEqual(result.rawOverviewSummary, undefined);
    });

    it('fetches overview only when mode is token_overview', async () => {
      mockFetch({ data: { price: 75, name: 'Token', symbol: 'TKN' } });
      const result = await fetchBirdeyeMarketContext(API_KEY, VALID_MINT, 'devnet', SolanaBirdeyeFetchMode.TOKEN_OVERVIEW);
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.SUCCESS);
      assert.ok(result.rawOverviewSummary);
      assert.strictEqual(result.priceContext?.priceUsd, '75');
    });

    it('fetches both when mode is price_and_overview', async () => {
      let callCount = 0;
      globalThis.fetch = async (url) => {
        callCount++;
        const isPrice = url.includes('/defi/price');
        return {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: async () => ({
            data: isPrice
              ? { value: 100, priceChange24hPercent: 1.2 }
              : { price: 100.5, name: 'Test', symbol: 'TST', marketCap: 1000000 },
          }),
        };
      };
      const result = await fetchBirdeyeMarketContext(API_KEY, VALID_MINT, 'devnet', SolanaBirdeyeFetchMode.PRICE_AND_OVERVIEW);
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.SUCCESS);
      assert.strictEqual(callCount, 2);
      assert.ok(result.priceContext);
      assert.ok(result.rawOverviewSummary);
    });

    it('returns error when both fetches fail', async () => {
      mockFetchError('Network failure');
      const result = await fetchBirdeyeMarketContext(API_KEY, VALID_MINT, 'devnet', SolanaBirdeyeFetchMode.PRICE_AND_OVERVIEW);
      assert.strictEqual(result.status, SolanaMarketDataFetchStatus.ERROR);
      assert.ok(result.error?.includes('failed'));
      assert.ok(result.warnings.length > 0);
    });
  });
});
