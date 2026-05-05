import {
  SolanaMarketsItemKind,
  SOLANA_MARKETS_PHASE_8_SAFETY_NOTES,
  type SolanaMarketsWatchlistItem,
  type SolanaMarketsAccountSnapshot,
  type SolanaMarketsTokenMintSnapshot,
  type SolanaMarketsWalletSnapshot,
  type SolanaMarketsItemAnalysis,
} from '@gorkh/shared';
import { classifyMarketsAddress } from './classifyMarketsAddress.js';
import { analyzeTokenRiskSignals } from './analyzeTokenRiskSignals.js';
import { analyzeWalletRiskSignals } from './analyzeWalletRiskSignals.js';

export interface AnalyzeMarketsItemInput {
  item: SolanaMarketsWatchlistItem;
  accountSnapshot: SolanaMarketsAccountSnapshot;
  tokenMintSnapshot?: SolanaMarketsTokenMintSnapshot;
  walletSnapshot?: SolanaMarketsWalletSnapshot;
  isCustomEndpoint: boolean;
  isMainnet: boolean;
}

export function analyzeMarketsItem(input: AnalyzeMarketsItemInput): SolanaMarketsItemAnalysis {
  const { item, accountSnapshot, tokenMintSnapshot, walletSnapshot, isCustomEndpoint, isMainnet } =
    input;

  const kind = classifyMarketsAddress(
    item.address,
    accountSnapshot,
    tokenMintSnapshot?.exists ?? false
  );

  const riskSignals: SolanaMarketsItemAnalysis['riskSignals'] = [];
  const dataSources: string[] = ['getAccountInfo'];

  if (tokenMintSnapshot?.exists) {
    riskSignals.push(...analyzeTokenRiskSignals(tokenMintSnapshot, isCustomEndpoint, isMainnet));
    dataSources.push('getTokenSupply', 'getTokenLargestAccounts');
  }

  if (walletSnapshot?.exists) {
    riskSignals.push(...analyzeWalletRiskSignals(walletSnapshot, isCustomEndpoint, isMainnet));
    dataSources.push('getBalance', 'getTokenAccountsByOwner');
  }

  if (accountSnapshot.executable && kind === SolanaMarketsItemKind.PROGRAM) {
    riskSignals.push({
      id: 'executable_program',
      kind: 'executable_program',
      level: 'low',
      title: 'Executable program',
      description: 'This address is an executable program account. It is not a wallet or token mint.',
      recommendation: 'Verify the program ID against known program registries before interaction.',
      confidence: 'high',
    });
  }

  if (!accountSnapshot.exists) {
    riskSignals.push({
      id: 'account_not_found',
      kind: 'account_not_found',
      level: 'medium',
      title: 'Account not found',
      description: 'The address was not found on the selected network.',
      recommendation: 'Verify the address and network.',
      confidence: 'high',
    });
  }

  const summaryParts: string[] = [];
  summaryParts.push(`Analyzed ${item.address} on ${item.network}.`);
  summaryParts.push(`Classification: ${kind}.`);
  summaryParts.push(`Risk signals: ${riskSignals.length}.`);
  if (tokenMintSnapshot?.exists) {
    summaryParts.push(
      `Token mint with supply ${tokenMintSnapshot.supplyUi ?? 'unknown'} and ${tokenMintSnapshot.decimals ?? '?'} decimals.`
    );
  }
  if (walletSnapshot?.exists) {
    summaryParts.push(
      `Wallet with ${walletSnapshot.solBalanceUi ?? '?'} SOL and ${walletSnapshot.tokenAccountCount ?? 0} token accounts.`
    );
  }

  return {
    item: { ...item, kind },
    accountSnapshot,
    tokenMintSnapshot: tokenMintSnapshot?.exists ? tokenMintSnapshot : undefined,
    walletSnapshot: walletSnapshot?.exists ? walletSnapshot : undefined,
    riskSignals,
    summary: summaryParts.join(' '),
    analyzedAt: Date.now(),
    dataSources,
    safetyNotes: [
      ...SOLANA_MARKETS_PHASE_8_SAFETY_NOTES,
      'This analysis is based on read-only RPC data and static heuristics only.',
      'No price data, external API data, or protocol-specific intelligence is included in Phase 8.',
    ],
  };
}
