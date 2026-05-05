import {
  SolanaWalletActionStatus,
  WorkstationRiskLevel,
  type SolanaWalletSendDraft,
  type SolanaWalletProfile,
  type SolanaWalletRouteKind,
  type SolanaWalletAssetKind,
  type SolanaRpcNetwork,
} from '@gorkh/shared';
import { assertSafeWalletRoute } from './walletGuards.js';

export interface CreateWalletSendDraftInput {
  walletProfile: SolanaWalletProfile;
  route: SolanaWalletRouteKind;
  assetSymbol: string;
  assetKind: SolanaWalletAssetKind;
  amountUi: string;
  recipientAddressOrLabel: string;
  memoPolicy?: 'no_memo' | 'local_note_only';
}

function computeSendDraftRiskLevel(
  network: SolanaRpcNetwork,
  _route: SolanaWalletRouteKind
): WorkstationRiskLevel {
  if (network === 'mainnet-beta') return WorkstationRiskLevel.HIGH;
  return WorkstationRiskLevel.MEDIUM;
}

function buildBlockedReasons(route: SolanaWalletRouteKind): string[] {
  const reasons: string[] = [];
  reasons.push('Wallet connection is disabled in GORKH Wallet v0.1.');
  reasons.push('Signing and transaction execution are disabled in GORKH Wallet v0.1.');
  reasons.push(`Privacy route "${route}" integration is disabled in Phase 10.`);

  if (route === 'umbra_planned' || route === 'cloak_planned') {
    reasons.push('Umbra/Cloak SDK and API calls are disabled in Phase 10.');
    reasons.push('Note, commitment, nullifier, and stealth address generation are disabled.');
  }

  if (route === 'token_2022_confidential_transfer_planned') {
    reasons.push('Token-2022 Confidential Transfer transaction construction is disabled in Phase 10.');
    reasons.push('Confidential token account setup and proof generation are disabled.');
  }

  return reasons;
}

export function createWalletSendDraft(
  input: CreateWalletSendDraftInput,
  now: number = Date.now()
): SolanaWalletSendDraft {
  assertSafeWalletRoute(input.route);

  const blockedReasons = buildBlockedReasons(input.route);
  const requiredManualReviews = [
    'Manual privacy review required',
    'Manual human approval required before any future signing or execution',
  ];

  return {
    id: `wallet-send-${now}`,
    walletProfileId: input.walletProfile.id,
    route: input.route,
    network: input.walletProfile.network,
    assetSymbol: input.assetSymbol.trim(),
    assetKind: input.assetKind,
    amountUi: input.amountUi.trim(),
    recipientAddressOrLabel: input.recipientAddressOrLabel.trim(),
    memoPolicy: input.memoPolicy ?? 'no_memo',
    status: SolanaWalletActionStatus.BLOCKED_EXECUTION_DISABLED,
    riskLevel: computeSendDraftRiskLevel(input.walletProfile.network, input.route),
    blockedReasons,
    requiredManualReviews,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: [
      'This is a local send draft only.',
      'No private transfer, confidential transfer, proof, note, commitment, nullifier, or stealth address is created.',
      'No wallet connection, signing, or transaction execution is available.',
    ],
  };
}
