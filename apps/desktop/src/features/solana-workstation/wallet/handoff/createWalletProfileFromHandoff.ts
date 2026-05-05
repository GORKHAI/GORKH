import {
  SolanaWalletProfileStatus,
  SolanaWalletRouteKind,
} from '@gorkh/shared';
import type { SolanaWalletHandoffResult, SolanaWalletProfile } from '@gorkh/shared';

export function createWalletProfileFromHandoff(
  result: SolanaWalletHandoffResult
): SolanaWalletProfile {
  const now = Date.now();
  const providerLabel =
    result.provider.charAt(0).toUpperCase() + result.provider.slice(1);

  return {
    id: crypto.randomUUID(),
    label: `${providerLabel} Wallet`,
    publicAddress: result.publicAddress,
    network: result.network,
    status: SolanaWalletProfileStatus.ADDRESS_ONLY,
    preferredPrivateRoute: SolanaWalletRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    tags: ['browser_handoff', result.provider, 'phase_14'],
    notes: `Connected via browser wallet handoff (${result.provider}) at ${new Date(result.connectedAt).toISOString()}.`,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: [
      ...result.safetyNotes,
      'Created from browser wallet handoff. Only public address was transferred.',
    ],
  };
}
