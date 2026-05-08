import {
  DeFiQuoteSummarySchema,
  type DeFiQuoteInput,
  type DeFiQuoteSummary,
} from '@gorkh/shared';
import { fetchDeFiBackendQuote } from './defiBackendClient.js';

const KNOWN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  WSOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4i1HodcqJjmZ7r2YkL8i',
};

function normalizeMint(value: string): string {
  const trimmed = value.trim();
  return KNOWN_MINTS[trimmed.toUpperCase()] ?? trimmed;
}

function createUnavailableQuote(input: DeFiQuoteInput, error: string, now = Date.now()): DeFiQuoteSummary {
  return DeFiQuoteSummarySchema.parse({
    id: `defi-quote-${now}`,
    provider: 'Jupiter',
    inputMintOrSymbol: input.inputMintOrSymbol,
    outputMintOrSymbol: input.outputMintOrSymbol,
    quoteTimestamp: now,
    status: 'unavailable',
    error,
    warnings: ['Quote only. Swap execution is locked. No executable transaction payload is stored.'],
    executionLocked: true,
    redactionsApplied: ['jupiter.executablePayloadExcluded'],
    localOnly: true,
  });
}

export async function fetchJupiterQuoteOnly(input: DeFiQuoteInput): Promise<DeFiQuoteSummary> {
  const now = Date.now();
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return createUnavailableQuote(input, 'Enter a positive amount for quote-only review.', now);
  }

  const inputMint = normalizeMint(input.inputMintOrSymbol);
  const outputMint = normalizeMint(input.outputMintOrSymbol);
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(Math.floor(amount)),
      slippageBps: String(input.slippageBps),
    });
    const quote = await fetchDeFiBackendQuote(`/api/defi/jupiter/quote?${params.toString()}`);
    return DeFiQuoteSummarySchema.parse({
      ...quote,
      inputMintOrSymbol: input.inputMintOrSymbol,
      outputMintOrSymbol: input.outputMintOrSymbol,
      warnings: [
        ...quote.warnings,
        'Quote loaded through the GORKH read-only backend. Swap execution remains locked.',
      ],
    });
  } catch (err) {
    return createUnavailableQuote(
      input,
      err instanceof Error ? err.message : 'GORKH backend Jupiter quote unavailable.',
      now
    );
  }
}
