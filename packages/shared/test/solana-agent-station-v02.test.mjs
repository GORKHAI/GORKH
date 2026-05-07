import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GorkhAgentWalletToolResultSchema,
  GorkhAgentMarketsToolResultSchema,
  GorkhAgentShieldToolResultSchema,
  GorkhAgentCloakDraftHandoffSchema,
  GorkhAgentZerionProposalHandoffSchema,
  GorkhAgentContextBundleResultSchema,
  GORKH_AGENT_BLOCKED_TOOL_IDS,
  hasForbiddenHandoffField,
} from '../dist/index.js';

test('v0.2 wallet tool result validates real workspace summary shape', () => {
  const result = GorkhAgentWalletToolResultSchema.safeParse({
    selectedProfileId: 'wallet-1',
    selectedProfileLabel: 'Main read-only wallet',
    publicAddress: '11111111111111111111111111111111',
    network: 'mainnet-beta',
    hasSnapshot: true,
    solBalanceUi: '0.42',
    tokenAccountCount: 2,
    portfolioHoldingCount: 1,
    ownershipStatus: 'verified',
    warnings: [],
    source: 'wallet_workspace',
    localOnly: true,
  });
  assert.ok(result.success, result.error?.message);
});

test('v0.2 markets tool result validates safe provider context shape', () => {
  const result = GorkhAgentMarketsToolResultSchema.safeParse({
    watchlistCount: 1,
    selectedItems: [
      {
        id: 'token-1',
        address: 'So11111111111111111111111111111111111111112',
        label: 'Wrapped SOL',
        kind: 'token',
        riskSignalCount: 0,
      },
    ],
    availableProviderContexts: ['manual_birdeye_context'],
    sampleDataPresent: true,
    birdeyeContextPresent: false,
    warnings: ['Markets module is currently using sample/offline data. Live data requires manual refresh.'],
    source: 'markets_workspace',
    localOnly: true,
  });
  assert.ok(result.success, result.error?.message);
});

test('v0.2 Shield, Cloak, Zerion, and context handoffs validate', () => {
  assert.ok(GorkhAgentShieldToolResultSchema.safeParse({
    inputKind: 'transaction_signature',
    decodedAvailable: false,
    riskFindingCount: 0,
    simulationAvailable: false,
    prefilledInput: '1'.repeat(88),
    targetModule: 'shield',
    handoffStatus: 'ready_for_manual_review',
    warnings: [],
    source: 'shield_context',
    localOnly: true,
  }).success);

  assert.ok(GorkhAgentCloakDraftHandoffSchema.safeParse({
    id: 'cloak-1',
    draftKind: 'cloak_private_send',
    walletId: 'wallet-1',
    asset: 'SOL',
    amountLamports: '10000000',
    recipient: '11111111111111111111111111111111',
    targetModule: 'wallet_cloak',
    executionBlocked: true,
    handoffStatus: 'ready_for_wallet_review',
    warnings: [],
    createdAt: Date.now(),
    localOnly: true,
  }).success);

  assert.ok(GorkhAgentZerionProposalHandoffSchema.safeParse({
    id: 'zerion-1',
    proposalKind: 'zerion_dca',
    fromToken: 'SOL',
    toToken: 'USDC',
    amountSol: '0.001',
    targetModule: 'zerion_executor',
    executionBlocked: true,
    handoffStatus: 'missing_required_fields',
    warnings: [],
    createdAt: Date.now(),
    localOnly: true,
  }).success);

  assert.ok(GorkhAgentContextBundleResultSchema.safeParse({
    id: 'context-1',
    markdown: '# Safe bundle',
    sources: ['agent_station', 'wallet_workspace'],
    redactionsApplied: ['agent.privateKeys', 'memory.sensitive'],
    warnings: [],
    createdAt: Date.now(),
    localOnly: true,
  }).success);
});

test('v0.2 blocked tools include Cloak deposit autonomous execution', () => {
  assert.ok(GORKH_AGENT_BLOCKED_TOOL_IDS.includes('cloak.execute_deposit_autonomous'));
});

test('forbidden handoff field detector catches secret-shaped keys', () => {
  assert.equal(hasForbiddenHandoffField({ nested: { viewingKey: 'secret' } }), 'viewingKey');
  assert.equal(hasForbiddenHandoffField({ safe: { txHash: 'public-signature-ok' } }), null);
});
