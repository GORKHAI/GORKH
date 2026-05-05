import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaPrivateWorkflowKind,
  SolanaPrivateRouteKind,
  SolanaPrivateWorkflowStatus,
  SolanaPrivateAssetKind,
  SolanaPrivatePrivacyRiskKind,
  SolanaPrivateWorkflowKindSchema,
  SolanaPrivateRouteKindSchema,
  SolanaPrivateWorkflowStatusSchema,
  SolanaPrivateAssetKindSchema,
  SolanaPrivatePrivacyRiskKindSchema,
  SolanaPrivateRecipientSchema,
  SolanaPrivatePaymentLineSchema,
  SolanaPrivateWorkflowDraftSchema,
  SolanaPrivatePrivacyRiskNoteSchema,
  SolanaPrivateRoutePlanPreviewSchema,
  SolanaPrivateReceiveRequestSchema,
  SolanaPrivateWorkspaceStateSchema,
  SolanaPrivateContextSummarySchema,
  SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES,
  SOLANA_PRIVATE_DENIED_CAPABILITIES,
  SOLANA_PRIVATE_ROUTE_LABELS,
  SOLANA_PRIVATE_WORKFLOW_LABELS,
  isSolanaPrivateWorkflowKind,
  isSolanaPrivateRouteKind,
  isDeniedPrivateCapability,
  getPrivateRouteLabel,
  getPrivateWorkflowLabel,
} from '../dist/index.js';

// ----------------------------------------------------------------------------
// Enum values
// ----------------------------------------------------------------------------

test('SolanaPrivateWorkflowKind contains all expected kinds', () => {
  assert.equal(SolanaPrivateWorkflowKind.CONFIDENTIAL_TOKEN_TRANSFER_PLAN, 'confidential_token_transfer_plan');
  assert.equal(SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN, 'private_payment_plan');
  assert.equal(SolanaPrivateWorkflowKind.PRIVATE_RECEIVE_REQUEST, 'private_receive_request');
  assert.equal(SolanaPrivateWorkflowKind.PRIVATE_PAYROLL_BATCH, 'private_payroll_batch');
  assert.equal(SolanaPrivateWorkflowKind.PRIVATE_INVOICE_PAYMENT, 'private_invoice_payment');
  assert.equal(SolanaPrivateWorkflowKind.PRIVACY_REVIEW, 'privacy_review');
  assert.equal(SolanaPrivateWorkflowKind.CUSTOM, 'custom');
});

test('SolanaPrivateRouteKind contains all expected routes', () => {
  assert.equal(SolanaPrivateRouteKind.UMBRA_PLANNED, 'umbra_planned');
  assert.equal(SolanaPrivateRouteKind.CLOAK_PLANNED, 'cloak_planned');
  assert.equal(SolanaPrivateRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED, 'token_2022_confidential_transfer_planned');
  assert.equal(SolanaPrivateRouteKind.LIGHT_PROTOCOL_RESEARCH, 'light_protocol_research');
  assert.equal(SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY, 'manual_privacy_review_only');
});

test('SolanaPrivateWorkflowStatus contains all expected statuses', () => {
  assert.equal(SolanaPrivateWorkflowStatus.DRAFT, 'draft');
  assert.equal(SolanaPrivateWorkflowStatus.PLAN_READY, 'plan_ready');
  assert.equal(SolanaPrivateWorkflowStatus.REQUIRES_MANUAL_REVIEW, 'requires_manual_review');
  assert.equal(SolanaPrivateWorkflowStatus.REJECTED_LOCAL, 'rejected_local');
  assert.equal(SolanaPrivateWorkflowStatus.ARCHIVED_LOCAL, 'archived_local');
});

test('SolanaPrivateAssetKind contains all expected asset kinds', () => {
  assert.equal(SolanaPrivateAssetKind.SOL, 'SOL');
  assert.equal(SolanaPrivateAssetKind.USDC, 'USDC');
  assert.equal(SolanaPrivateAssetKind.SPL_TOKEN, 'SPL_TOKEN');
  assert.equal(SolanaPrivateAssetKind.TOKEN_2022, 'TOKEN_2022');
  assert.equal(SolanaPrivateAssetKind.UNKNOWN, 'UNKNOWN');
});

