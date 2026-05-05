import {
  SolanaMarketDataFetchStatus,
  type SolanaBirdeyeFetchMode,
  type SolanaBirdeyeMarketFetchResult,
  type SolanaRpcNetwork,
  SOLANA_MARKETS_PHASE_18_SAFETY_NOTES,
} from '@gorkh/shared';
import {
  getBirdeyePriceUrl,
  getBirdeyeTokenOverviewUrl,
  validateBirdeyeMintAddress,
} from './birdeyeGuards.js';
import { mapBirdeyePriceResponse, mapBirdeyeOverviewResponse } from './mapBirdeyeResponse.js';

// ----------------------------------------------------------------------------
// birdeyeClient.ts
// ----------------------------------------------------------------------------
// Manual read-only Birdeye fetch functions.
// No API key storage. No automatic fetch. No trading.
// ----------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 15_000;

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    accept: 'application/json',
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
  };
}

function makeErrorResult(
  mintAddress: string,
  network: SolanaRpcNetwork,
  errorMessage: string,
  warnings: string[] = []
): SolanaBirdeyeMarketFetchResult {
  return {
    provider: 'birdeye_read_only',
    mintAddress,
    network,
    status: SolanaMarketDataFetchStatus.ERROR,
    error: errorMessage,
    apiKeyStored: false,
    safetyNotes: [...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES],
    warnings,
  };
}

export async function fetchBirdeyePrice(
  apiKey: string,
  mintAddress: string,
  network: SolanaRpcNetwork,
  signal?: AbortSignal
): Promise<SolanaBirdeyeMarketFetchResult> {
  const addrError = validateBirdeyeMintAddress(mintAddress);
  if (addrError) {
    return makeErrorResult(mintAddress, network, addrError);
  }

  const url = getBirdeyePriceUrl(mintAddress);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(apiKey),
      signal: signal ?? controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return makeErrorResult(mintAddress, network, 'Invalid or unauthorized API key.', [
        'Check your Birdeye API key and try again.',
      ]);
    }
    if (response.status === 429) {
      return makeErrorResult(mintAddress, network, 'Rate limited by Birdeye API.', [
        'Too many requests. Wait before retrying.',
      ]);
    }
    if (!response.ok) {
      return makeErrorResult(mintAddress, network, `Birdeye API error: ${response.status} ${response.statusText}`);
    }

    const raw = await response.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return makeErrorResult(mintAddress, network, 'Malformed response from Birdeye API.');
    }

    const priceContext = mapBirdeyePriceResponse(raw, mintAddress, network);
    const fetchedAt = Date.now();

    return {
      provider: 'birdeye_read_only',
      mintAddress,
      network,
      status: SolanaMarketDataFetchStatus.SUCCESS,
      priceContext,
      fetchedAt,
      apiKeyStored: false,
      safetyNotes: [...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES],
      warnings: priceContext.warnings,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : 'Unknown network error.';
    if (message.includes('abort') || message.includes('Abort') || message.includes('aborted')) {
      return makeErrorResult(mintAddress, network, 'Request timed out. Birdeye API did not respond within 15 seconds.');
    }
    return makeErrorResult(mintAddress, network, `Network error: ${message}`);
  }
}

export async function fetchBirdeyeTokenOverview(
  apiKey: string,
  mintAddress: string,
  network: SolanaRpcNetwork,
  signal?: AbortSignal
): Promise<SolanaBirdeyeMarketFetchResult> {
  const addrError = validateBirdeyeMintAddress(mintAddress);
  if (addrError) {
    return makeErrorResult(mintAddress, network, addrError);
  }

  const url = getBirdeyeTokenOverviewUrl(mintAddress);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(apiKey),
      signal: signal ?? controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return makeErrorResult(mintAddress, network, 'Invalid or unauthorized API key.', [
        'Check your Birdeye API key and try again.',
      ]);
    }
    if (response.status === 429) {
      return makeErrorResult(mintAddress, network, 'Rate limited by Birdeye API.', [
        'Too many requests. Wait before retrying.',
      ]);
    }
    if (!response.ok) {
      return makeErrorResult(mintAddress, network, `Birdeye API error: ${response.status} ${response.statusText}`);
    }

    const raw = await response.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return makeErrorResult(mintAddress, network, 'Malformed response from Birdeye API.');
    }

    const { priceContext, overviewSummary } = mapBirdeyeOverviewResponse(raw, mintAddress, network);
    const fetchedAt = Date.now();

    return {
      provider: 'birdeye_read_only',
      mintAddress,
      network,
      status: SolanaMarketDataFetchStatus.SUCCESS,
      priceContext,
      rawOverviewSummary: overviewSummary,
      fetchedAt,
      apiKeyStored: false,
      safetyNotes: [...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES],
      warnings: priceContext.warnings,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : 'Unknown network error.';
    if (message.includes('abort') || message.includes('Abort') || message.includes('aborted')) {
      return makeErrorResult(mintAddress, network, 'Request timed out. Birdeye API did not respond within 15 seconds.');
    }
    return makeErrorResult(mintAddress, network, `Network error: ${message}`);
  }
}

export async function fetchBirdeyeMarketContext(
  apiKey: string,
  mintAddress: string,
  network: SolanaRpcNetwork,
  mode: SolanaBirdeyeFetchMode,
  signal?: AbortSignal
): Promise<SolanaBirdeyeMarketFetchResult> {
  if (mode === 'price') {
    return fetchBirdeyePrice(apiKey, mintAddress, network, signal);
  }
  if (mode === 'token_overview') {
    return fetchBirdeyeTokenOverview(apiKey, mintAddress, network, signal);
  }
  // price_and_overview: fetch both and merge
  const [priceResult, overviewResult] = await Promise.allSettled([
    fetchBirdeyePrice(apiKey, mintAddress, network, signal),
    fetchBirdeyeTokenOverview(apiKey, mintAddress, network, signal),
  ]);

  const warnings: string[] = [];
  let priceContext = undefined;
  let rawOverviewSummary = undefined;

  if (priceResult.status === 'fulfilled' && priceResult.value.status === 'success') {
    priceContext = priceResult.value.priceContext;
    if (priceResult.value.warnings) warnings.push(...priceResult.value.warnings);
  } else if (priceResult.status === 'rejected' || priceResult.value?.status === 'error') {
    warnings.push('Price fetch failed or returned error.');
  }

  if (overviewResult.status === 'fulfilled' && overviewResult.value.status === 'success') {
    if (overviewResult.value.priceContext) {
      // Prefer overview price context if it has more data
      priceContext = overviewResult.value.priceContext;
    }
    rawOverviewSummary = overviewResult.value.rawOverviewSummary;
    if (overviewResult.value.warnings) warnings.push(...overviewResult.value.warnings);
  } else if (overviewResult.status === 'rejected' || overviewResult.value?.status === 'error') {
    warnings.push('Token overview fetch failed or returned error.');
  }

  if (!priceContext && !rawOverviewSummary) {
    return makeErrorResult(
      mintAddress,
      network,
      'Both price and token overview fetches failed.',
      warnings
    );
  }

  return {
    provider: 'birdeye_read_only',
    mintAddress,
    network,
    status: SolanaMarketDataFetchStatus.SUCCESS,
    priceContext,
    rawOverviewSummary,
    fetchedAt: Date.now(),
    apiKeyStored: false,
    safetyNotes: [...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES],
    warnings,
  };
}
