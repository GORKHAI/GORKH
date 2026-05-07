import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readWalletToolResult } from '../apps/desktop/src/features/solana-workstation/agent/station/agentWalletTools.ts';
import { readMarketsToolResult } from '../apps/desktop/src/features/solana-workstation/agent/station/agentMarketsTools.ts';
import { manualRun, startAgent } from '../apps/desktop/src/features/solana-workstation/agent/station/agentRuntime.ts';
import { createEmptyGorkhAgentStationState } from '../packages/shared/dist/index.js';

const now = 1700000000000;

const walletWorkspace = {
  profiles: [
    {
      id: 'wallet-1',
      label: 'Read-only main',
      publicAddress: '11111111111111111111111111111111',
      network: 'mainnet-beta',
      status: 'local_profile',
      preferredPrivateRoute: 'cloak_planned',
      tags: [],
      createdAt: now,
      updatedAt: now,
      localOnly: true,
      safetyNotes: [],
    },
  ],
  selectedProfileId: 'wallet-1',
  receiveRequests: [],
  sendDrafts: [],
  readOnlySnapshots: [
    {
      walletProfileId: 'wallet-1',
      address: '11111111111111111111111111111111',
      network: 'mainnet-beta',
      solBalanceLamports: '420000000',
      solBalanceUi: '0.42',
      tokenAccountCount: 2,
      tokenAccountsPreview: [
        { pubkey: 'token-account-1', mint: 'mint-1', amountRaw: '1', decimals: 0, uiAmountString: '1' },
      ],
      fetchedAt: now,
      source: 'rpc_read_only',
      safetyNotes: [],
      warnings: [],
    },
  ],
  updatedAt: now,
};

const marketsWorkspace = {
  watchlist: [
    {
      id: 'watch-1',
      label: 'Token One',
      address: 'So11111111111111111111111111111111111111112',
      kind: 'token',
      network: 'mainnet-beta',
      status: 'active',
      tags: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
      localOnly: true,
    },
  ],
  analyses: [
    {
      item: {
        id: 'watch-1',
        label: 'Token One',
        address: 'So11111111111111111111111111111111111111112',
        kind: 'token',
        network: 'mainnet-beta',
        status: 'active',
        tags: [],
        notes: '',
        createdAt: now,
        updatedAt: now,
        localOnly: true,
      },
      riskSignals: [
        {
          id: 'risk-1',
          kind: 'unknown_program',
          level: 'medium',
          title: 'Manual risk',
          description: 'Existing local analysis only.',
          recommendation: 'Review manually.',
          confidence: 'medium',
        },
      ],
      summary: 'Existing local market analysis.',
      analyzedAt: now,
      dataSources: ['manual'],
      safetyNotes: [],
    },
  ],
  selectedItemId: 'watch-1',
  updatedAt: now,
};

test('wallet tool reads profile, snapshot, and portfolio summary without secrets', () => {
  const result = readWalletToolResult({
    workspace: walletWorkspace,
    portfolioSummary: {
      walletProfileId: 'wallet-1',
      publicAddress: '11111111111111111111111111111111',
      network: 'mainnet-beta',
      solBalanceUi: '0.42',
      tokenHoldingCount: 1,
      tokenAccountCount: 2,
      holdings: [],
      ownershipProofStatus: 'verified',
      generatedAt: now,
      safetyNotes: [],
      warnings: [],
    },
  });
  assert.equal(result.source, 'wallet_workspace');
  assert.equal(result.hasSnapshot, true);
  assert.equal(result.solBalanceUi, '0.42');
  assert.equal(result.tokenAccountCount, 2);
  assert.equal(result.portfolioHoldingCount, 1);
  assert.equal(result.ownershipStatus, 'verified');
  assert.equal(JSON.stringify(result).includes('privateKey'), false);
});

test('wallet tool is honest when snapshot is missing', () => {
  const result = readWalletToolResult({
    workspace: { ...walletWorkspace, readOnlySnapshots: [] },
  });
  assert.equal(result.hasSnapshot, false);
  assert.match(result.warnings.join(' '), /No wallet snapshot available/);
});

test('markets tool reads watchlist and preserves sample warning without API fetch', () => {
  const result = readMarketsToolResult({
    workspace: marketsWorkspace,
    providerContexts: ['manual_birdeye_context'],
    sampleDataPresent: true,
    birdeyeContextPresent: false,
  });
  assert.equal(result.source, 'markets_workspace');
  assert.equal(result.watchlistCount, 1);
  assert.equal(result.selectedItems[0].riskSignalCount, 1);
  assert.match(result.warnings.join(' '), /sample\/offline data/);
});

test('manual run enriches context bundle from wallet and markets results', () => {
  const state = startAgent(createEmptyGorkhAgentStationState(now)).state;
  const result = manualRun(state, { intent: 'summarize my current workstation context' }, {
    walletWorkspace,
    marketsWorkspace,
    marketsSampleData: true,
  });
  assert.equal(result.contextBundle?.localOnly, true);
  assert.match(result.contextBundle?.markdown ?? '', /Wallet Summary/);
  assert.match(result.contextBundle?.markdown ?? '', /Markets Summary/);
  assert.ok(result.contextBundle?.redactionsApplied.includes('agent.privateKeys'));
});

test('agent station enrichment sources do not import signing or API execution paths', () => {
  const sources = [
    'apps/desktop/src/features/solana-workstation/agent/station/agentWalletTools.ts',
    'apps/desktop/src/features/solana-workstation/agent/station/agentMarketsTools.ts',
  ].map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(sources, /localWalletVault/);
  assert.doesNotMatch(sources, /keychain/i);
  assert.doesNotMatch(sources, /fetch\s*\(/);
  assert.doesNotMatch(sources, /executeTrade|swap|route/i);
});
