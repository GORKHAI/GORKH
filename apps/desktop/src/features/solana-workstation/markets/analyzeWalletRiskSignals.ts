import {
  WorkstationRiskLevel,
  SolanaMarketsRiskSignalKind,
  type SolanaMarketsWalletSnapshot,
  type SolanaMarketsRiskSignal,
} from '@gorkh/shared';

export function analyzeWalletRiskSignals(
  snapshot: SolanaMarketsWalletSnapshot,
  isCustomEndpoint: boolean,
  isMainnet: boolean
): SolanaMarketsRiskSignal[] {
  const signals: SolanaMarketsRiskSignal[] = [];

  if (!snapshot.exists) {
    signals.push({
      id: 'account_not_found',
      kind: SolanaMarketsRiskSignalKind.ACCOUNT_NOT_FOUND,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Account not found',
      description: 'The provided wallet address was not found on the selected network. It may be invalid or the network may be wrong.',
      recommendation: 'Verify the address and network selection.',
      confidence: 'high',
    });
    return signals;
  }

  if (isCustomEndpoint) {
    signals.push({
      id: 'custom_rpc_privacy_warning',
      kind: SolanaMarketsRiskSignalKind.CUSTOM_RPC_PRIVACY_WARNING,
      level: WorkstationRiskLevel.LOW,
      title: 'Custom RPC endpoint in use',
      description: 'You are using a custom RPC endpoint. The provider may observe your lookup requests.',
      recommendation: 'Use trusted public endpoints when possible.',
      confidence: 'high',
    });
  }

  if (isMainnet) {
    signals.push({
      id: 'mainnet_operational_caution',
      kind: SolanaMarketsRiskSignalKind.MAINNET_OPERATIONAL_CAUTION,
      level: WorkstationRiskLevel.LOW,
      title: 'Mainnet operational caution',
      description: 'You are reviewing mainnet-beta data. Any future actions would involve real funds.',
      recommendation: 'Double-check all addresses and data before any future on-chain action.',
      confidence: 'high',
    });
  }

  if ((snapshot.tokenAccountCount ?? 0) > 100) {
    signals.push({
      id: 'many_token_accounts',
      kind: SolanaMarketsRiskSignalKind.UNKNOWN,
      level: WorkstationRiskLevel.LOW,
      title: 'Many token accounts',
      description: `This wallet holds ${snapshot.tokenAccountCount} token accounts. This is informational only.`,
      recommendation: 'No action needed for read-only review.',
      confidence: 'low',
    });
  }

  return signals;
}