test('SolanaPrivatePrivacyRiskKind contains all expected risk kinds', () => {
  assert.equal(SolanaPrivatePrivacyRiskKind.SOURCE_WALLET_LINKAGE, 'source_wallet_linkage');
  assert.equal(SolanaPrivatePrivacyRiskKind.RECIPIENT_REUSE, 'recipient_reuse');
  assert.equal(SolanaPrivatePrivacyRiskKind.AMOUNT_FINGERPRINTING, 'amount_fingerprinting');
  assert.equal(SolanaPrivatePrivacyRiskKind.TIMING_CORRELATION, 'timing_correlation');
  assert.equal(SolanaPrivatePrivacyRiskKind.PUBLIC_MEMO_LEAKAGE, 'public_memo_leakage');
  assert.equal(SolanaPrivatePrivacyRiskKind.PUBLIC_ADDRESS_VISIBILITY, 'public_address_visibility');
  assert.equal(SolanaPrivatePrivacyRiskKind.AMOUNT_ONLY_CONFIDENTIALITY_LIMITATION, 'amount_only_confidentiality_limitation');
  assert.equal(SolanaPrivatePrivacyRiskKind.SMALL_ANONYMITY_SET, 'small_anonymity_set');
  assert.equal(SolanaPrivatePrivacyRiskKind.MAINNET_OPERATIONAL_CAUTION, 'mainnet_operational_caution');
  assert.equal(SolanaPrivatePrivacyRiskKind.CUSTOM_RPC_PRIVACY_WARNING, 'custom_rpc_privacy_warning');
  assert.equal(SolanaPrivatePrivacyRiskKind.PLANNER_ONLY, 'planner_only');
  assert.equal(SolanaPrivatePrivacyRiskKind.UNKNOWN, 'unknown');
});

// ----------------------------------------------------------------------------
// Schema validation
// ----------------------------------------------------------------------------

