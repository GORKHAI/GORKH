import {
  type SolanaWalletProfile,
  type SolanaWalletReadOnlySnapshot,
  type SolanaWalletPortfolioSummary,
  type SolanaWalletPortfolioTokenHolding,
  SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// createWalletPortfolioSummary
// ----------------------------------------------------------------------------
// Derives a read-only portfolio summary from an existing wallet profile and
// its latest RPC snapshot. Groups token accounts by mint. No prices. No RPC.
// ----------------------------------------------------------------------------

export interface CreateWalletPortfolioSummaryInput {
  walletProfile: SolanaWalletProfile;
  snapshot: SolanaWalletReadOnlySnapshot | null;
  ownershipProofStatus?: string;
  ownershipVerifiedAt?: number;
}

export function createWalletPortfolioSummary(
  input: CreateWalletPortfolioSummaryInput
): SolanaWalletPortfolioSummary {
  const { walletProfile, snapshot, ownershipProofStatus, ownershipVerifiedAt } = input;
  const warnings: string[] = [];

  if (!snapshot) {
    return {
      walletProfileId: walletProfile.id,
      publicAddress: walletProfile.publicAddress ?? '',
      network: walletProfile.network,
      solBalanceLamports: undefined,
      solBalanceUi: undefined,
      tokenHoldingCount: 0,
      tokenAccountCount: 0,
      holdings: [],
      ownershipProofStatus,
      ownershipVerifiedAt,
      snapshotFetchedAt: undefined,
      generatedAt: Date.now(),
      safetyNotes: [
        ...SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
        'No snapshot available. Fetch a read-only snapshot to populate portfolio data.',
      ],
      warnings: [],
    };
  }

  if (!walletProfile.publicAddress) {
    warnings.push('Wallet profile has no public address.');
  }

  // Group token accounts by mint
  const byMint = new Map<string, SolanaWalletPortfolioTokenHolding>();

  for (const account of snapshot.tokenAccountsPreview) {
    const existing = byMint.get(account.mint);
    if (existing) {
      existing.tokenAccountPubkeys.push(account.pubkey);
      existing.tokenAccountCount += 1;

      // Sum raw amounts if both are present
      if (existing.amountRaw && account.amountRaw) {
        try {
          const sum = BigInt(existing.amountRaw) + BigInt(account.amountRaw);
          existing.amountRaw = sum.toString();
        } catch {
          existing.warnings.push('Unable to sum raw amounts for this mint.');
        }
      } else if (account.amountRaw) {
        existing.amountRaw = account.amountRaw;
      }

      // Decimals mismatch guard
      const existingDecimals = existing.decimals;
      const accountDecimals = account.decimals;
      const decimalsMismatched =
        existingDecimals !== undefined && accountDecimals !== undefined && existingDecimals !== accountDecimals;
      if (decimalsMismatched) {
        existing.warnings.push(
          `Decimals mismatch across token accounts: ${existingDecimals} vs ${accountDecimals}. UI amount may be unreliable.`
        );
        existing.decimals = undefined;
        existing.uiAmountString = undefined;
        existing.amountUi = undefined;
      } else if (existingDecimals === undefined && accountDecimals !== undefined) {
        existing.decimals = accountDecimals;
      }

      // Only update UI amount if decimals are consistent
      if (!decimalsMismatched) {
        if (existing.uiAmountString && account.uiAmountString && existing.uiAmountString !== account.uiAmountString) {
          // Different accounts have different UI amounts — clear to avoid misleading sum
          existing.uiAmountString = undefined;
          existing.amountUi = undefined;
        } else if (!existing.uiAmountString && account.uiAmountString) {
          existing.uiAmountString = account.uiAmountString;
          existing.amountUi = account.uiAmountString;
        }
      }
    } else {
      byMint.set(account.mint, {
        mint: account.mint,
        tokenAccountPubkeys: [account.pubkey],
        tokenAccountCount: 1,
        amountRaw: account.amountRaw,
        amountUi: account.uiAmountString ?? account.amountRaw,
        decimals: account.decimals,
        uiAmountString: account.uiAmountString,
        symbol: undefined,
        label: undefined,
        source: 'token_accounts_preview',
        warnings: [],
      });
    }
  }

  const holdings = Array.from(byMint.values());

  if (holdings.length === 0 && (snapshot.tokenAccountCount ?? 0) > 0) {
    warnings.push('Token account count reported but no token account preview data available.');
  }

  return {
    walletProfileId: walletProfile.id,
    publicAddress: walletProfile.publicAddress ?? snapshot.address,
    network: snapshot.network,
    solBalanceLamports: snapshot.solBalanceLamports,
    solBalanceUi: snapshot.solBalanceUi,
    tokenHoldingCount: holdings.length,
    tokenAccountCount: snapshot.tokenAccountCount ?? 0,
    holdings,
    ownershipProofStatus,
    ownershipVerifiedAt,
    snapshotFetchedAt: snapshot.fetchedAt,
    generatedAt: Date.now(),
    safetyNotes: SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
    warnings: [...snapshot.warnings, ...warnings],
  };
}
