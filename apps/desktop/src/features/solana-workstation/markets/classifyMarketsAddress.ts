import { SolanaMarketsItemKind, type SolanaMarketsAccountSnapshot } from '@gorkh/shared';

export function classifyMarketsAddress(
  _address: string,
  accountSnapshot?: SolanaMarketsAccountSnapshot,
  hasMintFields?: boolean
): SolanaMarketsItemKind {
  if (!accountSnapshot) {
    return SolanaMarketsItemKind.UNKNOWN;
  }

  if (!accountSnapshot.exists) {
    return SolanaMarketsItemKind.UNKNOWN;
  }

  if (accountSnapshot.executable) {
    return SolanaMarketsItemKind.PROGRAM;
  }

  if (hasMintFields) {
    return SolanaMarketsItemKind.TOKEN_MINT;
  }

  // If owner is System Program and account is non-executable with lamports, treat as wallet-like
  if (
    accountSnapshot.owner === '11111111111111111111111111111111' &&
    !accountSnapshot.executable &&
    (accountSnapshot.lamports ?? 0) > 0
  ) {
    return SolanaMarketsItemKind.WALLET;
  }

  // If account has a known token/account program owner, treat as pool_or_account
  if (
    accountSnapshot.owner &&
    (
      accountSnapshot.owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' ||
      accountSnapshot.owner === 'TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q' ||
      accountSnapshot.owner === 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    )
  ) {
    return SolanaMarketsItemKind.POOL_OR_ACCOUNT;
  }

  // If account has data but we couldn't classify it more specifically
  if ((accountSnapshot.dataLength ?? 0) > 0) {
    return SolanaMarketsItemKind.POOL_OR_ACCOUNT;
  }

  // Default to wallet for accounts with SOL but no data
  if ((accountSnapshot.lamports ?? 0) > 0 && (accountSnapshot.dataLength ?? 0) === 0) {
    return SolanaMarketsItemKind.WALLET;
  }

  return SolanaMarketsItemKind.UNKNOWN;
}
