import {
  type SolanaRpcEndpointConfig,
  type SolanaRpcCommitment,
  type SolanaAccountLookupResult,
  type SolanaSignatureLookupResult,
  type SolanaSimulationPreview,
  assertAllowedSolanaRpcMethod,
  isDeniedSolanaRpcMethod,
} from '@gorkh/shared';
import { SolanaRpcError, SolanaRpcTimeoutError } from './solanaRpcErrors.js';
import { RPC_TIMEOUT_MS } from './solanaRpcConfig.js';

// ============================================================================
// Typed Solana JSON-RPC Client
// ============================================================================
// Read-only. No signing. No sending. No execution.
// All methods are explicitly typed and validated against an allowlist.
// ============================================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown[];
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number | string; message: string; data?: unknown };
}

let requestId = 0;

async function rpcCall<T>(
  endpoint: SolanaRpcEndpointConfig,
  method: string,
  params: unknown[]
): Promise<T> {
  if (isDeniedSolanaRpcMethod(method)) {
    throw new SolanaRpcError(`RPC method "${method}" is denied for safety.`);
  }
  assertAllowedSolanaRpcMethod(method);

  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: ++requestId,
    method,
    params,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new SolanaRpcError(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as JsonRpcResponse<T>;

    if (data.error) {
      throw new SolanaRpcError(data.error.message, data.error.code, data.error.data);
    }

    if (data.result === undefined) {
      throw new SolanaRpcError('RPC returned undefined result');
    }

    return data.result;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof SolanaRpcError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SolanaRpcTimeoutError(method, RPC_TIMEOUT_MS);
    }
    throw new SolanaRpcError(err instanceof Error ? err.message : 'Unknown RPC error');
  }
}

// ----------------------------------------------------------------------------
// Read-only helper functions
// ----------------------------------------------------------------------------

function commitmentParam(commitment?: SolanaRpcCommitment): unknown {
  return commitment ? { commitment } : {};
}

export async function getAccountInfoReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  address: string,
  commitment?: SolanaRpcCommitment
): Promise<SolanaAccountLookupResult> {
  const result = await rpcCall<{ value: { lamports: number; owner: string; executable: boolean; rentEpoch: number; data: string[] | string | [string, string] } | null }>(
    endpoint,
    'getAccountInfo',
    [address, { encoding: 'jsonParsed', commitment: commitment ?? 'confirmed' }]
  );

  const fetchedAt = Date.now();

  if (!result.value) {
    return {
      address,
      network: endpoint.network,
      exists: false,
      fetchedAt,
    };
  }

  const v = result.value;
  let dataLength = 0;
  if (Array.isArray(v.data) && v.data.length === 2 && typeof v.data[0] === 'string') {
    dataLength = atob(v.data[0]).length;
  } else if (typeof v.data === 'string') {
    dataLength = atob(v.data).length;
  }

  return {
    address,
    network: endpoint.network,
    exists: true,
    lamports: v.lamports,
    owner: v.owner,
    executable: v.executable,
    rentEpoch: v.rentEpoch,
    dataLength,
    fetchedAt,
    raw: result,
  };
}

export async function getBalanceReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  address: string,
  commitment?: SolanaRpcCommitment
): Promise<{ lamports: number; fetchedAt: number }> {
  const result = await rpcCall<{ value: number }>(
    endpoint,
    'getBalance',
    [address, commitmentParam(commitment)]
  );
  return { lamports: result.value, fetchedAt: Date.now() };
}

