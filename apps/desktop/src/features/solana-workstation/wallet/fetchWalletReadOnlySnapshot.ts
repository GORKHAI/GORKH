import {
  type SolanaWalletProfile,
  type SolanaWalletSnapshotResult,
  type SolanaRpcEndpointConfig,
  type SolanaRpcCommitment,
  SOLANA_WALLET_READ_ONLY_SAFETY_NOTES,
} from '@gorkh/shared';
import {
  getAccountInfoReadOnly,
  getBalanceReadOnly,
  getTokenAccountsByOwnerReadOnly,
} from '../rpc/index.js';
import { validateWalletPublicAddress } from './walletGuards.js';

// ============================================================================
// fetchWalletReadOnlySnapshot
// ============================================================================
// Read-only public RPC fetcher for address-only wallet profiles.
// Calls ONLY: getAccountInfo, getBalance, getTokenAccountsByOwner.
// No signing. No sending. No protocol APIs. No automatic polling.
// ============================================================================

export interface FetchWalletReadOnlySnapshotInput {
  walletProfile: SolanaWalletProfile;
  endpoint: SolanaRpcEndpointConfig;
  commitment?: SolanaRpcCommitment;
}

function lamportsToSolUi(lamports: number): string {
  // Avoid floating-point weirdness by using integer math where possible.
  const whole = Math.floor(lamports / 1_000_000_000);
  const fraction = lamports % 1_000_000_000;
  const fractionStr = fraction.toString().padStart(9, '0');
  // Trim trailing zeros
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  if (trimmedFraction === '') return `${whole}`;
  return `${whole}.${trimmedFraction}`;
}

export async function fetchWalletReadOnlySnapshot(
  input: FetchWalletReadOnlySnapshotInput
): Promise<SolanaWalletSnapshotResult> {
  const { walletProfile, endpoint, commitment } = input;

  if (!walletProfile.publicAddress) {
    return {
      status: 'error',
      error: 'Wallet profile has no public address. Add an address to fetch read-only data.',
    };
  }

  const addressError = validateWalletPublicAddress(walletProfile.publicAddress);
  if (addressError) {
    return {
      status: 'error',
      error: `Invalid public address: ${addressError}`,
    };
  }

  const address = walletProfile.publicAddress.trim();

  try {
    const [accountResult, balanceResult, tokenAccounts] = await Promise.all([
      getAccountInfoReadOnly(endpoint, address, commitment).catch((err) => {
        return {
          address,
          network: endpoint.network,
          exists: false,
          fetchedAt: Date.now(),
          error: err instanceof Error ? err.message : String(err),
        } as const;
      }),
      getBalanceReadOnly(endpoint, address, commitment).catch((err) => {
        return {
          lamports: 0,
          fetchedAt: Date.now(),
          error: err instanceof Error ? err.message : String(err),
        } as const;
      }),
      getTokenAccountsByOwnerReadOnly(endpoint, address, commitment).catch(() => []),
    ]);

    const fetchedAt = Date.now();
    const warnings: string[] = [];

    if ('error' in accountResult && accountResult.error) {
      warnings.push(`Account lookup warning: ${accountResult.error}`);
    }
    if ('error' in balanceResult && balanceResult.error) {
      warnings.push(`Balance lookup warning: ${balanceResult.error}`);
    }

    const tokenAccountCount = tokenAccounts.length;
    const tokenAccountsPreview = tokenAccounts.slice(0, 10).map((t) => ({
      pubkey: t.pubkey,
      mint: t.mint,
      owner: address,
      amountRaw: t.amount,
      amountUi: t.uiAmountString,
      decimals: t.decimals,
      uiAmountString: t.uiAmountString,
    }));

    if (tokenAccounts.length > 10) {
      warnings.push(`Token account list truncated to 10 entries. Total: ${tokenAccounts.length}.`);
    }

    const snapshot = {
      walletProfileId: walletProfile.id,
      address,
      network: endpoint.network,
      accountExists: accountResult.exists,
      owner: 'owner' in accountResult ? accountResult.owner : undefined,
      executable: 'executable' in accountResult ? accountResult.executable : undefined,
      dataLength: 'dataLength' in accountResult ? accountResult.dataLength : undefined,
      solBalanceLamports: balanceResult.lamports.toString(),
      solBalanceUi: lamportsToSolUi(balanceResult.lamports),
      tokenAccountCount,
      tokenAccountsPreview,
      fetchedAt,
      source: 'rpc_read_only' as const,
      safetyNotes: SOLANA_WALLET_READ_ONLY_SAFETY_NOTES,
      warnings,
    };

    return {
      status: 'ready',
      snapshot,
      fetchedAt,
    };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error fetching wallet snapshot.',
      fetchedAt: Date.now(),
    };
  }
}
