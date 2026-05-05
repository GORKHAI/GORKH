import {
  type SolanaPrivateWorkflowDraft,
  type SolanaPrivateRoutePlanPreview,
  type SolanaPrivateRouteKind,
} from '@gorkh/shared';

function buildPlannedSteps(route: SolanaPrivateRouteKind): string[] {
  switch (route) {
    case 'umbra_planned':
      return [
        'Review recipient and amount metadata for correctness.',
        'Future: connect wallet to GORKH.',
        'Future: initialize Umbra-compatible private workflow if SDK becomes available.',
        'Future: run GORKH Shield review before any signing.',
        'Require manual human approval.',
      ];
    case 'cloak_planned':
      return [
        'Review real-world payment context and compliance requirements.',
        'Future: prepare Cloak private payment via SDK/API if available.',
        'Future: run GORKH Shield review.',
        'Require manual human approval.',
      ];
    case 'token_2022_confidential_transfer_planned':
      return [
        'Future: verify mint supports Confidential Transfer extension via read-only check.',
        'Future: configure confidential token accounts if needed.',
        'Future: prepare confidential transfer instruction.',
        'Explain limitation: public accounts remain visible; amounts/balances may be confidential.',
        'Require manual human approval.',
      ];
    case 'light_protocol_research':
      return [
        'Review whether ZK compression is relevant to this payment.',
        'Future: inspect compressed account/payment support.',
        'Treat as research-only in Phase 9B.',
        'Require manual human approval.',
      ];
    case 'manual_privacy_review_only':
      return [
        'Provide privacy checklist and risk notes only.',
        'No route-specific automation or SDK integration.',
        'Require manual human approval.',
      ];
    default:
      return ['Review privacy risks and require manual approval.'];
  }
}

function buildUnavailableCapabilities(route: SolanaPrivateRouteKind): string[] {
  const base = [
    'wallet_connection',
    'transaction_signing',
    'transaction_execution',
  ];

  if (route === 'umbra_planned' || route === 'cloak_planned') {
    base.push('umbra_api_call', 'cloak_api_call', 'note_secret_generation', 'stealth_address_generation');
  }

  if (route === 'token_2022_confidential_transfer_planned') {
    base.push('token_2022_transaction_construction', 'zk_proof_generation');
  }

  if (route === 'light_protocol_research') {
    base.push('light_protocol_call', 'zk_proof_generation');
  }

  return base;
}

function buildFutureRequiredInputs(route: SolanaPrivateRouteKind): string[] {
  switch (route) {
    case 'umbra_planned':
      return ['wallet_connection', 'umbra_sdk_availability', 'recipient_stealth_meta'];
    case 'cloak_planned':
      return ['wallet_connection', 'cloak_sdk_availability', 'compliance_review'];
    case 'token_2022_confidential_transfer_planned':
      return ['wallet_connection', 'confidential_transfer_extension_verification', 'token_account_setup'];
    case 'light_protocol_research':
      return ['wallet_connection', 'light_protocol_sdk_research', 'compressed_account_review'];
    default:
      return ['wallet_connection', 'manual_compliance_review'];
  }
}

export function createPrivateRoutePlanPreview(
  draft: SolanaPrivateWorkflowDraft,
  now: number = Date.now()
): SolanaPrivateRoutePlanPreview {
  const route = draft.route;
  const plannedSteps = buildPlannedSteps(route);
  const unavailableCapabilities = buildUnavailableCapabilities(route);
  const futureRequiredInputs = buildFutureRequiredInputs(route);

  const warnings: string[] = [];
  warnings.push('This plan is preview-only and cannot be executed in Phase 9B.');
  warnings.push('Wallet connection is not available.');

  if (route === 'umbra_planned' || route === 'cloak_planned') {
    warnings.push('Umbra/Cloak SDK is not integrated. No stealth addresses or notes are generated.');
  }

  if (route === 'token_2022_confidential_transfer_planned') {
    warnings.push('Token-2022 Confidential Transfer construction is disabled. No proofs are generated.');
  }

  if (route === 'light_protocol_research') {
    warnings.push('Light Protocol is research-only. No ZK compression or compressed transactions are created.');
  }

  return {
    id: `private-plan-${now}`,
    workflowDraftId: draft.id,
    route,
    network: draft.network,
    status: 'preview_only',
    plannedSteps,
    unavailableCapabilities,
    futureRequiredInputs,
    warnings,
    generatedAt: now,
    localOnly: true,
    safetyNote:
      'Preview only. No private/confidential transaction, proof, note, commitment, nullifier, or transfer was created.',
  };
}