test('SolanaPrivateRecipientSchema validates valid recipients', () => {
  const valid = {
    id: 'r1',
    label: 'Alice',
    publicAddress: '11111111111111111111111111111111',
    safetyNotes: [],
  };
  const result = SolanaPrivateRecipientSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivateRecipientSchema rejects missing id', () => {
  const invalid = { label: 'Alice', safetyNotes: [] };
  const result = SolanaPrivateRecipientSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test('SolanaPrivatePaymentLineSchema validates valid payment lines', () => {
  const valid = {
    id: 'pl1',
    recipientLabel: 'Alice',
    assetSymbol: 'USDC',
    assetKind: 'USDC',
    amountUi: '100.50',
    memoPolicy: 'no_memo',
    safetyNotes: [],
  };
  const result = SolanaPrivatePaymentLineSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivateWorkflowDraftSchema validates valid draft', () => {
  const valid = {
    id: 'draft-1',
    kind: 'private_payment_plan',
    route: 'umbra_planned',
    title: 'Test Draft',
    network: 'devnet',
    assetSymbol: 'USDC',
    assetKind: 'USDC',
    amountUi: '50',
    paymentLines: [],
    status: 'requires_manual_review',
    riskLevel: 'medium',
    blockedReasons: ['Wallet connection disabled'],
    requiredManualReviews: ['Manual review'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    localOnly: true,
    safetyNotes: [],
  };
  const result = SolanaPrivateWorkflowDraftSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivatePrivacyRiskNoteSchema validates valid risk note', () => {
  const valid = {
    id: 'risk-1',
    kind: 'planner_only',
    level: 'medium',
    title: 'Planner Only',
    description: 'This is a planner',
    recommendation: 'Review manually',
    confidence: 'high',
  };
  const result = SolanaPrivatePrivacyRiskNoteSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivateRoutePlanPreviewSchema validates valid plan', () => {
  const valid = {
    id: 'plan-1',
    workflowDraftId: 'draft-1',
    route: 'cloak_planned',
    network: 'devnet',
    status: 'preview_only',
    plannedSteps: ['Step 1'],
    unavailableCapabilities: ['wallet_connection'],
    futureRequiredInputs: ['wallet_connection'],
    warnings: ['Preview only'],
    generatedAt: Date.now(),
    localOnly: true,
    safetyNote: 'Preview only. No private/confidential transaction, proof, note, commitment, nullifier, or transfer was created.',
  };
  const result = SolanaPrivateRoutePlanPreviewSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivateReceiveRequestSchema validates valid receive request', () => {
  const valid = {
    id: 'req-1',
    network: 'devnet',
    route: 'manual_privacy_review_only',
    label: 'Invoice #1',
    requestedAssetSymbol: 'USDC',
    payloadVersion: 'gorkh-private-receive-request-v1',
    payloadJson: '{}',
    createdAt: Date.now(),
    localOnly: true,
    safetyNotes: [],
  };
  const result = SolanaPrivateReceiveRequestSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivateWorkspaceStateSchema validates valid workspace', () => {
  const valid = {
    drafts: [],
    routePlanPreviews: [],
    receiveRequests: [],
    updatedAt: Date.now(),
  };
  const result = SolanaPrivateWorkspaceStateSchema.safeParse(valid);
  assert.ok(result.success);
});

test('SolanaPrivateContextSummarySchema validates valid summary', () => {
  const valid = {
    generatedAt: new Date().toISOString(),
    network: 'devnet',
    draftCount: 0,
    draftSummaries: [],
    markdown: '# Summary',
    redactionsApplied: [],
    safetyNotes: [],
  };
  const result = SolanaPrivateContextSummarySchema.safeParse(valid);
  assert.ok(result.success);
});

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

test('SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES contains planner-only disclaimer', () => {
  assert.ok(SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES.length >= 3);
  assert.ok(SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES.some((n) => n.includes('planner only')));
  assert.ok(SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES.some((n) => n.includes('No private transfer')));
});

test('SOLANA_PRIVATE_DENIED_CAPABILITIES denies wallet, keys, proofs, and execution', () => {
  assert.ok(isDeniedPrivateCapability('wallet_connection'));
  assert.ok(isDeniedPrivateCapability('private_key_import'));
  assert.ok(isDeniedPrivateCapability('seed_phrase'));
  assert.ok(isDeniedPrivateCapability('note_secret_generation'));
  assert.ok(isDeniedPrivateCapability('commitment_generation'));
  assert.ok(isDeniedPrivateCapability('nullifier_generation'));
  assert.ok(isDeniedPrivateCapability('stealth_address_generation'));
  assert.ok(isDeniedPrivateCapability('zk_proof_generation'));
  assert.ok(isDeniedPrivateCapability('umbra_api_call'));
  assert.ok(isDeniedPrivateCapability('cloak_api_call'));
  assert.ok(isDeniedPrivateCapability('token_2022_transaction_construction'));
  assert.ok(isDeniedPrivateCapability('light_protocol_call'));
  assert.ok(isDeniedPrivateCapability('transaction_signing'));
  assert.ok(isDeniedPrivateCapability('transaction_execution'));
  assert.ok(isDeniedPrivateCapability('bridge_execution'));
  assert.ok(isDeniedPrivateCapability('swap'));
  assert.ok(isDeniedPrivateCapability('trade'));
  assert.ok(isDeniedPrivateCapability('drift'));
  assert.ok(!isDeniedPrivateCapability('some_random_capability'));
});

test('SOLANA_PRIVATE_ROUTE_LABELS maps all routes', () => {
  assert.equal(getPrivateRouteLabel('umbra_planned'), 'Umbra Planned Route');
  assert.equal(getPrivateRouteLabel('cloak_planned'), 'Cloak Planned Route');
  assert.equal(getPrivateRouteLabel('token_2022_confidential_transfer_planned'), 'Token-2022 Confidential Transfer Planned');
  assert.equal(getPrivateRouteLabel('light_protocol_research'), 'Light Protocol Research');
  assert.equal(getPrivateRouteLabel('manual_privacy_review_only'), 'Manual Privacy Review Only');
});

test('SOLANA_PRIVATE_WORKFLOW_LABELS maps all kinds', () => {
  assert.equal(getPrivateWorkflowLabel('confidential_token_transfer_plan'), 'Confidential Token Transfer Plan');
  assert.equal(getPrivateWorkflowLabel('private_payment_plan'), 'Private Payment Plan');
  assert.equal(getPrivateWorkflowLabel('private_receive_request'), 'Private Receive Request');
  assert.equal(getPrivateWorkflowLabel('private_payroll_batch'), 'Private Payroll Batch');
  assert.equal(getPrivateWorkflowLabel('private_invoice_payment'), 'Private Invoice Payment');
  assert.equal(getPrivateWorkflowLabel('privacy_review'), 'Privacy Review');
  assert.equal(getPrivateWorkflowLabel('custom'), 'Custom Privacy Workflow');
});

// ----------------------------------------------------------------------------
// Utility guards
// ----------------------------------------------------------------------------

test('isSolanaPrivateWorkflowKind validates known kinds', () => {
  assert.ok(isSolanaPrivateWorkflowKind('private_payment_plan'));
  assert.ok(isSolanaPrivateWorkflowKind('privacy_review'));
  assert.ok(!isSolanaPrivateWorkflowKind('not_a_kind'));
});

test('isSolanaPrivateRouteKind validates known routes', () => {
  assert.ok(isSolanaPrivateRouteKind('umbra_planned'));
  assert.ok(isSolanaPrivateRouteKind('light_protocol_research'));
  assert.ok(!isSolanaPrivateRouteKind('not_a_route'));
});

// ----------------------------------------------------------------------------
// Safety: no HumanRail, White Protocol, or Drift references
// ----------------------------------------------------------------------------

test('SOLANA_PRIVATE_DENIED_CAPABILITIES includes drift', () => {
  assert.ok(SOLANA_PRIVATE_DENIED_CAPABILITIES.includes('drift'));
});

test('SOLANA_PRIVATE_ROUTE_LABELS does not reference HumanRail or White Protocol', () => {
  const labels = Object.values(SOLANA_PRIVATE_ROUTE_LABELS).join(' ').toLowerCase();
  assert.ok(!labels.includes('humanrail'), 'route labels should not contain humanrail');
  assert.ok(!labels.includes('white protocol'), 'route labels should not contain white protocol');
});

test('SOLANA_PRIVATE_WORKFLOW_LABELS does not reference HumanRail or White Protocol', () => {
  const labels = Object.values(SOLANA_PRIVATE_WORKFLOW_LABELS).join(' ').toLowerCase();
  assert.ok(!labels.includes('humanrail'), 'workflow labels should not contain humanrail');
  assert.ok(!labels.includes('white protocol'), 'workflow labels should not contain white protocol');
});
