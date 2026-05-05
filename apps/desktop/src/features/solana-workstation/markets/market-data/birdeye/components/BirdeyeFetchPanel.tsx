import { useState, useCallback } from 'react';
import type { SolanaMarketsWatchlistItem, SolanaMarketPriceContext } from '@gorkh/shared';
import { SolanaBirdeyeFetchMode, SolanaMarketDataFetchStatus } from '@gorkh/shared';
import {
  validateBirdeyeApiKeyInput,
  sanitizeBirdeyeApiKeyForDisplay,
} from '../birdeyeGuards.js';
import { fetchBirdeyeMarketContext } from '../birdeyeClient.js';
import { PriceContextCard } from '../../components/PriceContextCard.js';

export interface BirdeyeFetchPanelProps {
  item: SolanaMarketsWatchlistItem;
  onFetchResult?: (result: { priceContext?: SolanaMarketPriceContext }) => void;
}

export function BirdeyeFetchPanel({ item, onFetchResult }: BirdeyeFetchPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<
    typeof SolanaBirdeyeFetchMode.PRICE |
    typeof SolanaBirdeyeFetchMode.TOKEN_OVERVIEW |
    typeof SolanaBirdeyeFetchMode.PRICE_AND_OVERVIEW
  >(SolanaBirdeyeFetchMode.PRICE_AND_OVERVIEW);
  const [status, setStatus] = useState<
    typeof SolanaMarketDataFetchStatus.IDLE |
    typeof SolanaMarketDataFetchStatus.LOADING |
    typeof SolanaMarketDataFetchStatus.SUCCESS |
    typeof SolanaMarketDataFetchStatus.ERROR
  >(SolanaMarketDataFetchStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [priceContext, setPriceContext] = useState<SolanaMarketPriceContext | null>(null);
  const [overviewSummary, setOverviewSummary] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    setError(null);
    setPriceContext(null);
    setOverviewSummary(null);
    setFetchedAt(null);

    let validatedKey: string;
    try {
      validatedKey = validateBirdeyeApiKeyInput(apiKey);
    } catch (e: any) {
      setError(e.message ?? 'Invalid API key.');
      return;
    }

    setStatus(SolanaMarketDataFetchStatus.LOADING);
    setMaskedKey(sanitizeBirdeyeApiKeyForDisplay(validatedKey));

    try {
      const result = await fetchBirdeyeMarketContext(
        validatedKey,
        item.address,
        item.network,
        mode
      );

      if (result.status === 'error') {
        setStatus(SolanaMarketDataFetchStatus.ERROR);
        setError(result.error ?? 'Unknown error.');
        return;
      }

      setStatus(SolanaMarketDataFetchStatus.SUCCESS);
      setFetchedAt(result.fetchedAt ?? Date.now());
      if (result.priceContext) {
        setPriceContext(result.priceContext);
        onFetchResult?.({ priceContext: result.priceContext });
      }
      if (result.rawOverviewSummary) {
        setOverviewSummary(result.rawOverviewSummary);
      }
    } catch (e: any) {
      setStatus(SolanaMarketDataFetchStatus.ERROR);
      setError(e.message ?? 'Unknown error during fetch.');
    }
  }, [apiKey, mode, item, onFetchResult]);

  const handleClear = useCallback(() => {
    setApiKey('');
    setError(null);
    setPriceContext(null);
    setOverviewSummary(null);
    setFetchedAt(null);
    setMaskedKey(null);
    setStatus(SolanaMarketDataFetchStatus.IDLE);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          fontSize: '0.78rem',
          color: '#0369a1',
        }}
      >
        Birdeye read-only fetch available when user provides API key. Key is never stored by GORKH.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
          Birdeye API Key
        </label>
        <input
          type="password"
          placeholder="Enter API key (not stored)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={status === 'loading'}
          style={{
            padding: '0.35rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            fontSize: '0.78rem',
          }}
        />
        {maskedKey && (
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Using key: {maskedKey}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
          Fetch Mode
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          disabled={status === 'loading'}
          style={{
            padding: '0.35rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            fontSize: '0.78rem',
          }}
        >
          <option value={SolanaBirdeyeFetchMode.PRICE}>Price Only</option>
          <option value={SolanaBirdeyeFetchMode.TOKEN_OVERVIEW}>Token Overview</option>
          <option value={SolanaBirdeyeFetchMode.PRICE_AND_OVERVIEW}>Price + Overview</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleFetch}
          disabled={status === 'loading' || !apiKey.trim()}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            background: status === 'loading' ? '#cbd5e1' : '#0f172a',
            color: status === 'loading' ? '#64748b' : '#fff',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: status === 'loading' || !apiKey.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'loading' ? 'Fetching…' : 'Fetch Birdeye Market Data'}
        </button>
        {(status === 'success' || status === 'error') && (
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
            Clear
          </button>
        )}
      </div>

      {status === 'success' && fetchedAt && (
        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Fetched at: {new Date(fetchedAt).toLocaleString()}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.78rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {overviewSummary && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            fontSize: '0.78rem',
            color: '#0369a1',
          }}
        >
          <strong>Overview:</strong> {overviewSummary}
        </div>
      )}

      {priceContext && <PriceContextCard context={priceContext} />}
    </div>
  );
}
