import {
  SolanaPrivateWorkflowStatus,
  WorkstationRiskLevel,
  type SolanaPrivateWorkflowKind,
  type SolanaPrivateRouteKind,
  type SolanaPrivateAssetKind,
  type SolanaPrivateWorkflowDraft,
  type SolanaPrivateRecipient,
  type SolanaPrivatePaymentLine,
} from '@gorkh/shared';
import { assertSafePrivateRoute } from './privateGuards.js';

export interface CreatePrivateWorkflowDraftInput {
  kind: SolanaPrivateWorkflowKind;
  route: SolanaPrivateRouteKind;
  title: string;
  network: 'localnet' | 'devnet' | 'mainnet-beta';
  assetSymbol: string;
  assetKind: SolanaPrivateAssetKind;
  amountUi?: string;
  recipient?: SolanaPrivateRecipient;
  paymentLines?: SolanaPrivatePaymentLine[];
  purpose?: string;
  notes?: string;
}

function computeRiskLevel(input: CreatePrivateWorkflowDraftInput): WorkstationRiskLevel {
  if (input.network === 'mainnet-beta') return WorkstationRiskLevel.HIGH;
  if (
    input.kind === 'private_payment_plan' ||
    input.kind === 'private_payroll_batch' ||
    input.kind === 'private_invoice_payment'
  ) {
    return WorkstationRiskLevel.MEDIUM;
  }
  if (input.kind === 'confidential_token_transfer_plan') {
    return WorkstationRiskLevel.MEDIUM;
  }
  return WorkstationRiskLevel.LOW;
}

function buildBlockedReasons(input: CreatePrivateWorkflowDraftInput): string[] {
  const reasons: string[] = [];

  reasons.push('Wallet connection is disabled in Private / Confidential v0.1.');
  reasons.push('Signing and transaction execution are disabled in Private / Confidential v0.1.');
  reasons.push(`Privacy route "${input.route}" integration is disabled in Phase 9B.`);

  if (input.route === 'umbra_planned' || input.route === 'cloak_planned') {
    reasons.push('Umbra/Cloak SDK and API calls are disabled in Phase 9B.');
    reasons.push('Note, commitment, nullifier, and stealth address generation are disabled.');
  }

  if (input.route === 'token_2022_confidential_transfer_planned') {
    reasons.push('Token-2022 Confidential Transfer transaction construction is disabled in Phase 9B.');
    reasons.push('Confidential token account setup and proof generation are disabled.');
  }

  if (input.route === 'light_protocol_research') {
    reasons.push('Light Protocol is research-only in Phase 9B.');
    reasons.push('ZK compression and compressed transaction construction are disabled.');
  }

  if (!input.recipient && input.kind !== 'privacy_review' && input.kind !== 'custom') {
    reasons.push('No recipient is configured.');
  }

  return reasons;
}

export function createPrivateWorkflowDraft(
  input: CreatePrivateWorkflowDraftInput,
  now: number = Date.now()
): SolanaPrivateWorkflowDraft {
  assertSafePrivateRoute(input.route);

  const blockedReasons = buildBlockedReasons(input);
  const requiredManualReviews = [
    'Manual privacy review required',
    'Manual human approval required before any future transaction',
  ];

  const draft: SolanaPrivateWorkflowDraft = {
    id: `private-draft-${now}`,
    kind: input.kind,
    route: input.route,
    title: input.title.trim(),
    network: input.network,
    assetSymbol: input.assetSymbol.trim(),
    assetKind: input.assetKind,
    amountUi: input.amountUi?.trim() || undefined,
    recipient: input.recipient,
    paymentLines: input.paymentLines ?? [],
    purpose: input.purpose?.trim(),
    notes: input.notes?.trim(),
    status: SolanaPrivateWorkflowStatus.REQUIRES_MANUAL_REVIEW,
    riskLevel: computeRiskLevel(input),
    blockedReasons,
    requiredManualReviews,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: [
      'This is a local planning draft only.',
      'No private transfer, confidential transfer, proof, note, commitment, nullifier, or stealth address is created.',
      'No wallet connection, signing, or transaction execution is available.',
    ],
  };

  return draft;
}
