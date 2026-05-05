import { useState, useCallback } from 'react';
import type { SolanaMarketsWatchlistItem } from '@gorkh/shared';
import { createMarketDataContext } from '../createMarketDataContext.js';
import {
  createSamplePriceContext,
  createSampleLiquidityContext,
} from '../sampleOfflineMarketData.js';
import { PriceContextCard } from './PriceContextCard.js';
import { LiquidityContextCard } from './LiquidityContextCard.js';
import { MarketDataSafetyPanel } from './MarketDataSafetyPanel.js';
import { BirdeyeFetchPanel } from '../birdeye/components/BirdeyeFetchPanel.js';

export interface MarketDataContextPanelProps {
  item: SolanaMarketsWatchlistItem | null;
}

export function MarketDataContextPanel({ item }: MarketDataContextPanelProps) {
  const [generated, setGenerated] = useState(false);
  const [birdeyePriceContext, setBirdeyePriceContext] = useState<import('@gorkh/shared').SolanaMarketPriceContext | null>(null);

  const handleGenerateSample = useCallback(() => {
    if (!item) return;
    setGenerated(true);
  }, [item]);

  const handleClear = useCallback(() => {
    setGenerated(false);
  }, []);

  const handleBirdeyeFetch = useCallback((result: { priceContext?: import('@gorkh/shared').SolanaMarketPriceContext }) => {
    if (result.priceContext) {
      setBirdeyePriceContext(result.priceContext);
    }
  }, []);

  if (!item) {
    return (
      <div
        style={{
          padding: '1rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          fontSize: '0.85rem',
          color: '#94a3b8',
        }}
      >
        Select a watchlist item to view market data context.
      </div>
    );
  }

  const priceContext = generated
    ? createSamplePriceContext(item.address, item.network)
    : undefined;
  const liquidityContext = generated
    ? createSampleLiquidityContext(item.address, item.network)
    : undefined;

  const dataContext = createMarketDataContext({
    item,
    priceContext,
    liquidityContext,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <MarketDataSafetyPanel />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {!generated && (
          <button
            onClick={handleGenerateSample}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Generate Sample Context
          </button>
        )}
        {generated && (
          <button
            onClick={handleClear}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Clear Context
          </button>
        )}
      </div>

      {dataContext.isSample && generated && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            fontSize: '0.78rem',
            color: '#92400e',
            fontWeight: 700,
          }}
        >
          ⚠ SAMPLE DATA — Not real market data. Do not use for trading.
        </div>
      )}

      {item && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          <BirdeyeFetchPanel item={item} onFetchResult={handleBirdeyeFetch} />
        </div>
      )}

      {priceContext && <PriceContextCard context={priceContext} />}
      {liquidityContext && <LiquidityContextCard context={liquidityContext} />}
      {birdeyePriceContext && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>
            Birdeye Fetched Price Context
          </div>
          <PriceContextCard context={birdeyePriceContext} />
        </div>
      )}

      {dataContext.warnings.length > 0 && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.75rem',
            color: '#991b1b',
          }}
        >
          {dataContext.warnings.map((w: string, i: number) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
