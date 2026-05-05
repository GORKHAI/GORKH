import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaPrivateWorkflowKind,
  SolanaPrivateRouteKind,
  SolanaPrivateAssetKind,
  SolanaPrivateWorkflowStatus,
  WorkstationRiskLevel,
  type SolanaPrivateWorkspaceState,
} from '../packages/shared/src/index.ts';

import {
  validatePrivateAssetSymbol,
  validatePrivateAmount,
  validateRecipientAddressIfPresent,
  rejectDeniedPrivateCapability,
  sanitizePrivateNotes,
  assertSafePrivateRoute,
} from '../apps/desktop/src/features/solana-workstation/private/privateGuards.ts';

import { createPrivateWorkflowDraft } from '../apps/desktop/src/features/solana-workstation/private/createPrivateWorkflowDraft.ts';
import { analyzePrivacyRisks } from '../apps/desktop/src/features/solana-workstation/private/analyzePrivacyRisks.ts';
import { createPrivateRoutePlanPreview } from '../apps/desktop/src/features/solana-workstation/private/createPrivateRoutePlanPreview.ts';
import { createReceiveRequestPayload } from '../apps/desktop/src/features/solana-workstation/private/createReceiveRequestPayload.ts';
import { createPrivateContextSummary } from '../apps/desktop/src/features/solana-workstation/private/createPrivateContextSummary.ts';
import {
  createEmptyPrivateWorkspaceState,
  savePrivateWorkspaceState,
  loadPrivateWorkspaceState,
  clearPrivateWorkspaceState,
} from '../apps/desktop/src/features/solana-workstation/private/privateStorage.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestDraft(overrides?: Parameters<typeof createPrivateWorkflowDraft>[0]) {
  return createPrivateWorkflowDraft({
    kind: SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN,
    route: SolanaPrivateRouteKind.UMBRA_PLANNED,
    title: 'Test Draft',
    network: 'devnet',
    assetSymbol: 'USDC',
    assetKind: SolanaPrivateAssetKind.USDC,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// privateGuards
// ---------------------------------------------------------------------------

test('validatePrivateAssetSymbol accepts 2-12 character symbols', () => {
  assert.equal(validatePrivateAssetSymbol('USDC'), null);
  assert.equal(validatePrivateAssetSymbol('SOL'), null);
  assert.equal(validatePrivateAssetSymbol('A'), 'Asset symbol must be 2–12 characters.');
  assert.equal(validatePrivateAssetSymbol('VERYLONGSYMBOLNAME'), 'Asset symbol must be 2–12 characters.');
});

test('validatePrivateAmount accepts positive decimals', () => {
  assert.equal(validatePrivateAmount('100'), null);
  assert.equal(validatePrivateAmount('0.5'), null);
  assert.equal(validatePrivateAmount(''), null);
  assert.equal(validatePrivateAmount('abc'), 'Amount must be a positive decimal number.');
  assert.equal(validatePrivateAmount('-1'), 'Amount must be a positive decimal number.');
  assert.equal(validatePrivateAmount('0'), 'Amount must be greater than zero.');
});

test('validateRecipientAddressIfPresent accepts valid Solana addresses', () => {
  assert.equal(validateRecipientAddressIfPresent(), null);
  assert.equal(validateRecipientAddressIfPresent(''), null);
  assert.equal(
    validateRecipientAddressIfPresent('11111111111111111111111111111111'),
    null
  );
  assert.equal(
    validateRecipientAddressIfPresent('invalid'),
    'Invalid Solana address format.'
  );
  assert.equal(
    validateRecipientAddressIfPresent('too_short'),
    'Invalid Solana address format.'
  );
});

test('rejectDeniedPrivateCapability throws for denied capabilities', () => {
  assert.doesNotThrow(() => rejectDeniedPrivateCapability('some_safe_capability'));
  assert.throws(() => rejectDeniedPrivateCapability('wallet_connection'), /denied/i);
  assert.throws(() => rejectDeniedPrivateCapability('private_key_import'), /denied/i);
  assert.throws(() => rejectDeniedPrivateCapability('drift'), /denied/i);
});

test('sanitizePrivateNotes redacts secret keywords', () => {
  const result = sanitizePrivateNotes('My PRIVATE_KEY is here and my SECRET too');
  assert.ok(result.text.includes('[redacted secret]'));
  assert.ok(result.redactionsApplied.includes('PRIVATE_KEY'));
  assert.ok(result.redactionsApplied.includes('SECRET'));
});

test('sanitizePrivateNotes redacts possible seed phrases', () => {
  const seedPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
  const result = sanitizePrivateNotes(`Here is my seed: ${seedPhrase}`);
  assert.ok(result.text.includes('[redacted possible seed phrase]'));
  assert.ok(result.redactionsApplied.includes('possible_seed_phrase'));
});

test('sanitizePrivateNotes throws for banned terms', () => {
  assert.throws(() => sanitizePrivateNotes('humanrail integration'), /disallowed/i);
  assert.throws(() => sanitizePrivateNotes('white protocol'), /disallowed/i);
  assert.throws(() => sanitizePrivateNotes('drift protocol'), /disallowed/i);
});

test('assertSafePrivateRoute throws for banned routes', () => {
  assert.doesNotThrow(() => assertSafePrivateRoute('umbra_planned'));
  assert.throws(() => assertSafePrivateRoute('humanrail'), /disallowed/i);
  assert.throws(() => assertSafePrivateRoute('white_protocol'), /disallowed/i);
  assert.throws(() => assertSafePrivateRoute('drift'), /disallowed/i);
});

// ---------------------------------------------------------------------------
// createPrivateWorkflowDraft
// ---------------------------------------------------------------------------

test('createPrivateWorkflowDraft creates a draft with blocked reasons', () => {
  const draft = makeTestDraft();
  assert.equal(draft.kind, SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN);
  assert.equal(draft.route, SolanaPrivateRouteKind.UMBRA_PLANNED);
  assert.equal(draft.localOnly, true);
  assert.ok(draft.blockedReasons.length > 0);
  assert.ok(draft.blockedReasons.some((r) => r.includes('Wallet connection is disabled')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('Signing and transaction execution are disabled')));
  assert.ok(draft.requiredManualReviews.includes('Manual privacy review required'));
  assert.ok(draft.safetyNotes.some((n) => n.includes('local planning draft')));
});

test('createPrivateWorkflowDraft assigns high risk for mainnet', () => {
  const draft = makeTestDraft({ network: 'mainnet-beta' });
  assert.equal(draft.riskLevel, WorkstationRiskLevel.HIGH);
});

test('createPrivateWorkflowDraft assigns medium risk for payment/payroll/invoice', () => {
  const payment = makeTestDraft({ kind: SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN, network: 'devnet' });
  assert.equal(payment.riskLevel, WorkstationRiskLevel.MEDIUM);

  const payroll = makeTestDraft({ kind: SolanaPrivateWorkflowKind.PRIVATE_PAYROLL_BATCH, network: 'devnet' });
  assert.equal(payroll.riskLevel, WorkstationRiskLevel.MEDIUM);

  const invoice = makeTestDraft({ kind: SolanaPrivateWorkflowKind.PRIVATE_INVOICE_PAYMENT, network: 'devnet' });
  assert.equal(invoice.riskLevel, WorkstationRiskLevel.MEDIUM);
});

test('createPrivateWorkflowDraft assigns medium risk for confidential token transfer', () => {
  const draft = makeTestDraft({
    kind: SolanaPrivateWorkflowKind.CONFIDENTIAL_TOKEN_TRANSFER_PLAN,
    network: 'devnet',
  });
  assert.equal(draft.riskLevel, WorkstationRiskLevel.MEDIUM);
});

test('createPrivateWorkflowDraft assigns low risk for privacy review', () => {
  const draft = makeTestDraft({
    kind: SolanaPrivateWorkflowKind.PRIVACY_REVIEW,
    network: 'devnet',
  });
  assert.equal(draft.riskLevel, WorkstationRiskLevel.LOW);
});

test('createPrivateWorkflowDraft adds Umbra-specific blocked reasons', () => {
  const draft = makeTestDraft({ route: SolanaPrivateRouteKind.UMBRA_PLANNED });
  assert.ok(draft.blockedReasons.some((r) => r.includes('Umbra/Cloak SDK')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('stealth address')));
});

test('createPrivateWorkflowDraft adds Token-2022-specific blocked reasons', () => {
  const draft = makeTestDraft({ route: SolanaPrivateRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED });
  assert.ok(draft.blockedReasons.some((r) => r.includes('Token-2022')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('proof generation')));
});

test('createPrivateWorkflowDraft adds Light Protocol-specific blocked reasons', () => {
  const draft = makeTestDraft({ route: SolanaPrivateRouteKind.LIGHT_PROTOCOL_RESEARCH });
  assert.ok(draft.blockedReasons.some((r) => r.includes('Light Protocol is research-only')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('ZK compression')));
});

// ---------------------------------------------------------------------------
// analyzePrivacyRisks
// ---------------------------------------------------------------------------

test('analyzePrivacyRisks returns planner_only for all drafts', () => {
  const draft = makeTestDraft();
  const risks = analyzePrivacyRisks(draft);
  assert.ok(risks.some((r) => r.kind === 'planner_only'));
});

test('analyzePrivacyRisks includes mainnet operational caution for mainnet', () => {
  const draft = makeTestDraft({ network: 'mainnet-beta' });
  const risks = analyzePrivacyRisks(draft);
  assert.ok(risks.some((r) => r.kind === 'mainnet_operational_caution'));
});

test('analyzePrivacyRisks includes source wallet linkage for payment kinds', () => {
  const draft = makeTestDraft({
    kind: SolanaPrivateWorkflowKind.PRIVATE_PAYMENT_PLAN,
    notes: 'Pay from main treasury wallet',
  });
  const risks = analyzePrivacyRisks(draft);
  assert.ok(risks.some((r) => r.kind === 'source_wallet_linkage'));
});

test('analyzePrivacyRisks includes amount fingerprinting when amount is non-round', () => {
  const draft = makeTestDraft({ amountUi: '123.45' });
  const risks = analyzePrivacyRisks(draft);
  assert.ok(risks.some((r) => r.kind === 'amount_fingerprinting'));
});

test('analyzePrivacyRisks does not include amount fingerprinting when amount is absent', () => {
  const draft = makeTestDraft({ amountUi: undefined });
  const risks = analyzePrivacyRisks(draft);
  assert.ok(!risks.some((r) => r.kind === 'amount_fingerprinting'));
});

// ---------------------------------------------------------------------------
// createPrivateRoutePlanPreview
// ---------------------------------------------------------------------------

test('createPrivateRoutePlanPreview creates preview-only plan', () => {
  const draft = makeTestDraft();
  const plan = createPrivateRoutePlanPreview(draft);
  assert.equal(plan.status, 'preview_only');
  assert.equal(plan.workflowDraftId, draft.id);
  assert.equal(plan.localOnly, true);
  assert.ok(plan.unavailableCapabilities.includes('wallet_connection'));
  assert.ok(plan.unavailableCapabilities.includes('transaction_signing'));
  assert.ok(plan.warnings.some((w) => w.includes('preview-only')));
});

test('createPrivateRoutePlanPreview includes Umbra-specific warnings', () => {
  const draft = makeTestDraft({ route: SolanaPrivateRouteKind.UMBRA_PLANNED });
  const plan = createPrivateRoutePlanPreview(draft);
  assert.ok(plan.unavailableCapabilities.includes('umbra_api_call'));
  assert.ok(plan.unavailableCapabilities.includes('stealth_address_generation'));
  assert.ok(plan.warnings.some((w) => w.includes('Umbra/Cloak SDK')));
});

test('createPrivateRoutePlanPreview includes Token-2022-specific warnings', () => {
  const draft = makeTestDraft({ route: SolanaPrivateRouteKind.TOKEN_2022_CONFIDENTIAL_TRANSFER_PLANNED });
  const plan = createPrivateRoutePlanPreview(draft);
  assert.ok(plan.unavailableCapabilities.includes('token_2022_transaction_construction'));
  assert.ok(plan.unavailableCapabilities.includes('zk_proof_generation'));
  assert.ok(plan.warnings.some((w) => w.includes('Token-2022')));
});

test('createPrivateRoutePlanPreview includes Light Protocol-specific warnings', () => {
  const draft = makeTestDraft({ route: SolanaPrivateRouteKind.LIGHT_PROTOCOL_RESEARCH });
  const plan = createPrivateRoutePlanPreview(draft);
  assert.ok(plan.unavailableCapabilities.includes('light_protocol_call'));
  assert.ok(plan.unavailableCapabilities.includes('zk_proof_generation'));
  assert.ok(plan.warnings.some((w) => w.includes('Light Protocol')));
});

test('createPrivateRoutePlanPreview safetyNote is fixed literal', () => {
  const draft = makeTestDraft();
  const plan = createPrivateRoutePlanPreview(draft);
  assert.ok(plan.safetyNote.includes('Preview only'));
  assert.ok(plan.safetyNote.includes('No private/confidential transaction'));
});

// ---------------------------------------------------------------------------
// createReceiveRequestPayload
// ---------------------------------------------------------------------------

test('createReceiveRequestPayload creates valid receive request', () => {
  const req = createReceiveRequestPayload({
    network: 'devnet',
    route: SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    label: 'Invoice #42',
    requestedAssetSymbol: 'USDC',
    requestedAmountUi: '250.00',
  });
  assert.equal(req.label, 'Invoice #42');
  assert.equal(req.requestedAssetSymbol, 'USDC');
  assert.equal(req.requestedAmountUi, '250.00');
  assert.equal(req.payloadVersion, 'gorkh-private-receive-request-v1');
  assert.equal(req.localOnly, true);
  assert.ok(req.safetyNotes.some((n) => n.includes('not a private address')));
});

test('createReceiveRequestPayload validates recipient address', () => {
  assert.throws(
    () =>
      createReceiveRequestPayload({
        network: 'devnet',
        route: SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
        label: 'Test',
        requestedAssetSymbol: 'USDC',
        recipientPublicAddress: 'bad_address',
      }),
    /Invalid Solana address format/
  );
});

test('createReceiveRequestPayload accepts valid recipient address', () => {
  const req = createReceiveRequestPayload({
    network: 'devnet',
    route: SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    label: 'Test',
    requestedAssetSymbol: 'USDC',
    recipientPublicAddress: '11111111111111111111111111111111',
  });
  assert.equal(req.recipientPublicAddress, '11111111111111111111111111111111');
});

// ---------------------------------------------------------------------------
// createPrivateContextSummary
// ---------------------------------------------------------------------------

test('createPrivateContextSummary includes safety notes and overview', () => {
  const state = createEmptyPrivateWorkspaceState();
  const summary = createPrivateContextSummary(state, 'devnet');
  assert.equal(summary.network, 'devnet');
  assert.equal(summary.draftCount, 0);
  assert.ok(summary.markdown.includes('Planner only'));
  assert.ok(summary.safetyNotes.some((n) => n.includes('planner only')));
});

test('createPrivateContextSummary excludes rejected and archived drafts', () => {
  const draft1 = makeTestDraft({ title: 'Active' });
  const draft2 = makeTestDraft({ title: 'Archived' });
  const state: SolanaPrivateWorkspaceState = {
    ...createEmptyPrivateWorkspaceState(),
    drafts: [
      { ...draft1, status: SolanaPrivateWorkflowStatus.REQUIRES_MANUAL_REVIEW },
      { ...draft2, status: SolanaPrivateWorkflowStatus.ARCHIVED_LOCAL },
    ],
  };
  const summary = createPrivateContextSummary(state, 'devnet');
  assert.equal(summary.draftCount, 1);
  assert.ok(summary.markdown.includes('Active'));
  assert.ok(!summary.markdown.includes('Archived'));
});

test('createPrivateContextSummary includes receive requests', () => {
  const req = createReceiveRequestPayload({
    network: 'devnet',
    route: SolanaPrivateRouteKind.MANUAL_PRIVACY_REVIEW_ONLY,
    label: 'Invoice #1',
    requestedAssetSymbol: 'USDC',
  });
  const state: SolanaPrivateWorkspaceState = {
    ...createEmptyPrivateWorkspaceState(),
    receiveRequests: [req],
  };
  const summary = createPrivateContextSummary(state, 'devnet');
  assert.ok(summary.markdown.includes('Invoice #1'));
});

// ---------------------------------------------------------------------------
// privateStorage
// ---------------------------------------------------------------------------

test('createEmptyPrivateWorkspaceState returns empty state', () => {
  const state = createEmptyPrivateWorkspaceState(12345);
  assert.deepEqual(state.drafts, []);
  assert.deepEqual(state.routePlanPreviews, []);
  assert.deepEqual(state.receiveRequests, []);
  assert.equal(state.updatedAt, 12345);
});

test('savePrivateWorkspaceState and loadPrivateWorkspaceState roundtrip', () => {
  // Mock localStorage
  const store: Record<string, string> = {};
  // @ts-expect-error testing localStorage mock
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };

  const state = createEmptyPrivateWorkspaceState(99999);
  savePrivateWorkspaceState(state);

  const loaded = loadPrivateWorkspaceState();
  assert.ok(loaded);
  assert.deepEqual(loaded!.drafts, []);
  assert.deepEqual(loaded!.routePlanPreviews, []);
  assert.deepEqual(loaded!.receiveRequests, []);
  assert.equal(loaded!.updatedAt, 99999);

  clearPrivateWorkspaceState();

  // Cleanup
  // @ts-expect-error cleanup
  delete globalThis.window;
});

test('loadPrivateWorkspaceState returns null after clear', () => {
  savePrivateWorkspaceState(createEmptyPrivateWorkspaceState());
  clearPrivateWorkspaceState();
  assert.equal(loadPrivateWorkspaceState(), null);
});

test('loadPrivateWorkspaceState returns null for invalid stored data', () => {
  // @ts-expect-error testing invalid data
  globalThis.window = { localStorage: { getItem: () => '{"invalid": true}', setItem: () => {}, removeItem: () => {} } };
  const loaded = loadPrivateWorkspaceState();
  assert.equal(loaded, null);
  // @ts-expect-error cleanup
  delete globalThis.window;
});

// ---------------------------------------------------------------------------
// Integration: full draft -> risk -> plan -> context flow
// ---------------------------------------------------------------------------

test('full private workflow flow produces consistent planner-only outputs', () => {
  const draft = makeTestDraft({
    title: 'Umbra Payment',
    amountUi: '500',
    route: SolanaPrivateRouteKind.UMBRA_PLANNED,
  });
  const risks = analyzePrivacyRisks(draft);
  const plan = createPrivateRoutePlanPreview(draft);

  assert.equal(draft.status, SolanaPrivateWorkflowStatus.REQUIRES_MANUAL_REVIEW);
  assert.ok(draft.blockedReasons.length > 0);
  assert.ok(risks.length > 0);
  assert.equal(plan.status, 'preview_only');
  assert.ok(plan.unavailableCapabilities.includes('wallet_connection'));
  assert.ok(plan.unavailableCapabilities.includes('umbra_api_call'));

  const state: SolanaPrivateWorkspaceState = {
    ...createEmptyPrivateWorkspaceState(),
    drafts: [draft],
    routePlanPreviews: [plan],
  };

  const summary = createPrivateContextSummary(state, 'devnet');
  assert.equal(summary.draftCount, 1);
  assert.ok(summary.markdown.includes('Umbra Payment'));
  assert.ok(summary.markdown.includes('Planner only'));
});
