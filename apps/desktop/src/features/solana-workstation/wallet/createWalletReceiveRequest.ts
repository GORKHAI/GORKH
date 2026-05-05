import {
  type SolanaWalletReceiveRequest,
  type SolanaWalletProfile,
  type SolanaWalletRouteKind,
} from '@gorkh/shared';

export interface CreateWalletReceiveRequestInput {
  walletProfile: SolanaWalletProfile;
  route: SolanaWalletRouteKind;
  requestedAssetSymbol: string;
  requestedAmountUi?: string;
  label?: string;
  purpose?: string;
}

export function createWalletReceiveRequest(
  input: CreateWalletReceiveRequestInput,
  now: number = Date.now()
): SolanaWalletReceiveRequest {
  const payload = {
    version: 'gorkh-wallet-receive-request-v1',
    route: input.route,
    label: input.label?.trim() ?? input.walletProfile.label,
    requestedAssetSymbol: input.requestedAssetSymbol.trim(),
    requestedAmountUi: input.requestedAmountUi?.trim() || undefined,
    recipientPublicAddress: input.walletProfile.publicAddress,
    purpose: input.purpose?.trim(),
    network: input.walletProfile.network,
    createdAt: now,
    localOnly: true,
    warning:
      'This is not a private address, stealth address, note, commitment, nullifier, or payment instruction.',
  };

  return {
    id: `wallet-receive-${now}`,
    walletProfileId: input.walletProfile.id,
    route: input.route,
    network: input.walletProfile.network,
    requestedAssetSymbol: input.requestedAssetSymbol.trim(),
    requestedAmountUi: input.requestedAmountUi?.trim() || undefined,
    recipientPublicAddress: input.walletProfile.publicAddress,
    label: input.label?.trim() ?? input.walletProfile.label,
    purpose: input.purpose?.trim(),
    payloadVersion: 'gorkh-wallet-receive-request-v1',
    payloadJson: JSON.stringify(payload, null, 2),
    createdAt: now,
    localOnly: true,
    safetyNotes: [
      'This receive request is a local planning payload only.',
      'It is not a private address, stealth address, note, commitment, nullifier, or payment instruction.',
      'No wallet connection, signing, or execution is available.',
    ],
  };
}
