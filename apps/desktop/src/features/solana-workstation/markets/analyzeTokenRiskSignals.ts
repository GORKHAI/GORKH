import {
  WorkstationRiskLevel,
  SolanaMarketsRiskSignalKind,
  type SolanaMarketsTokenMintSnapshot,
  type SolanaMarketsRiskSignal,
} from '@gorkh/shared';

export function analyzeTokenRiskSignals(
  snapshot: SolanaMarketsTokenMintSnapshot,
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
      description: 'The provided address was not found on the selected network. It may be invalid or the network may be wrong.',
      recommendation: 'Verify the address and network selection.',
      confidence: 'high',
    });
    return signals;
  }

  if (snapshot.mintAuthorityPresent) {
    signals.push({
      id: 'mint_authority_present',
      kind: SolanaMarketsRiskSignalKind.MINT_AUTHORITY_PRESENT,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Mint authority is present',
      description: 'The token mint retains a mint authority. Additional supply can be minted, which may dilute existing holders.',
      recommendation: 'Review whether the mint authority is controlled by a trusted multisig or governance program.',
      confidence: 'high',
    });
  }

  if (snapshot.freezeAuthorityPresent) {
    signals.push({
      id: 'freeze_authority_present',
      kind: SolanaMarketsRiskSignalKind.FREEZE_AUTHORITY_PRESENT,
      level: WorkstationRiskLevel.HIGH,
      title: 'Freeze authority is present',
      description: 'The token mint retains a freeze authority. Token accounts can be frozen, potentially locking user funds.',
      recommendation: 'Exercise caution. Verify the freeze authority is controlled by a trusted party.',
      confidence: 'high',
    });
  }

  if (snapshot.isInitialized === false) {
    signals.push({
      id: 'uninitialized_mint',
      kind: SolanaMarketsRiskSignalKind.UNINITIALIZED_MINT,
      level: WorkstationRiskLevel.HIGH,
      title: 'Uninitialized mint',
      description: 'The token mint account exists but is not initialized. This is unusual and may indicate an error or test account.',
      recommendation: 'Do not interact with uninitialized token mints.',
      confidence: 'high',
    });
  }

  if (snapshot.tokenProgram === 'token_2022') {
    signals.push({
      id: 'token_2022_requires_review',
      kind: SolanaMarketsRiskSignalKind.TOKEN_2022_REQUIRES_REVIEW,
      level: WorkstationRiskLevel.LOW,
      title: 'Token-2022 mint',
      description: 'This is a Token-2022 mint. Token-2022 supports additional features such as transfer hooks and confidential transfers, which require extra review.',
      recommendation: 'Review Token-2022-specific features before any future interaction.',
      confidence: 'medium',
    });
  }

  if (snapshot.largestAccounts === undefined || snapshot.largestAccounts.length === 0) {
    signals.push({
      id: 'largest_accounts_unavailable',
      kind: SolanaMarketsRiskSignalKind.LARGEST_ACCOUNTS_UNAVAILABLE,
      level: WorkstationRiskLevel.LOW,
      title: 'Largest accounts unavailable',
      description: 'Could not fetch the largest token accounts. Holder concentration analysis is unavailable.',
      recommendation: 'This is informational only. No action needed for read-only review.',
      confidence: 'low',
    });
  } else if (snapshot.supplyRaw && snapshot.largestAccounts.length > 0) {
    // Simple heuristic: if the top account holds >50% of supply, flag possible concentration
    try {
      const supply = BigInt(snapshot.supplyRaw);
      const topAmount = BigInt(snapshot.largestAccounts[0].amountRaw);
      if (supply > 0n && topAmount * 100n / supply > 50n) {
        signals.push({
          id: 'high_holder_concentration_possible',
          kind: SolanaMarketsRiskSignalKind.HIGH_HOLDER_CONCENTRATION_POSSIBLE,
          level: WorkstationRiskLevel.HIGH,
          title: 'Possible high holder concentration',
          description: 'The largest token account holds more than 50% of the total supply. This indicates possible high concentration risk.',
          recommendation: 'Review the largest holder address and consider concentration risk before any future interaction.',
          confidence: 'medium',
        });
      }
    } catch {
      // ignore bigint parse errors
    }
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

  return signals;
}
