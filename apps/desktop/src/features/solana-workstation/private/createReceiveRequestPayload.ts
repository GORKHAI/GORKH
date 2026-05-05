import {
  type SolanaPrivateRouteKind,
  type SolanaPrivateReceiveRequest,
} from '@gorkh/shared';
import { validateRecipientAddressIfPresent } from './privateGuards.js';

export interface CreateReceiveRequestInput {
  network: 'localnet' | 'devnet' | 'mainnet-beta';
  route: SolanaPrivateRouteKind;
  label: string;
  requestedAssetSymbol: string;
  requestedAmountUi?: string;
  recipientPublicAddress?: string;
  purpose?: string;
}

export function createReceiveRequestPayload(
  input: CreateReceiveRequestInput,
  now: number = Date.now()
): SolanaPrivateReceiveRequest {
  if (input.recipientPublicAddress) {
    const error = validateRecipientAddressIfPresent(input.recipientPublicAddress);
    if (error) {
      throw new Error(error);
    }
  }

  const payload = {
    version: 'gorkh-private-receive-request-v1',
    route: input.route,
    label: input.label.trim(),
    requestedAssetSymbol: input.requestedAssetSymbol.trim(),
    requestedAmountUi: input.requestedAmountUi?.trim() || undefined,
    recipientPublicAddress: input.recipientPublicAddress?.trim() || undefined,
    purpose: input.purpose?.trim(),
    network: input.network,
    createdAt: now,
    localOnly: true,
    warning:
      'This is not a private address, stealth address, note, commitment, nullifier, or payment instruction.',
  };

  return {
    id: `private-receive-${now}`,
    network: input.network,
    route: input.route,
    label: input.label.trim(),
    requestedAssetSymbol: input.requestedAssetSymbol.trim(),
    requestedAmountUi: input.requestedAmountUi?.trim() || undefined,
    recipientPublicAddress: input.recipientPublicAddress?.trim() || undefined,
    purpose: input.purpose?.trim(),
    expiresAt: undefined,
    payloadVersion: 'gorkh-private-receive-request-v1',
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