export async function getTransactionReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  signature: string,
  commitment?: SolanaRpcCommitment
): Promise<SolanaSignatureLookupResult> {
  const result = await rpcCall<{
    slot: number;
    blockTime?: number;
    meta?: {
      err?: unknown;
      fee: number;
      computeUnitsConsumed?: number;
      logMessages?: string[];
    };
    transaction?: {
      message?: {
        accountKeys?: string[];
        instructions?: unknown[];
      };
    };
  } | null>(endpoint, 'getTransaction', [
    signature,
    { commitment: commitment ?? 'confirmed', maxSupportedTransactionVersion: 0 },
  ]);

  const fetchedAt = Date.now();

  if (!result) {
    return {
      signature,
      network: endpoint.network,
      found: false,
      fetchedAt,
    };
  }

  return {
    signature,
    network: endpoint.network,
    found: true,
    slot: result.slot,
    blockTime: result.blockTime,
    confirmationStatus: undefined,
    err: result.meta?.err,
    fee: result.meta?.fee,
    computeUnitsConsumed: result.meta?.computeUnitsConsumed,
    accountKeys: result.transaction?.message?.accountKeys,
    instructions: result.transaction?.message?.instructions,
    logs: result.meta?.logMessages,
    raw: result,
    fetchedAt,
  };
}

export async function getLatestBlockhashReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  commitment?: SolanaRpcCommitment
): Promise<{ blockhash: string; lastValidBlockHeight: number; fetchedAt: number }> {
  const result = await rpcCall<{
    value: { blockhash: string; lastValidBlockHeight: number };
  }>(endpoint, 'getLatestBlockhash', [commitmentParam(commitment)]);
  return {
    blockhash: result.value.blockhash,
    lastValidBlockHeight: result.value.lastValidBlockHeight,
    fetchedAt: Date.now(),
  };
}

export async function getTokenAccountsByOwnerReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  ownerAddress: string,
  commitment?: SolanaRpcCommitment
): Promise<
  { pubkey: string; mint: string; amount: string; decimals: number; uiAmountString: string; fetchedAt: number }[]
> {
  const result = await rpcCall<{
    value: {
      account: { data: { parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number; uiAmountString: string } } } } };
      pubkey: string;
    }[];
  }>(endpoint, 'getTokenAccountsByOwner', [
    ownerAddress,
    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    { encoding: 'jsonParsed', commitment: commitment ?? 'confirmed' },
  ]);

  const fetchedAt = Date.now();
  return result.value.map((v) => ({
    pubkey: v.pubkey,
    mint: v.account.data.parsed.info.mint,
    amount: v.account.data.parsed.info.tokenAmount.amount,
    decimals: v.account.data.parsed.info.tokenAmount.decimals,
    uiAmountString: v.account.data.parsed.info.tokenAmount.uiAmountString,
    fetchedAt,
  }));
}

export async function simulateTransactionPreview(
  endpoint: SolanaRpcEndpointConfig,
  serializedTransactionBase64: string,
  commitment?: SolanaRpcCommitment,
  accountAddresses?: string[]
): Promise<SolanaSimulationPreview> {
  const result = await rpcCall<{
    value: {
      err?: unknown;
      logs?: string[];
      unitsConsumed?: number;
      accounts?: unknown[];
      replacementBlockhash?: { blockhash: string; lastValidBlockHeight: number };
    };
  }>(endpoint, 'simulateTransaction', [
    serializedTransactionBase64,
    {
      commitment: commitment ?? 'confirmed',
      encoding: 'base64',
      replaceRecentBlockhash: true,
      sigVerify: false,
      ...(accountAddresses && accountAddresses.length > 0
        ? {
            accounts: {
              encoding: 'base64',
              addresses: accountAddresses.slice(0, 20),
            },
          }
        : {}),
    },
  ]);

  const v = result.value;
  const simulatedAt = Date.now();

  return {
    network: endpoint.network,
    success: !v.err,
    err: v.err ?? undefined,
    logs: v.logs ?? [],
    unitsConsumed: v.unitsConsumed,
    accounts: v.accounts,
    replacementBlockhash: v.replacementBlockhash?.blockhash,
    raw: result,
    simulatedAt,
    warning:
      'Simulation uses current RPC state and does not guarantee future execution. Do not treat simulation success as a safety guarantee.',
  };
}

export async function getMultipleAccountsReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  addresses: string[],
  commitment?: SolanaRpcCommitment
): Promise<
  { address: string; exists: boolean; lamports?: number; owner?: string; executable?: boolean; dataLength?: number }[]
