import type { SolanaRpcEndpointConfig } from '@gorkh/shared';
import {
  getAccountInfoReadOnly,
  getBalanceReadOnly,
  getTokenAccountsByOwnerReadOnly,
  getTokenSupplyReadOnly,
  getTokenLargestAccountsReadOnly,
} from '../rpc/index.js';
import type {
  SolanaMarketsAccountSnapshot,
  SolanaMarketsTokenMintSnapshot,
  SolanaMarketsWalletSnapshot,
} from '@gorkh/shared';

export async function fetchAccountSnapshot(
  endpoint: SolanaRpcEndpointConfig,
  address: string
): Promise<SolanaMarketsAccountSnapshot> {
  const result = await getAccountInfoReadOnly(endpoint, address);
  return {
    address: result.address,
    network: result.network,
    exists: result.exists,
    lamports: result.lamports,
    owner: result.owner,
    executable: result.executable,
    dataLength: result.dataLength,
    rentEpoch: result.rentEpoch,
    fetchedAt: result.fetchedAt,
  };
}

export async function fetchWalletSnapshot(
  endpoint: SolanaRpcEndpointConfig,
  walletAddress: string
): Promise<SolanaMarketsWalletSnapshot> {
  const [balanceResult, tokenAccounts] = await Promise.all([
    getBalanceReadOnly(endpoint, walletAddress),
    getTokenAccountsByOwnerReadOnly(endpoint, walletAddress).catch(() => []),
  ]);

  const fetchedAt = Date.now();

  return {
    walletAddress,
    network: endpoint.network,
    exists: true,
    solBalanceLamports: balanceResult.lamports,
    solBalanceUi: (balanceResult.lamports / 1_000_000_000).toFixed(9),
    tokenAccountCount: tokenAccounts.length,
    tokenAccountsPreview: tokenAccounts.slice(0, 20).map((t) => ({
      pubkey: t.pubkey,
      mint: t.mint,
      amountRaw: t.amount,
      amountUi: t.uiAmountString,
      decimals: t.decimals,
      uiAmountString: t.uiAmountString,
    })),
    fetchedAt,
    warnings: tokenAccounts.length > 20 ? ['Token account list truncated to 20 entries.'] : [],
  };
}

export async function fetchTokenMintSnapshot(
  endpoint: SolanaRpcEndpointConfig,
  mintAddress: string
): Promise<SolanaMarketsTokenMintSnapshot> {
  const [accountResult, supplyResult, largestResult] = await Promise.allSettled([
    getAccountInfoReadOnly(endpoint, mintAddress),
    getTokenSupplyReadOnly(endpoint, mintAddress),
    getTokenLargestAccountsReadOnly(endpoint, mintAddress),
  ]);

  const fetchedAt = Date.now();
  const account = accountResult.status === 'fulfilled' ? accountResult.value : null;

  if (!account || !account.exists) {
    return {
      mintAddress,
      network: endpoint.network,
      exists: false,
      fetchedAt,
      warnings: ['Mint account not found.'],
    };
  }

  const supply = supplyResult.status === 'fulfilled' ? supplyResult.value : null;
  const largest = largestResult.status === 'fulfilled' ? largestResult.value : null;

  // Detect token program from owner
  const tokenProgram =
    account.owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
      ? 'spl_token'
      : account.owner === 'TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q'
        ? 'token_2022'
        : 'unknown';

  // Try to parse parsed account data for mint authority / freeze authority
  let mintAuthorityPresent: boolean | undefined;
  let freezeAuthorityPresent: boolean | undefined;
  let isInitialized: boolean | undefined;
  let decimals: number | undefined;

  try {
    const raw = (account as any).raw?.value?.data?.parsed?.info;
    if (raw) {
      mintAuthorityPresent = raw.mintAuthority !== null && raw.mintAuthority !== undefined;
      freezeAuthorityPresent = raw.freezeAuthority !== null && raw.freezeAuthority !== undefined;
      isInitialized = raw.isInitialized === true;
      decimals = typeof raw.decimals === 'number' ? raw.decimals : undefined;
    }
  } catch {
    // ignore parse errors
  }

  return {
    mintAddress,
    network: endpoint.network,
    exists: true,
    owner: account.owner,
    decimals: decimals ?? supply?.decimals,
    supplyRaw: supply?.amount,
    supplyUi: supply?.uiAmountString,
    mintAuthorityPresent,
    freezeAuthorityPresent,
    isInitialized,
    tokenProgram,
    largestAccounts: largest?.map((l) => ({
      address: l.address,
      amountRaw: l.amount,
      amountUi: l.uiAmountString,
      decimals: l.decimals,
      uiAmountString: l.uiAmountString,
    })),
    fetchedAt,
    warnings: [],
  };
}
