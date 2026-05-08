import {
  DeFiApiEnvelopeSchema,
  DeFiPortfolioSummarySchema,
  DeFiQuoteSummarySchema,
  type DeFiApiEnvelope,
  type DeFiBackendHealth,
  type DeFiPortfolioSummary,
  type DeFiQuoteSummary,
} from '@gorkh/shared';
import { desktopRuntimeConfig } from '../../../../lib/desktopRuntimeConfig.js';

const FORBIDDEN_RESPONSE_FIELDS = [
  'transaction',
  'tx',
  'swapTransaction',
  'serializedTransaction',
  'unsignedTransaction',
  'signedTransaction',
  'transactionPayload',
  'instructions',
  'signers',
  'privateKey',
  'secretKey',
  'seedPhrase',
  'walletJson',
];

function apiBase(): string {
  if (!desktopRuntimeConfig.ok) {
    throw new Error(desktopRuntimeConfig.message);
  }
  return desktopRuntimeConfig.config.httpBase;
}

function assertNoExecutablePayload(value: unknown, path: string[] = []): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoExecutablePayload(item, [...path, String(index)]));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RESPONSE_FIELDS.includes(key)) {
      throw new Error(`DeFi backend response contained forbidden field ${[...path, key].join('.')}`);
    }
    assertNoExecutablePayload(nested, [...path, key]);
  }
}

async function fetchBackendEnvelope<T>(path: string): Promise<DeFiApiEnvelope<T>> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({
    ok: false,
    status: 'error',
    data: { message: 'Backend response was not JSON.' },
    updatedAt: Date.now(),
  }));
  assertNoExecutablePayload(payload);
  const envelope = DeFiApiEnvelopeSchema.parse(payload) as DeFiApiEnvelope<T>;
  if (!response.ok) {
    const message = typeof (envelope.data as { message?: unknown } | undefined)?.message === 'string'
      ? String((envelope.data as { message: string }).message)
      : `DeFi backend returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  return envelope;
}

export async function fetchDeFiBackendHealth(): Promise<DeFiApiEnvelope<DeFiBackendHealth>> {
  return fetchBackendEnvelope<DeFiBackendHealth>('/api/defi/health');
}

export async function fetchDeFiBackendPortfolio(input: {
  wallet: string;
  scope: string;
}): Promise<DeFiPortfolioSummary> {
  const params = new URLSearchParams({
    wallet: input.wallet,
    scope: input.scope,
  });
  const envelope = await fetchBackendEnvelope<unknown>(`/api/defi/positions?${params.toString()}`);
  return DeFiPortfolioSummarySchema.parse(envelope.data);
}

export async function fetchDeFiBackendQuote(path: string): Promise<DeFiQuoteSummary> {
  const envelope = await fetchBackendEnvelope<unknown>(path);
  return DeFiQuoteSummarySchema.parse(envelope.data);
}