> {
  const result = await rpcCall<{
    value: ({
      lamports: number;
      owner: string;
      executable: boolean;
      data: string[] | string;
    } | null)[];
  }>(endpoint, 'getMultipleAccounts', [
    addresses,
    { encoding: 'base64', commitment: commitment ?? 'confirmed' },
  ]);

  return addresses.map((address, i) => {
    const v = result.value[i];
    if (!v) return { address, exists: false };
    let dataLength = 0;
    if (Array.isArray(v.data) && v.data.length === 2) {
      dataLength = atob(v.data[0]).length;
    } else if (typeof v.data === 'string') {
      dataLength = atob(v.data).length;
    }
    return {
      address,
      exists: true,
      lamports: v.lamports,
      owner: v.owner,
      executable: v.executable,
      dataLength,
    };
  });
}

export async function getTokenSupplyReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  mintAddress: string,
  commitment?: SolanaRpcCommitment
): Promise<{
  amount: string;
  decimals: number;
  uiAmountString: string;
  fetchedAt: number;
}> {
  const result = await rpcCall<{
    value: {
      amount: string;
      decimals: number;
      uiAmountString: string;
    };
  }>(endpoint, 'getTokenSupply', [
    mintAddress,
    { encoding: 'jsonParsed', commitment: commitment ?? 'confirmed' },
  ]);

  return {
    amount: result.value.amount,
    decimals: result.value.decimals,
    uiAmountString: result.value.uiAmountString,
    fetchedAt: Date.now(),
  };
}

export async function getTokenLargestAccountsReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  mintAddress: string,
  commitment?: SolanaRpcCommitment
): Promise<
  { address: string; amount: string; decimals: number; uiAmountString: string }[]
> {
  const result = await rpcCall<{
    value: {
      address: string;
      amount: string;
      decimals: number;
      uiAmountString: string;
    }[];
  }>(endpoint, 'getTokenLargestAccounts', [
    mintAddress,
    { commitment: commitment ?? 'confirmed' },
  ]);

  const fetchedAt = Date.now();
  return result.value.map((v) => ({
    address: v.address,
    amount: v.amount,
    decimals: v.decimals,
    uiAmountString: v.uiAmountString,
    fetchedAt,
  }));
}

export async function getHealthReadOnly(endpoint: SolanaRpcEndpointConfig): Promise<{ status: string; fetchedAt: number }> {
  const result = await rpcCall<string>(endpoint, 'getHealth', []);
  return { status: result, fetchedAt: Date.now() };
}

export async function getVersionReadOnly(endpoint: SolanaRpcEndpointConfig): Promise<{ version?: string; raw: unknown; fetchedAt: number }> {
  const result = await rpcCall<{ 'solana-core'?: string }>(endpoint, 'getVersion', []);
  return { version: result['solana-core'], raw: result, fetchedAt: Date.now() };
}

export async function getSlotReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  commitment?: SolanaRpcCommitment
): Promise<{ slot: number; fetchedAt: number }> {
  const result = await rpcCall<number>(endpoint, 'getSlot', [commitmentParam(commitment)]);
  return { slot: result, fetchedAt: Date.now() };
}

export async function getBlockHeightReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  commitment?: SolanaRpcCommitment
): Promise<{ blockHeight: number; fetchedAt: number }> {
  const result = await rpcCall<number>(endpoint, 'getBlockHeight', [commitmentParam(commitment)]);
  return { blockHeight: result, fetchedAt: Date.now() };
}

export async function getEpochInfoReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  commitment?: SolanaRpcCommitment
): Promise<{
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight?: number;
  transactionCount?: number;
  fetchedAt: number;
}> {
  const result = await rpcCall<{
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    absoluteSlot: number;
    blockHeight?: number;
    transactionCount?: number;
  }>(endpoint, 'getEpochInfo', [commitmentParam(commitment)]);
  return { ...result, fetchedAt: Date.now() };
}

export async function getSignatureStatusesReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  signatures: string[]
): Promise<{ statuses: unknown[]; fetchedAt: number }> {
  const result = await rpcCall<{ value: unknown[] }>(endpoint, 'getSignatureStatuses', [
    signatures.slice(0, 20),
    { searchTransactionHistory: false },
  ]);
  return { statuses: result.value, fetchedAt: Date.now() };
}
