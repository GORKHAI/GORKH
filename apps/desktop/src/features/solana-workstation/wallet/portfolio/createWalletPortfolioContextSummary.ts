import {
  type SolanaWalletPortfolioSummary,
  type SolanaWalletPortfolioContextSummary,
  SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
} from '@gorkh/shared';

// ----------------------------------------------------------------------------
// createWalletPortfolioContextSummary
// ----------------------------------------------------------------------------
// Generates a markdown portfolio context summary for LLM/agent grounding.
// No prices. No raw signatures. No secrets.
// ----------------------------------------------------------------------------

export interface CreateWalletPortfolioContextSummaryInput {
  portfolio: SolanaWalletPortfolioSummary;
  walletProfileLabel?: string;
}

export function createWalletPortfolioContextSummary(
  input: CreateWalletPortfolioContextSummaryInput
): SolanaWalletPortfolioContextSummary {
  const { portfolio, walletProfileLabel } = input;
  const now = new Date().toISOString();

  const lines: string[] = [];
  lines.push('# GORKH Wallet Portfolio');
  lines.push('');
  lines.push('> **Read-only portfolio.** No prices, swaps, trades, or fund movement.');
  lines.push('');

  lines.push('## Overview');
  if (walletProfileLabel) {
    lines.push(`- **Profile:** ${walletProfileLabel}`);
  }
  lines.push(`- **Address:** ${portfolio.publicAddress}`);
  lines.push(`- **Network:** ${portfolio.network}`);
  if (portfolio.solBalanceUi !== undefined) {
    lines.push(`- **SOL Balance:** ${portfolio.solBalanceUi} SOL`);
  }
  lines.push(`- **Token Holdings:** ${portfolio.tokenHoldingCount}`);
  lines.push(`- **Token Accounts:** ${portfolio.tokenAccountCount}`);
  if (portfolio.ownershipProofStatus) {
    lines.push(`- **Ownership:** ${portfolio.ownershipProofStatus}`);
  }
  if (portfolio.snapshotFetchedAt) {
    lines.push(`- **Snapshot Fetched:** ${new Date(portfolio.snapshotFetchedAt).toISOString()}`);
  }
  lines.push(`- **Generated:** ${now}`);
  lines.push('');

  if (portfolio.holdings.length > 0) {
    lines.push('## Token Holdings');
    for (const h of portfolio.holdings) {
      const displayLabel = h.symbol ?? h.label ?? `${h.mint.slice(0, 12)}…`;
      lines.push(`### ${displayLabel}`);
      lines.push(`- **Mint:** ${h.mint}`);
      lines.push(`- **Amount:** ${h.amountUi ?? h.amountRaw ?? '—'}`);
      lines.push(`- **Token Accounts:** ${h.tokenAccountCount}`);
      if (h.decimals !== undefined) {
        lines.push(`- **Decimals:** ${h.decimals}`);
      }
      if (h.warnings.length > 0) {
        lines.push(`- **Warnings:** ${h.warnings.join('; ')}`);
      }
      lines.push('');
    }
  }

  if (portfolio.warnings.length > 0) {
    lines.push('## Portfolio Warnings');
    for (const w of portfolio.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  lines.push('## Safety Notes');
  for (const note of SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  return {
    generatedAt: now,
    walletProfileLabel,
    publicAddress: portfolio.publicAddress,
    network: portfolio.network,
    tokenHoldingCount: portfolio.tokenHoldingCount,
    tokenAccountCount: portfolio.tokenAccountCount,
    markdown: lines.join('\n'),
    redactionsApplied: ['signatures', 'private_keys', 'seed_phrases'],
    safetyNotes: SOLANA_WALLET_PORTFOLIO_PHASE_16_SAFETY_NOTES,
  };
}
