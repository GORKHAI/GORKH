import {
  TransactionStudioSimulationStatus,
  type SolanaSimulationPreview,
  type TransactionStudioBalanceChange,
  type TransactionStudioDecodedTransaction,
  type TransactionStudioInput,
  type TransactionStudioSimulationResult,
} from '@gorkh/shared';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createIdleSimulation(input: TransactionStudioInput): TransactionStudioSimulationResult {
  return {
    id: id('txs-sim'),
    inputId: input.id,
    status: TransactionStudioSimulationStatus.IDLE,
    logs: [],
    accountChanges: [],
    balanceChanges: [],
    tokenBalanceChanges: [],
    warnings: ['Simulation requires explicit user action.'],
  };
}

export function mapSimulationPreviewToStudio(
  input: TransactionStudioInput,
  preview: SolanaSimulationPreview,
  decoded?: TransactionStudioDecodedTransaction | null,
  simulatedAccountAddresses?: string[]
): TransactionStudioSimulationResult {
  const postSimulationBalances = extractPostSimulationBalanceChanges(
    preview.accounts,
    simulatedAccountAddresses ?? decoded?.accounts.map((account) => account.address) ?? []
  );
  return {
    id: id('txs-sim'),
    inputId: input.id,
    status: preview.success
      ? TransactionStudioSimulationStatus.SUCCESS
      : TransactionStudioSimulationStatus.FAILED,
    err: preview.err,
    computeUnitsConsumed: preview.unitsConsumed,
    logs: preview.logs,
    replacementBlockhash: preview.replacementBlockhash,
    accountChanges: preview.accounts ?? [],
    balanceChanges: postSimulationBalances,
    tokenBalanceChanges: [],
    warnings: [
      preview.warning,
      'Simulation uses current RPC state and does not guarantee future execution.',
      'Signature verification disabled for preview.',
      ...(postSimulationBalances.length > 0
        ? ['Simulation account balances are post-simulation snapshots; pre-state deltas require transaction metadata.']
        : []),
    ],
    simulatedAt: preview.simulatedAt,
  };
}

function extractPostSimulationBalanceChanges(
  accounts: unknown[] | undefined,
  addresses: string[]
): TransactionStudioBalanceChange[] {
  if (!accounts?.length) return [];
  const changes: TransactionStudioBalanceChange[] = [];
  accounts.forEach((account, index) => {
    if (!account || typeof account !== 'object') return;
    const lamports = (account as { lamports?: unknown }).lamports;
    const owner = (account as { owner?: unknown }).owner;
    if (typeof lamports !== 'number') return;
    changes.push({
      account: addresses[index] ?? `simulation_account_${index}`,
      owner: typeof owner === 'string' ? owner : undefined,
      postAmount: String(lamports),
      source: 'sol',
    });
  });
  return changes;
}

export function extractBalanceChangesFromTransactionMeta(raw: unknown): {
  sol: TransactionStudioBalanceChange[];
  token: TransactionStudioBalanceChange[];
} {
  if (!raw || typeof raw !== 'object') return { sol: [], token: [] };
  const result = raw as {
    meta?: {
      preBalances?: number[];
      postBalances?: number[];
      preTokenBalances?: Array<{
        accountIndex?: number;
        mint?: string;
        owner?: string;
        uiTokenAmount?: { amount?: string; decimals?: number; uiAmountString?: string };
      }>;
      postTokenBalances?: Array<{
        accountIndex?: number;
        mint?: string;
        owner?: string;
        uiTokenAmount?: { amount?: string; decimals?: number; uiAmountString?: string };
      }>;
    };
    transaction?: { message?: { accountKeys?: unknown[] } };
  };

  const accountKeys =
    result.transaction?.message?.accountKeys?.map((key) =>
      typeof key === 'string'
        ? key
        : typeof key === 'object' && key && 'pubkey' in key
          ? String((key as { pubkey?: unknown }).pubkey)
          : 'unknown'
    ) ?? [];

  const sol: TransactionStudioBalanceChange[] = [];
  const preBalances = result.meta?.preBalances ?? [];
  const postBalances = result.meta?.postBalances ?? [];
  for (let index = 0; index < Math.max(preBalances.length, postBalances.length); index += 1) {
    const pre = preBalances[index];
    const post = postBalances[index];
    if (typeof pre !== 'number' || typeof post !== 'number' || pre === post) continue;
    sol.push({
      account: accountKeys[index] ?? `account_index_${index}`,
      preAmount: String(pre),
      postAmount: String(post),
      delta: String(post - pre),
      source: 'sol',
    });
  }

  const token: TransactionStudioBalanceChange[] = [];
  const preTokenBalances = result.meta?.preTokenBalances ?? [];
  const postTokenBalances = result.meta?.postTokenBalances ?? [];
  const preToken = new Map(preTokenBalances.map((balance) => [balance.accountIndex, balance]));
  const postToken = new Map(postTokenBalances.map((balance) => [balance.accountIndex, balance]));
  for (const post of postTokenBalances) {
    const pre = preToken.get(post.accountIndex);
    const preAmount = pre?.uiTokenAmount?.amount;
    const postAmount = post.uiTokenAmount?.amount;
    if (!postAmount || preAmount === postAmount) continue;
    token.push({
      account:
        typeof post.accountIndex === 'number'
          ? accountKeys[post.accountIndex] ?? `account_index_${post.accountIndex}`
          : 'unknown',
      mint: post.mint,
      owner: post.owner,
      preAmount,
      postAmount,
      delta:
        preAmount && /^-?\d+$/.test(preAmount) && /^-?\d+$/.test(postAmount)
          ? String(BigInt(postAmount) - BigInt(preAmount))
          : undefined,
      decimals: post.uiTokenAmount?.decimals,
      uiAmountString: post.uiTokenAmount?.uiAmountString,
      source: 'spl_token',
    });
  }
  for (const pre of preTokenBalances) {
    if (postToken.has(pre.accountIndex)) continue;
    const preAmount = pre.uiTokenAmount?.amount;
    if (!preAmount || preAmount === '0') continue;
    token.push({
      account:
        typeof pre.accountIndex === 'number'
          ? accountKeys[pre.accountIndex] ?? `account_index_${pre.accountIndex}`
          : 'unknown',
      mint: pre.mint,
      owner: pre.owner,
      preAmount,
      postAmount: '0',
      delta: /^-?\d+$/.test(preAmount) ? String(BigInt(0) - BigInt(preAmount)) : undefined,
      decimals: pre.uiTokenAmount?.decimals,
      uiAmountString: '0',
      source: 'spl_token',
    });
  }

  return { sol, token };
}
