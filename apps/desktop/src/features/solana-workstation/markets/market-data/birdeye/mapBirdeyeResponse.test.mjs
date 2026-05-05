import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapBirdeyePriceResponse, mapBirdeyeOverviewResponse } from './mapBirdeyeResponse.js';
import { SolanaMarketDataProviderId } from '@gorkh/shared';

const MINT = 'So11111111111111111111111111111111111111112';
const NETWORK = 'devnet';

describe('mapBirdeyeResponse', () => {
  describe('mapBirdeyePriceResponse', () => {
    it('maps standard data.value shape', () => {
      const ctx = mapBirdeyePriceResponse({ data: { value: 42.5 } }, MINT, NETWORK);
      assert.strictEqual(ctx.mintAddress, MINT);
      assert.strictEqual(ctx.network, NETWORK);
      assert.strictEqual(ctx.provider, SolanaMarketDataProviderId.BIRDEYE_READ_ONLY);
      assert.strictEqual(ctx.priceUsd, '42.5');
      assert.strictEqual(ctx.isSample, false);
      assert.ok(Array.isArray(ctx.warnings));
      assert.ok(Array.isArray(ctx.safetyNotes));
    });

    it('maps data.price shape', () => {
      const ctx = mapBirdeyePriceResponse({ data: { price: 99.99 } }, MINT, NETWORK);
      assert.strictEqual(ctx.priceUsd, '99.99');
    });

    it('maps nested data with value field', () => {
      const ctx = mapBirdeyePriceResponse({ success: true, data: { value: 1.23 } }, MINT, NETWORK);
      assert.strictEqual(ctx.priceUsd, '1.23');
    });

    it('maps all optional fields', () => {
      const ctx = mapBirdeyePriceResponse(
        {
          data: {
            value: 10,
            priceChange24hPercent: 5.5,
            v24hUSD: 1000000,
            liquidity: 500000,
            marketCap: 10000000,
          },
        },
        MINT,
        NETWORK
      );
      assert.strictEqual(ctx.priceUsd, '10');
      assert.strictEqual(ctx.priceChange24hPct, '5.5');
      assert.strictEqual(ctx.volume24hUsd, '1000000');
      assert.strictEqual(ctx.liquidityUsd, '500000');
      assert.strictEqual(ctx.marketCapUsd, '10000000');
    });

    it('adds warning when price is missing', () => {
      const ctx = mapBirdeyePriceResponse({ data: {} }, MINT, NETWORK);
      assert.strictEqual(ctx.priceUsd, undefined);
      assert.ok(ctx.warnings.some((w) => w.includes('Price field not found')));
    });

    it('handles null/undefined data gracefully', () => {
      const ctx = mapBirdeyePriceResponse(null, MINT, NETWORK);
      assert.strictEqual(ctx.priceUsd, undefined);
      assert.ok(ctx.warnings.some((w) => w.includes('Price field not found')));
    });

    it('sets fetchedAt timestamp', () => {
      const before = Date.now();
      const ctx = mapBirdeyePriceResponse({ data: { value: 1 } }, MINT, NETWORK);
      const after = Date.now();
      assert.ok(ctx.fetchedAt >= before && ctx.fetchedAt <= after);
    });
  });

  describe('mapBirdeyeOverviewResponse', () => {
    it('maps overview with name and symbol', () => {
      const { priceContext, overviewSummary } = mapBirdeyeOverviewResponse(
        { data: { price: 50, name: 'Wrapped SOL', symbol: 'wSOL', marketCap: 1000000 } },
        MINT,
        NETWORK
      );
      assert.strictEqual(priceContext.priceUsd, '50');
      assert.ok(overviewSummary.includes('Wrapped SOL'));
      assert.ok(overviewSummary.includes('wSOL'));
      assert.ok(overviewSummary.includes('$1000000'));
    });

    it('maps volume 24h', () => {
      const { overviewSummary } = mapBirdeyeOverviewResponse(
        { data: { price: 1, v24hUSD: 5000 } },
        MINT,
        NETWORK
      );
      assert.ok(overviewSummary.includes('Volume 24h: $5000'));
    });

    it('adds warning when price is missing', () => {
      const { priceContext, overviewSummary } = mapBirdeyeOverviewResponse(
        { data: { name: 'Unknown' } },
        MINT,
        NETWORK
      );
      assert.strictEqual(priceContext.priceUsd, undefined);
      assert.ok(priceContext.warnings.some((w) => w.includes('Price field not found')));
      assert.ok(overviewSummary.includes('Name: Unknown'));
    });

    it('returns no recognizable fields when data is empty', () => {
      const { overviewSummary } = mapBirdeyeOverviewResponse(
        { data: {} },
        MINT,
        NETWORK
      );
      assert.ok(overviewSummary.includes('no recognizable fields'));
    });

    it('builds summary from available fields only', () => {
      const { overviewSummary } = mapBirdeyeOverviewResponse(
        { data: { price: 10 } },
        MINT,
        NETWORK
      );
      assert.ok(overviewSummary.includes('Price: $10'));
      assert.ok(!overviewSummary.includes('Name:'));
      assert.ok(!overviewSummary.includes('Symbol:'));
    });

    it('sets correct provider and isSample', () => {
      const { priceContext } = mapBirdeyeOverviewResponse(
        { data: { price: 1 } },
        MINT,
        NETWORK
      );
      assert.strictEqual(priceContext.provider, SolanaMarketDataProviderId.BIRDEYE_READ_ONLY);
      assert.strictEqual(priceContext.isSample, false);
    });
  });
});
