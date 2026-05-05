import type {
  SolanaRpcEndpointConfig,
  SolanaAddressLookupTableResolution,
  SolanaRpcCommitment,
} from '@gorkh/shared';
import { getMultipleAccountsReadOnly } from './solanaRpcClient.js';

// ============================================================================
// Address Lookup Table Resolution
// ============================================================================
// Fetches lookup table accounts and attempts to decode them.
// If decoding fails, returns honest error state. No faked resolution.
// ============================================================================

/**
 * Resolve address lookup table accounts from a decoded v0 transaction.
 *
 * Solana Address Lookup Table account format (simplified):
 * - discriminator: 1 byte (should be 1 for lookup table)
 * - last extended slot: u64 (8 bytes)
 * - last extended block height: u64 (8 bytes)
 * - authority: Option<Pubkey> (1 byte presence + 32 bytes if present)
 * - deactivated: bool (1 byte)
 * - addresses: vector of Pubkeys (each 32 bytes)
 *
 * In this phase, we attempt best-effort decoding. If it fails,
 * we return found=true with unresolved addresses and an error note.
 */
export async function resolveAddressLookupTables(
  endpoint: SolanaRpcEndpointConfig,
  lookups: {
    accountKey: string;
    writableIndexes: number[];
    readonlyIndexes: number[];
  }[],
  commitment?: SolanaRpcCommitment
): Promise<SolanaAddressLookupTableResolution[]> {
  if (lookups.length === 0) return [];

  const addresses = lookups.map((l) => l.accountKey);
  const accounts = await getMultipleAccountsReadOnly(endpoint, addresses, commitment);

  const fetchedAt = Date.now();

  return lookups.map((lookup, i) => {
    const account = accounts[i];
    const resolution: SolanaAddressLookupTableResolution = {
      lookupTableAddress: lookup.accountKey,
      network: endpoint.network,
      found: account?.exists ?? false,
      writableIndexes: lookup.writableIndexes,
      readonlyIndexes: lookup.readonlyIndexes,
      resolvedWritableAddresses: [],
      resolvedReadonlyAddresses: [],
      fetchedAt,
    };

    if (!account || !account.exists || !account.dataLength) {
      resolution.error = 'Lookup table account not found or has no data.';
      return resolution;
    }

    // Attempt to decode the lookup table account data.
    // We do not have the raw base64 here because getMultipleAccounts returned
    // parsed fields. For a robust implementation we would need the raw base64.
    // In Phase 3, we return an honest unsupported state for ALT decoding
    // because the RPC client does not currently return raw base64 back to this layer.
    resolution.error =
      'Address lookup table account found but raw data decoding is not yet implemented in Phase 3. The table account exists; addresses will be resolved in a future phase.';
    return resolution;
  });
}
